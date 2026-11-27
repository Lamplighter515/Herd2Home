"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  setActiveFarmId,
  verifyPassword,
} from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { orderBy: { farm: { name: "asc" } } } },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=1");
  }

  await createSession(user.id);
  if (user.memberships[0]) {
    await setActiveFarmId(user.memberships[0].farmId);
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function switchFarmAction(formData: FormData) {
  const farmId = String(formData.get("farmId") ?? "");
  if (!farmId) return;
  await setActiveFarmId(farmId);
  redirect("/dashboard");
}
