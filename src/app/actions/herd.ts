"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AnimalStatus, Species } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireFarmContext } from "@/lib/auth";

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
  const sex = String(formData.get("sex") ?? "").trim() || "unknown";
  const status = String(formData.get("status") ?? "PASTURE") as AnimalStatus;
  const lotIdRaw = String(formData.get("lotId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const birthRaw = String(formData.get("birthOrAcquired") ?? "");

  if (!tag) {
    redirect("/herd/new?error=tag");
  }

  await prisma.animal.create({
    data: {
      farmId: farm.id,
      tag,
      species,
      sex,
      status,
      lotId: lotIdRaw || null,
      notes,
      birthOrAcquired: birthRaw ? new Date(birthRaw) : null,
    },
  });

  revalidatePath("/herd");
  revalidatePath("/dashboard");
  redirect("/herd");
}

export async function updateAnimalAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  const tag = String(formData.get("tag") ?? "").trim();
  const species = String(formData.get("species") ?? "CATTLE") as Species;
  const sex = String(formData.get("sex") ?? "").trim() || "unknown";
  const status = String(formData.get("status") ?? "PASTURE") as AnimalStatus;
  const lotIdRaw = String(formData.get("lotId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const birthRaw = String(formData.get("birthOrAcquired") ?? "");

  const existing = await prisma.animal.findFirst({
    where: { id, farmId: farm.id },
  });
  if (!existing) {
    redirect("/herd");
  }

  await prisma.animal.update({
    where: { id },
    data: {
      tag,
      species,
      sex,
      status,
      lotId: lotIdRaw || null,
      notes,
      birthOrAcquired: birthRaw ? new Date(birthRaw) : null,
    },
  });

  revalidatePath("/herd");
  revalidatePath(`/herd/${id}`);
  revalidatePath("/dashboard");
  redirect(`/herd/${id}`);
}

export async function deleteAnimalAction(formData: FormData) {
  const { farm } = await requireFarmContext();
  const id = String(formData.get("id") ?? "");
  await prisma.animal.deleteMany({ where: { id, farmId: farm.id } });
  revalidatePath("/herd");
  revalidatePath("/dashboard");
  redirect("/herd");
}
