"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CheckoutMode, OrderStatus, PackageStatus, PickupType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  emptyCart,
  packageLabel,
  readCart,
  remainingSharePct,
  resolveCart,
  shareLabel,
  sharePriceCents,
  writeCart,
  type CartItem,
  type CartState,
  type ShareCartItem,
} from "@/lib/shop";

function parseSharePct(raw: FormDataEntryValue | null): ShareCartItem["sharePct"] | null {
  const n = Number(raw);
  if (n === 25 || n === 50 || n === 100) return n;
  return null;
}

async function mutateCart(mutator: (cart: CartState) => CartState | { error: string }) {
  const cart = await readCart();
  const result = mutator(cart);
  if ("error" in result) {
    return result;
  }
  await writeCart(result);
  revalidatePath("/shop");
  return { ok: true as const };
}

export async function addRetailToCartAction(formData: FormData) {
  const packageId = String(formData.get("packageId") ?? "");
  const farmSlug = String(formData.get("farmSlug") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/shop/${farmSlug}`);

  const pkg = await prisma.freezerPackage.findUnique({
    where: { id: packageId },
    include: { farm: true },
  });
  if (!pkg || pkg.status !== "AVAILABLE" || pkg.inspectionPath !== "INSPECTED_RETAIL") {
    redirect(`${returnTo}?error=unavailable`);
  }
  if (pkg.farm.slug !== farmSlug) {
    redirect(`${returnTo}?error=farm`);
  }

  const result = await mutateCart((cart) => {
    if (cart.farmSlug && cart.farmSlug !== farmSlug) {
      return { error: "mixed" };
    }
    if (cart.items.some((i) => i.kind === "retail" && i.packageId === packageId)) {
      return cart;
    }
    const item: CartItem = { kind: "retail", packageId, farmSlug };
    return { farmSlug, items: [...cart.items, item] };
  });

  if ("error" in result) {
    redirect(`${returnTo}?error=mixed-farm`);
  }
  redirect("/shop/cart");
}

export async function addShareToCartAction(formData: FormData) {
  const animalId = String(formData.get("animalId") ?? "");
  const farmSlug = String(formData.get("farmSlug") ?? "");
  const sharePct = parseSharePct(formData.get("sharePct"));
  const returnTo = String(formData.get("returnTo") ?? `/shop/${farmSlug}`);

  if (!sharePct) {
    redirect(`${returnTo}?error=share-size`);
  }

  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: { farm: true, shareRoster: true },
  });
  if (!animal || !animal.listedForShare || animal.status !== "PASTURE") {
    redirect(`${returnTo}?error=unavailable`);
  }
  if (animal.farm.slug !== farmSlug) {
    redirect(`${returnTo}?error=farm`);
  }
  if (sharePct > remainingSharePct(animal)) {
    redirect(`${returnTo}?error=share-full`);
  }

  const result = await mutateCart((cart) => {
    if (cart.farmSlug && cart.farmSlug !== farmSlug) {
      return { error: "mixed" };
    }
    // One share line per animal
    const without = cart.items.filter(
      (i) => !(i.kind === "share" && i.animalId === animalId),
    );
    const item: CartItem = { kind: "share", animalId, farmSlug, sharePct };
    return { farmSlug, items: [...without, item] };
  });

  if ("error" in result) {
    redirect(`${returnTo}?error=mixed-farm`);
  }
  redirect("/shop/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");

  await mutateCart((cart) => {
    const items = cart.items.filter((item) => {
      if (kind === "retail" && item.kind === "retail") return item.packageId !== id;
      if (kind === "share" && item.kind === "share") return item.animalId !== id;
      return true;
    });
    return items.length === 0 ? emptyCart() : { ...cart, items };
  });
  redirect("/shop/cart");
}

export async function clearCartAction() {
  await writeCart(emptyCart());
  revalidatePath("/shop");
  redirect("/shop");
}

export async function placeOrderAction(formData: FormData) {
  const cart = await readCart();
  const resolved = await resolveCart(cart);

  if (!resolved.farm || (resolved.retail.length === 0 && resolved.shares.length === 0)) {
    redirect("/shop/cart?error=empty");
  }
  if (resolved.errors.length > 0) {
    redirect("/shop/cart?error=stale");
  }

  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim() || null;
  const buyerPhone = String(formData.get("buyerPhone") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const pickupRaw = String(formData.get("pickupType") ?? "FARM");
  const pickupType = pickupRaw === "BUTCHER" ? PickupType.BUTCHER : PickupType.FARM;
  const butcherIdRaw = String(formData.get("butcherId") ?? "");
  const butcherId = pickupType === PickupType.BUTCHER && butcherIdRaw ? butcherIdRaw : null;

  if (!buyerName) {
    redirect("/shop/checkout?error=name");
  }
  if (!buyerEmail && !buyerPhone) {
    redirect("/shop/checkout?error=contact");
  }
  if (pickupType === PickupType.BUTCHER) {
    const butcher = await prisma.butcher.findFirst({
      where: { id: butcherId ?? undefined, farmId: resolved.farm.id },
    });
    if (!butcher) {
      redirect("/shop/checkout?error=butcher");
    }
  }

  const farmId = resolved.farm.id;
  const orderIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    if (resolved.retail.length > 0) {
      const stubPi = `pi_stub_${Date.now().toString(36)}`;
      const order = await tx.buyerOrder.create({
        data: {
          farmId,
          butcherId,
          buyerName,
          buyerEmail,
          buyerPhone,
          checkoutMode: CheckoutMode.INSPECTED_RETAIL,
          pickupType,
          status: OrderStatus.RESERVED,
          stripePaymentIntentId: stubPi,
          notes,
          items: {
            create: resolved.retail.map(({ pkg }) => ({
              packageId: pkg.id,
              label: packageLabel(pkg),
              quantity: 1,
            })),
          },
        },
      });
      await tx.freezerPackage.updateMany({
        where: { id: { in: resolved.retail.map((r) => r.pkg.id) } },
        data: { status: PackageStatus.RESERVED },
      });
      orderIds.push(order.id);
    }

    if (resolved.shares.length > 0) {
      for (const row of resolved.shares) {
        const ownerField = `owners_${row.animal.id}`;
        const ownersRaw = String(formData.get(ownerField) ?? "").trim();
        const ownerNames = ownersRaw
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (ownerNames.length === 0) {
          throw new Error("SHARE_OWNERS");
        }

        // Re-check remaining inside transaction
        const fresh = await tx.animal.findUnique({
          where: { id: row.animal.id },
          include: { shareRoster: true },
        });
        if (!fresh || !fresh.listedForShare || fresh.status !== "PASTURE") {
          throw new Error("SHARE_GONE");
        }
        if (row.item.sharePct > remainingSharePct(fresh)) {
          throw new Error("SHARE_FULL");
        }

        const stubPi = `pi_stub_share_${Date.now().toString(36)}`;
        const pctEach = row.item.sharePct / ownerNames.length;
        const order = await tx.buyerOrder.create({
          data: {
            farmId,
            butcherId,
            buyerName,
            buyerEmail,
            buyerPhone,
            checkoutMode: CheckoutMode.CUSTOM_EXEMPT_SHARE,
            pickupType,
            status: OrderStatus.RESERVED,
            stripePaymentIntentId: stubPi,
            notes:
              notes ??
              `Custom-exempt ${shareLabel(row.item.sharePct).toLowerCase()} of ${fresh.tag} — deposit ${sharePriceCents(fresh, row.item.sharePct)} cents stub`,
            items: {
              create: [
                {
                  label: `${shareLabel(row.item.sharePct)} · ${fresh.tag} (live share)`,
                  quantity: 1,
                },
              ],
            },
            shareOwners: {
              create: ownerNames.map((name) => ({
                animalId: fresh.id,
                name,
                sharePct: pctEach,
              })),
            },
          },
        });
        orderIds.push(order.id);
      }
    }
  }).catch((err: unknown) => {
    const code = err instanceof Error ? err.message : "";
    if (code === "SHARE_OWNERS") redirect("/shop/checkout?error=owners");
    if (code === "SHARE_GONE" || code === "SHARE_FULL") redirect("/shop/cart?error=stale");
    throw err;
  });

  await writeCart(emptyCart());
  revalidatePath("/shop");
  redirect(`/shop/order/${orderIds[0]}${orderIds.length > 1 ? `?also=${orderIds.slice(1).join(",")}` : ""}`);
}
