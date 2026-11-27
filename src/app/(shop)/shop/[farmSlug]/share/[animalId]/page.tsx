import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeCallout } from "@/components/shop/ModeCallout";
import { AddShareForm } from "@/components/shop/AddShareForm";
import { prisma } from "@/lib/prisma";
import { getFarmBySlug, money, remainingSharePct } from "@/lib/shop";
import { SPECIES_LABELS } from "@/lib/labels";

export default async function ShareDetailPage({
  params,
}: {
  params: Promise<{ farmSlug: string; animalId: string }>;
}) {
  const { farmSlug, animalId } = await params;
  const farm = await getFarmBySlug(farmSlug);
  if (!farm) notFound();

  const animal = await prisma.animal.findFirst({
    where: {
      id: animalId,
      farmId: farm.id,
      listedForShare: true,
      status: "PASTURE",
    },
    include: { shareRoster: true, lot: true },
  });
  if (!animal) notFound();

  const remaining = remainingSharePct(animal);

  return (
    <div className="shop-shell shop-section shop-detail">
      <Link href={`/shop/${farm.slug}`} className="shop-back">
        ← {farm.name}
      </Link>

      <header className="shop-detail-head">
        <p className="shop-kicker">Custom-exempt live share · {farm.city}, {farm.state}</p>
        <h1>
          {SPECIES_LABELS[animal.species]} {animal.tag}
        </h1>
        <p className="shop-hero-lede">
          Reserve a share of this living animal before slaughter. Whole-animal deposit{" "}
          {money(animal.sharePriceCents ?? 0)}. {remaining}% still open.
        </p>
      </header>

      <ModeCallout mode="share" />

      {animal.notes ? <p className="shop-detail-note">{animal.notes}</p> : null}
      {animal.lot ? <p className="shop-muted">Lot: {animal.lot.name}</p> : null}

      <AddShareForm
        animal={animal}
        farmSlug={farm.slug}
        returnTo={`/shop/${farm.slug}/share/${animal.id}`}
      />

      <p className="shop-muted shop-detail-note">
        Owner names are collected at checkout for the share roster. This is not a by-the-pound retail
        sale.
      </p>
    </div>
  );
}
