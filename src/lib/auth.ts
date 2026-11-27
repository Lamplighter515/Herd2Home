import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { compareSync, hashSync } from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "h2h_session";
const SESSION_DAYS = 14;

function cookieSecure() {
  // Opt-in for HTTPS deployments; keep unset for local `pnpm start` over HTTP.
  return process.env.COOKIE_SECURE === "true";
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      token: hashToken(token),
      userId,
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token: hashToken(token) } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token: hashToken(token) },
    include: {
      user: {
        include: {
          memberships: {
            include: { farm: true },
            orderBy: { farm: { name: "asc" } },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function getActiveFarmId(userId: string): Promise<string | null> {
  const jar = await cookies();
  const cookieFarm = jar.get("h2h_farm")?.value;
  const memberships = await prisma.farmMembership.findMany({
    where: { userId },
    include: { farm: true },
    orderBy: { farm: { name: "asc" } },
  });
  if (memberships.length === 0) return null;
  if (cookieFarm && memberships.some((m) => m.farmId === cookieFarm)) {
    return cookieFarm;
  }
  return memberships[0].farmId;
}

export async function setActiveFarmId(farmId: string) {
  const jar = await cookies();
  jar.set("h2h_farm", farmId, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function requireFarmContext() {
  const user = await requireUser();
  const farmId = await getActiveFarmId(user.id);
  if (!farmId) {
    throw new Error("No farm membership");
  }
  const membership = user.memberships.find((m) => m.farmId === farmId);
  if (!membership) redirect("/login");
  return { user, farm: membership.farm, farms: user.memberships.map((m) => m.farm) };
}

export function verifyPassword(password: string, passwordHash: string) {
  return compareSync(password, passwordHash);
}

export function hashPassword(password: string) {
  return hashSync(password, 10);
}
