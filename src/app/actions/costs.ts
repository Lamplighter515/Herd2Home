"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CostAllocationMethod, CostCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFarmContext } from "@/lib/auth";
import { parseOptionalDate } from "@/lib/herd";
import {
  allocateCost,
  dollarsToCents,
  estimateAnimalDays,
  weightGainInPeriod,
  type AllocationAnimalInput,
} from "@/lib/costs";

function revalidateCosts(animalIds: string[] = []) {
  revalidatePath("/herd");
  revalidatePath("/herd/costs");
  revalidatePath("/dashboard");
  for (const id of animalIds) {
    revalidatePath(`/herd/${id}`);
  }
}

export async function createCostEntryAction(formData: FormData) {
  const { farm } = await requireFarmContext();

  const category = String(formData.get("category") ?? "FEED") as CostCategory;
  const amountCents = dollarsToCents(String(formData.get("amount") ?? ""));
  const incurredAt =
    parseOptionalDate(String(formData.get("incurredAt") ?? "")) ?? new Date();
  const periodStart =
    parseOptionalDate(String(formData.get("periodStart") ?? "")) ?? incurredAt;
  const periodEnd =
    parseOptionalDate(String(formData.get("periodEnd") ?? "")) ?? incurredAt;
  const description = String(formData.get("description") ?? "").trim() || null;
  const allocationMethod = (String(formData.get("allocationMethod") ?? "EQUAL_PER_HEAD") ||
    "EQUAL_PER_HEAD") as CostAllocationMethod;
  const lotIdRaw = String(formData.get("lotId") ?? "");
  const lotId = lotIdRaw || null;

  if (amountCents == null || amountCents <= 0) {
    redirect("/herd/costs?error=amount");
  }

  const selectedIds = formData
    .getAll("animalIds")
    .map((v) => String(v))
    .filter(Boolean);

  let animals = await prisma.animal.findMany({
    where: {
      farmId: farm.id,
      ...(lotId ? { lotId } : {}),
      ...(selectedIds.length > 0 ? { id: { in: selectedIds } } : {}),
    },
    include: {
      weightEvents: { orderBy: { weighedAt: "asc" } },
    },
  });

  // Lot scope with no explicit picks → animals currently in lot.
  // Farm-wide with no picks → all farm animals (living preferred; include all for cost basis).
  if (selectedIds.length === 0 && !lotId) {
    animals = await prisma.animal.findMany({
      where: { farmId: farm.id },
      include: { weightEvents: { orderBy: { weighedAt: "asc" } } },
    });
  }

  if (animals.length === 0) {
    redirect("/herd/costs?error=animals");
  }

  const inputs: AllocationAnimalInput[] = animals.map((a) => {
    const exitedAt = a.mortalityAt ?? (a.status === "SOLD" || a.status === "SOLD_RESERVED" ? a.unlistedAt : null);
    const base: AllocationAnimalInput = {
      id: a.id,
      animalDays: estimateAnimalDays({
        periodStart,
        periodEnd,
        acquiredAt: a.birthOrAcquired,
        exitedAt,
      }),
      weightGainLb: weightGainInPeriod(a.weightEvents, periodStart, periodEnd),
    };

    if (allocationMethod === "MANUAL") {
      const raw = String(formData.get(`manual_${a.id}`) ?? "");
      const cents = dollarsToCents(raw);
      base.manualCents = cents ?? 0;
    }
    return base;
  });

  // Manual without any amounts entered → fall back to equal among selected.
  if (
    allocationMethod === "MANUAL" &&
    inputs.every((i) => !i.manualCents || i.manualCents === 0)
  ) {
    redirect("/herd/costs?error=manual");
  }

  const lines = allocateCost(amountCents, allocationMethod, inputs);

  const entry = await prisma.costEntry.create({
    data: {
      farmId: farm.id,
      lotId,
      category,
      amountCents,
      incurredAt,
      periodStart,
      periodEnd,
      description,
      allocationMethod,
      allocations: {
        create: lines.map((l) => ({
          animalId: l.animalId,
          amountCents: l.amountCents,
          shareRatio: l.shareRatio,
        })),
      },
    },
  });

  revalidateCosts(lines.map((l) => l.animalId));
  redirect(`/herd/costs?created=${entry.id}`);
}

export async function deleteCostEntryAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  const entry = await prisma.costEntry.findFirst({
    where: { id, farmId: farm.id },
    include: { allocations: true },
  });
  if (!entry) redirect("/herd/costs");

  const animalIds = entry.allocations.map((a) => a.animalId);
  await prisma.costEntry.delete({ where: { id } });
  revalidateCosts(animalIds);
  redirect("/herd/costs?deleted=1");
}
