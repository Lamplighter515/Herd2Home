"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  AnimalClass,
  AnimalSex,
  AnimalStatus,
  BreedingMethod,
  HealthEventType,
  PregnancyStatus,
  SalePath,
  SharePortion,
  Species,
  WeightEventType,
  WeightSource,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFarmContext } from "@/lib/auth";
import {
  canProcessOrSell,
  estimateDueDate,
  legacySexLabel,
  normalizeStatus,
  parseOptionalDate,
  parseOptionalFloat,
  parseOptionalInt,
  sexFromClass,
} from "@/lib/herd";

function revalidateAnimal(id: string) {
  revalidatePath("/herd");
  revalidatePath(`/herd/${id}`);
  revalidatePath("/herd/calendar");
  revalidatePath("/dashboard");
}

async function getOwnedAnimal(farmId: string, id: string) {
  return prisma.animal.findFirst({ where: { id, farmId } });
}

export async function createLotAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const name = String(formData.get("name") ?? "").trim();
  const species = String(formData.get("species") ?? "CATTLE") as Species;
  if (!name) return;
  await prisma.lot.create({
    data: { farmId: farm.id, name, species },
  });
  revalidatePath("/herd");
}

export async function createAnimalAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const tag = String(formData.get("tag") ?? "").trim();
  const species = String(formData.get("species") ?? "CATTLE") as Species;
  const animalClass = String(formData.get("animalClass") ?? "OTHER") as AnimalClass;
  const sexEnum = (String(formData.get("sexEnum") ?? "") as AnimalSex) || sexFromClass(animalClass);
  const status = normalizeStatus(
    String(formData.get("status") ?? "ON_FARM") as AnimalStatus,
  );
  const lotIdRaw = String(formData.get("lotId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim() || null;
  const eid = String(formData.get("eid") ?? "").trim() || null;
  const breed = String(formData.get("breed") ?? "").trim() || null;
  const colorMarkings = String(formData.get("colorMarkings") ?? "").trim() || null;
  const birthOrAcquired = parseOptionalDate(String(formData.get("birthOrAcquired") ?? ""));
  const damId = String(formData.get("damId") ?? "") || null;
  const sireId = String(formData.get("sireId") ?? "") || null;
  const sireName = String(formData.get("sireName") ?? "").trim() || null;

  if (!tag) {
    redirect("/herd/new?error=tag");
  }

  const animal = await prisma.animal.create({
    data: {
      farmId: farm.id,
      tag,
      name,
      eid,
      species,
      sex: legacySexLabel(sexEnum, animalClass),
      sexEnum,
      animalClass,
      breed,
      colorMarkings,
      status,
      lotId: lotIdRaw || null,
      notes,
      birthOrAcquired,
      damId,
      sireId,
      sireName,
      statusHistory: {
        create: { toStatus: status, notes: "Created" },
      },
    },
  });

  revalidateAnimal(animal.id);
  redirect(`/herd/${animal.id}`);
}

export async function updateAnimalAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  const existing = await getOwnedAnimal(farm.id, id);
  if (!existing) redirect("/herd");

  const tag = String(formData.get("tag") ?? "").trim();
  const species = String(formData.get("species") ?? "CATTLE") as Species;
  const animalClass = String(formData.get("animalClass") ?? "OTHER") as AnimalClass;
  const sexEnum = (String(formData.get("sexEnum") ?? "") as AnimalSex) || sexFromClass(animalClass);
  const lotIdRaw = String(formData.get("lotId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "").trim() || null;
  const eid = String(formData.get("eid") ?? "").trim() || null;
  const breed = String(formData.get("breed") ?? "").trim() || null;
  const colorMarkings = String(formData.get("colorMarkings") ?? "").trim() || null;
  const birthOrAcquired = parseOptionalDate(String(formData.get("birthOrAcquired") ?? ""));
  const damId = String(formData.get("damId") ?? "") || null;
  const sireId = String(formData.get("sireId") ?? "") || null;
  const sireName = String(formData.get("sireName") ?? "").trim() || null;

  await prisma.animal.update({
    where: { id },
    data: {
      tag,
      name,
      eid,
      species,
      sex: legacySexLabel(sexEnum, animalClass),
      sexEnum,
      animalClass,
      breed,
      colorMarkings,
      lotId: lotIdRaw || null,
      notes,
      birthOrAcquired,
      damId: damId === id ? null : damId,
      sireId: sireId === id ? null : sireId,
      sireName,
    },
  });

  revalidateAnimal(id);
  redirect(`/herd/${id}`);
}

export async function moveAnimalStatusAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  const toStatus = normalizeStatus(String(formData.get("toStatus") ?? "") as AnimalStatus);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const overrideWithdrawal = String(formData.get("overrideWithdrawal") ?? "") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  const animal = await prisma.animal.findFirst({
    where: { id, farmId: farm.id },
    include: {
      healthEvents: { where: { meatWithdrawalEndsAt: { not: null } } },
      shareSlotsRoster: true,
    },
  });
  if (!animal) redirect("/herd");

  const processStatuses: AnimalStatus[] = ["BOOKED_LOCKER", "AT_LOCKER", "HANGING"];
  if (processStatuses.includes(toStatus)) {
    const withdrawal = animal.healthEvents
      .filter((e) => e.meatWithdrawalEndsAt && e.meatWithdrawalEndsAt > new Date())
      .sort(
        (a, b) =>
          (b.meatWithdrawalEndsAt?.getTime() ?? 0) - (a.meatWithdrawalEndsAt?.getTime() ?? 0),
      )[0];
    const gate = canProcessOrSell(animal, {
      withdrawalEndsAt: withdrawal?.meatWithdrawalEndsAt,
      rosterCount: animal.shareSlotsRoster.length,
      override: overrideWithdrawal && Boolean(overrideReason),
    });
    if (!gate.ok && gate.reasons.includes("in_meat_withdrawal")) {
      redirect(`/herd/${id}?error=withdrawal`);
    }
  }

  const fromStatus = animal.status;
  const data: {
    status: AnimalStatus;
    availableForSale?: boolean;
    unlistedAt?: Date | null;
    mortalityReason?: string | null;
    mortalityAt?: Date | null;
  } = { status: toStatus };

  if (toStatus === "DEAD" || toStatus === "CULLED_OTHER") {
    data.availableForSale = false;
    data.unlistedAt = new Date();
    data.mortalityReason = notes;
    data.mortalityAt = new Date();
  }

  const historyNotes =
    overrideWithdrawal && overrideReason
      ? `${notes ?? "Status move"}; withdrawal override: ${overrideReason}`
      : notes;

  await prisma.$transaction([
    prisma.animal.update({ where: { id }, data }),
    prisma.animalStatusHistory.create({
      data: {
        animalId: id,
        fromStatus,
        toStatus,
        notes: historyNotes,
      },
    }),
  ]);

  revalidateAnimal(id);
  redirect(`/herd/${id}`);
}

export async function updateSaleFlagsAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  const animal = await prisma.animal.findFirst({
    where: { id, farmId: farm.id },
    include: {
      healthEvents: true,
      shareSlotsRoster: true,
    },
  });
  if (!animal) redirect("/herd");

  const availableForSale = String(formData.get("availableForSale") ?? "") === "on";
  const salePath = String(formData.get("salePath") ?? "NONE") as SalePath;
  const sharePortionRaw = String(formData.get("sharePortion") ?? "");
  const sharePortion = sharePortionRaw ? (sharePortionRaw as SharePortion) : null;
  const shareSlots = parseOptionalInt(String(formData.get("shareSlots") ?? ""));
  const targetReadyDate = parseOptionalDate(String(formData.get("targetReadyDate") ?? ""));
  const publicBlurb = String(formData.get("publicBlurb") ?? "").trim() || null;
  const overrideWithdrawal = String(formData.get("overrideWithdrawal") ?? "") === "on";
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  const withdrawal = animal.healthEvents
    .filter((e) => e.meatWithdrawalEndsAt && e.meatWithdrawalEndsAt > new Date())
    .sort(
      (a, b) =>
        (b.meatWithdrawalEndsAt?.getTime() ?? 0) - (a.meatWithdrawalEndsAt?.getTime() ?? 0),
    )[0];

  if (availableForSale) {
    const gate = canProcessOrSell(
      { ...animal, salePath, sharePortion, shareSlots: shareSlots ?? animal.shareSlots },
      {
        withdrawalEndsAt: withdrawal?.meatWithdrawalEndsAt,
        rosterCount: animal.shareSlotsRoster.length,
        override: overrideWithdrawal && Boolean(overrideReason),
      },
    );
    if (!gate.ok && gate.reasons.includes("in_meat_withdrawal") && !overrideWithdrawal) {
      redirect(`/herd/${id}?error=withdrawal`);
    }
  }

  await prisma.animal.update({
    where: { id },
    data: {
      availableForSale,
      salePath: availableForSale ? salePath : "NONE",
      sharePortion: salePath === "CUSTOM_EXEMPT_SHARE" ? sharePortion : null,
      shareSlots: salePath === "CUSTOM_EXEMPT_SHARE" ? shareSlots : null,
      targetReadyDate,
      publicBlurb,
      listedAt: availableForSale ? animal.listedAt ?? new Date() : animal.listedAt,
      unlistedAt: availableForSale ? null : new Date(),
    },
  });

  if (overrideWithdrawal && overrideReason) {
    await prisma.animalStatusHistory.create({
      data: {
        animalId: id,
        fromStatus: animal.status,
        toStatus: animal.status,
        notes: `Sale listing override for withdrawal: ${overrideReason}`,
      },
    });
  }

  revalidateAnimal(id);
  redirect(`/herd/${id}`);
}

export async function addWeightAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("animalId") ?? "");
  const animal = await getOwnedAnimal(farm.id, id);
  if (!animal) redirect("/herd");

  const weightLb = parseOptionalFloat(String(formData.get("weightLb") ?? ""));
  if (weightLb == null) redirect(`/herd/${id}?error=weight`);

  await prisma.weightEvent.create({
    data: {
      animalId: id,
      weighedAt: parseOptionalDate(String(formData.get("weighedAt") ?? "")) ?? new Date(),
      weightLb,
      type: String(formData.get("type") ?? "PERIODIC") as WeightEventType,
      source: String(formData.get("source") ?? "SCALE") as WeightSource,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  revalidateAnimal(id);
  redirect(`/herd/${id}?tab=weights`);
}

export async function addHealthEventAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("animalId") ?? "");
  const animal = await getOwnedAnimal(farm.id, id);
  if (!animal) redirect("/herd");

  const withdrawalDays = parseOptionalInt(String(formData.get("withdrawalDays") ?? ""));
  const eventAt = parseOptionalDate(String(formData.get("eventAt") ?? "")) ?? new Date();
  let meatWithdrawalEndsAt = parseOptionalDate(String(formData.get("meatWithdrawalEndsAt") ?? ""));
  if (!meatWithdrawalEndsAt && withdrawalDays != null && withdrawalDays > 0) {
    meatWithdrawalEndsAt = new Date(eventAt);
    meatWithdrawalEndsAt.setDate(meatWithdrawalEndsAt.getDate() + withdrawalDays);
  }

  await prisma.healthEvent.create({
    data: {
      animalId: id,
      eventAt,
      type: String(formData.get("type") ?? "TREATMENT") as HealthEventType,
      productName: String(formData.get("productName") ?? "").trim() || null,
      dose: String(formData.get("dose") ?? "").trim() || null,
      route: String(formData.get("route") ?? "").trim() || null,
      lotBatch: String(formData.get("lotBatch") ?? "").trim() || null,
      administeredBy: String(formData.get("administeredBy") ?? "").trim() || null,
      vetName: String(formData.get("vetName") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      meatWithdrawalEndsAt,
    },
  });

  revalidateAnimal(id);
  redirect(`/herd/${id}?tab=health`);
}

export async function addBreedingAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const femaleId = String(formData.get("femaleId") ?? "");
  const female = await getOwnedAnimal(farm.id, femaleId);
  if (!female) redirect("/herd");

  const method = String(formData.get("method") ?? "NATURAL") as BreedingMethod;
  const sireId = String(formData.get("sireId") ?? "") || null;
  const sireName = String(formData.get("sireName") ?? "").trim() || null;
  const exposureStart = parseOptionalDate(String(formData.get("exposureStart") ?? ""));
  const exposureEnd = parseOptionalDate(String(formData.get("exposureEnd") ?? ""));
  const aiDate = parseOptionalDate(String(formData.get("aiDate") ?? ""));
  const breedDate = aiDate ?? exposureStart ?? new Date();
  const dueDate =
    parseOptionalDate(String(formData.get("dueDate") ?? "")) ??
    estimateDueDate(female.species, breedDate);

  await prisma.$transaction(async (tx) => {
    const breeding = await tx.breedingEvent.create({
      data: {
        femaleId,
        method,
        sireId,
        sireName,
        exposureStart,
        exposureEnd,
        aiDate,
        notes: String(formData.get("notes") ?? "").trim() || null,
      },
    });
    await tx.pregnancy.create({
      data: {
        femaleId,
        breedingEventId: breeding.id,
        status: "BRED",
        breedDate,
        dueDate,
      },
    });
  });

  revalidateAnimal(femaleId);
  redirect(`/herd/${femaleId}?tab=breeding`);
}

export async function updatePregnancyAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const pregnancyId = String(formData.get("pregnancyId") ?? "");
  const femaleId = String(formData.get("femaleId") ?? "");
  const pregnancy = await prisma.pregnancy.findFirst({
    where: { id: pregnancyId, femaleId, female: { farmId: farm.id } },
  });
  if (!pregnancy) redirect("/herd");

  const status = String(formData.get("status") ?? pregnancy.status) as PregnancyStatus;
  const dueDate = parseOptionalDate(String(formData.get("dueDate") ?? ""));
  const checkDate = parseOptionalDate(String(formData.get("checkDate") ?? ""));
  const checkResult = String(formData.get("checkResult") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.pregnancy.update({
    where: { id: pregnancyId },
    data: {
      status,
      dueDate: dueDate ?? pregnancy.dueDate,
      checkDate,
      checkResult,
      notes,
    },
  });

  revalidateAnimal(femaleId);
  redirect(`/herd/${femaleId}?tab=breeding`);
}

export async function recordBirthAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const damId = String(formData.get("damId") ?? "");
  const dam = await getOwnedAnimal(farm.id, damId);
  if (!dam) redirect("/herd");

  const tag = String(formData.get("tag") ?? "").trim();
  if (!tag) redirect(`/herd/${damId}?error=tag&tab=breeding`);

  const animalClass = String(formData.get("animalClass") ?? "CALF") as AnimalClass;
  const sexEnum = (String(formData.get("sexEnum") ?? "") as AnimalSex) || sexFromClass(animalClass);
  const birthDate = parseOptionalDate(String(formData.get("birthDate") ?? "")) ?? new Date();
  const birthWeight = parseOptionalFloat(String(formData.get("birthWeight") ?? ""));
  const sireId = String(formData.get("sireId") ?? "") || dam.sireId || null;
  const sireName = String(formData.get("sireName") ?? "").trim() || dam.sireName;
  const pregnancyId = String(formData.get("pregnancyId") ?? "") || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const calf = await prisma.$transaction(async (tx) => {
    const created = await tx.animal.create({
      data: {
        farmId: farm.id,
        lotId: dam.lotId,
        tag,
        species: dam.species,
        sex: legacySexLabel(sexEnum, animalClass),
        sexEnum,
        animalClass,
        status: "ON_FARM",
        birthOrAcquired: birthDate,
        damId,
        sireId,
        sireName,
        notes,
        statusHistory: {
          create: { toStatus: "ON_FARM", notes: `Born to ${dam.tag}` },
        },
      },
    });

    if (birthWeight != null) {
      await tx.weightEvent.create({
        data: {
          animalId: created.id,
          weighedAt: birthDate,
          weightLb: birthWeight,
          type: "BIRTH",
          source: "SCALE",
        },
      });
    }

    if (dam.animalClass === "HEIFER" || dam.animalClass === "GILT") {
      const nextClass: AnimalClass =
        dam.species === "HOGS" ? "SOW" : dam.species === "CATTLE" ? "COW" : dam.animalClass;
      if (nextClass !== dam.animalClass) {
        await tx.animal.update({
          where: { id: damId },
          data: {
            animalClass: nextClass,
            sex: legacySexLabel("FEMALE", nextClass),
            sexEnum: "FEMALE",
          },
        });
        await tx.animalStatusHistory.create({
          data: {
            animalId: damId,
            fromStatus: dam.status,
            toStatus: dam.status,
            notes: `Class updated to ${nextClass.toLowerCase()} after birth of ${tag}`,
          },
        });
      }
    }

    if (pregnancyId) {
      await tx.pregnancy.updateMany({
        where: { id: pregnancyId, femaleId: damId },
        data: { status: "CALVED" },
      });
    } else {
      await tx.pregnancy.updateMany({
        where: {
          femaleId: damId,
          status: { in: ["BRED", "CONFIRMED"] },
        },
        data: { status: "CALVED" },
      });
    }

    return created;
  });

  revalidateAnimal(damId);
  revalidateAnimal(calf.id);
  redirect(`/herd/${calf.id}`);
}

export async function addShareRosterAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const animalId = String(formData.get("animalId") ?? "");
  const animal = await getOwnedAnimal(farm.id, animalId);
  if (!animal) redirect("/herd");

  const ownerName = String(formData.get("ownerName") ?? "").trim();
  if (!ownerName) redirect(`/herd/${animalId}?error=roster`);

  await prisma.animalShareSlot.create({
    data: {
      animalId,
      ownerName,
      portion: String(formData.get("portion") ?? "HALF") as SharePortion,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  if (normalizeStatus(animal.status) === "ON_FARM" && animal.salePath === "CUSTOM_EXEMPT_SHARE") {
    await prisma.animal.update({
      where: { id: animalId },
      data: { status: "RESERVED_SHARE" },
    });
    await prisma.animalStatusHistory.create({
      data: {
        animalId,
        fromStatus: animal.status,
        toStatus: "RESERVED_SHARE",
        notes: `Share rostered: ${ownerName}`,
      },
    });
  }

  revalidateAnimal(animalId);
  redirect(`/herd/${animalId}?tab=sale`);
}

export async function removeShareRosterAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const animalId = String(formData.get("animalId") ?? "");
  const slotId = String(formData.get("slotId") ?? "");
  const animal = await getOwnedAnimal(farm.id, animalId);
  if (!animal) redirect("/herd");

  await prisma.animalShareSlot.deleteMany({
    where: { id: slotId, animalId },
  });

  revalidateAnimal(animalId);
  redirect(`/herd/${animalId}?tab=sale`);
}

export async function groupMoveLotAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const lotIdRaw = String(formData.get("lotId") ?? "");
  const lotId = lotIdRaw || null;
  const ids = formData.getAll("animalIds").map(String).filter(Boolean);
  if (ids.length === 0) {
    redirect("/herd");
  }

  const owned = await prisma.animal.findMany({
    where: { farmId: farm.id, id: { in: ids } },
    select: { id: true, status: true },
  });
  if (owned.length === 0) redirect("/herd");

  await prisma.animal.updateMany({
    where: { farmId: farm.id, id: { in: owned.map((a) => a.id) } },
    data: { lotId },
  });

  const notes = String(formData.get("notes") ?? "").trim() || "Group lot move";
  await prisma.animalStatusHistory.createMany({
    data: owned.map((a) => ({
      animalId: a.id,
      fromStatus: a.status,
      toStatus: a.status,
      notes: `${notes}${lotId ? ` → lot ${lotId}` : " → unassigned"}`,
    })),
  });

  revalidatePath("/herd");
  revalidatePath("/dashboard");
  redirect("/herd?moved=1");
}

export async function groupHealthAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const ids = formData.getAll("animalIds").map(String).filter(Boolean);
  if (ids.length === 0) redirect("/herd");

  const owned = await prisma.animal.findMany({
    where: { farmId: farm.id, id: { in: ids } },
    select: { id: true },
  });
  const ownedIds = owned.map((a) => a.id);
  if (ownedIds.length === 0) redirect("/herd");

  const eventAt = parseOptionalDate(String(formData.get("eventAt") ?? "")) ?? new Date();
  const withdrawalDays = parseOptionalInt(String(formData.get("withdrawalDays") ?? ""));
  let meatWithdrawalEndsAt = parseOptionalDate(String(formData.get("meatWithdrawalEndsAt") ?? ""));
  if (!meatWithdrawalEndsAt && withdrawalDays != null && withdrawalDays > 0) {
    meatWithdrawalEndsAt = new Date(eventAt);
    meatWithdrawalEndsAt.setDate(meatWithdrawalEndsAt.getDate() + withdrawalDays);
  }

  const type = String(formData.get("type") ?? "VACCINE") as HealthEventType;
  const productName = String(formData.get("productName") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await prisma.healthEvent.createMany({
    data: ownedIds.map((animalId) => ({
      animalId,
      eventAt,
      type,
      productName,
      notes,
      meatWithdrawalEndsAt,
    })),
  });

  revalidatePath("/herd");
  redirect("/herd?treated=1");
}

export async function deleteAnimalAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  await prisma.animal.deleteMany({ where: { id, farmId: farm.id } });
  revalidatePath("/herd");
  revalidatePath("/dashboard");
  redirect("/herd");
}
