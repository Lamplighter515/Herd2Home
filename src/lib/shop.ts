import { cookies } from "next/headers";
import type { Animal, Farm, FreezerPackage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/labels";

export const CART_COOKIE = "h2h_cart";

export type RetailCartItem = {
  kind: "retail";
  packageId: string;
  farmSlug: string;
};

export type ShareCartItem = {
  kind: "share";
  animalId: string;
  farmSlug: string;
  sharePct: 25 | 50 | 100;
};

export type CartItem = RetailCartItem | ShareCartItem;

export type CartState = {
  farmSlug: string | null;
  items: CartItem[];
};

export function emptyCart(): CartState {
  return { farmSlug: null, items: [] };
}

export async function readCart(): Promise<CartState> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return emptyCart();
  try {
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.items)) return emptyCart();
    return {
      farmSlug: parsed.farmSlug ?? null,
      items: parsed.items.filter(
        (item): item is CartItem =>
          item != null &&
          (item.kind === "retail" || item.kind === "share") &&
          typeof item.farmSlug === "string",
      ),
    };
  } catch {
    return emptyCart();
  }
}

export async function writeCart(cart: CartState) {
  const jar = await cookies();
  if (cart.items.length === 0) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export function shareLabel(pct: number): string {
  if (pct >= 100) return "Whole animal";
  if (pct >= 50) return "Half share";
  return "Quarter share";
}

export function sharePriceCents(animal: Pick<Animal, "sharePriceCents">, pct: number): number {
  const whole = animal.sharePriceCents ?? 0;
  return Math.round((whole * pct) / 100);
}

export function formatLbs(lbs: number): string {
  return `${lbs.toFixed(1)} lb`;
}

export function packageLabel(pkg: Pick<FreezerPackage, "cutName" | "weightLbs">): string {
  return `${pkg.cutName} · ${formatLbs(pkg.weightLbs)}`;
}

export async function getFarmBySlug(slug: string) {
  return prisma.farm.findUnique({
    where: { slug },
    include: {
      butchers: { orderBy: { name: "asc" } },
    },
  });
}

export async function listShopFarms() {
  const farms = await prisma.farm.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          packages: { where: { status: "AVAILABLE", inspectionPath: "INSPECTED_RETAIL" } },
          animals: { where: { listedForShare: true, status: "PASTURE" } },
        },
      },
    },
  });
  return farms.map((farm) => ({
    ...farm,
    availableCuts: farm._count.packages,
    openShares: farm._count.animals,
  }));
}

export async function getAvailableRetail(farmId: string) {
  return prisma.freezerPackage.findMany({
    where: {
      farmId,
      status: "AVAILABLE",
      inspectionPath: "INSPECTED_RETAIL",
    },
    include: { animal: true },
    orderBy: [{ cutName: "asc" }, { weightLbs: "asc" }],
  });
}

export async function getOpenShares(farmId: string) {
  return prisma.animal.findMany({
    where: {
      farmId,
      listedForShare: true,
      status: "PASTURE",
    },
    include: {
      shareRoster: true,
      lot: true,
    },
    orderBy: { tag: "asc" },
  });
}

export function remainingSharePct(animal: { shareRoster: { sharePct: number }[] }): number {
  const taken = animal.shareRoster.reduce((sum, row) => sum + row.sharePct, 0);
  return Math.max(0, 100 - taken);
}

export type ResolvedCart = {
  farm: Farm | null;
  farmSlug: string | null;
  retail: Array<{
    item: RetailCartItem;
    pkg: FreezerPackage & { animal: Animal | null; farm: Farm };
  }>;
  shares: Array<{
    item: ShareCartItem;
    animal: Animal & { farm: Farm; shareRoster: { sharePct: number }[] };
    priceCents: number;
    remainingPct: number;
  }>;
  retailTotalCents: number;
  shareTotalCents: number;
  totalCents: number;
  errors: string[];
};

export async function resolveCart(cart: CartState): Promise<ResolvedCart> {
  const errors: string[] = [];
  const retail: ResolvedCart["retail"] = [];
  const shares: ResolvedCart["shares"] = [];

  let farm: Farm | null = null;
  if (cart.farmSlug) {
    farm = await prisma.farm.findUnique({ where: { slug: cart.farmSlug } });
    if (!farm) errors.push("That farm is no longer available.");
  }

  for (const item of cart.items) {
    if (item.kind === "retail") {
      const pkg = await prisma.freezerPackage.findUnique({
        where: { id: item.packageId },
        include: { animal: true, farm: true },
      });
      if (!pkg || pkg.status !== "AVAILABLE" || pkg.inspectionPath !== "INSPECTED_RETAIL") {
        errors.push("A retail cut in your cart is no longer available.");
        continue;
      }
      if (cart.farmSlug && pkg.farm.slug !== cart.farmSlug) {
        errors.push("Cart items must come from a single farm.");
        continue;
      }
      retail.push({ item, pkg });
    } else {
      const animal = await prisma.animal.findUnique({
        where: { id: item.animalId },
        include: { farm: true, shareRoster: true },
      });
      if (!animal || !animal.listedForShare || animal.status !== "PASTURE") {
        errors.push("A live share in your cart is no longer open.");
        continue;
      }
      const remaining = remainingSharePct(animal);
      if (item.sharePct > remaining) {
        errors.push(
          `${animal.tag}: only ${remaining}% of the animal remains for custom-exempt share.`,
        );
        continue;
      }
      if (cart.farmSlug && animal.farm.slug !== cart.farmSlug) {
        errors.push("Cart items must come from a single farm.");
        continue;
      }
      shares.push({
        item,
        animal,
        priceCents: sharePriceCents(animal, item.sharePct),
        remainingPct: remaining,
      });
    }
  }

  const retailTotalCents = retail.reduce((sum, row) => sum + row.pkg.priceCents, 0);
  const shareTotalCents = shares.reduce((sum, row) => sum + row.priceCents, 0);

  return {
    farm,
    farmSlug: cart.farmSlug,
    retail,
    shares,
    retailTotalCents,
    shareTotalCents,
    totalCents: retailTotalCents + shareTotalCents,
    errors,
  };
}

export function money(cents: number): string {
  return formatMoney(cents);
}
