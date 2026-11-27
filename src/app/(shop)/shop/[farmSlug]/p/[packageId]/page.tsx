import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeCallout } from "@/components/shop/ModeCallout";
import { AddRetailForm } from "@/components/shop/AddRetailForm";
import { prisma } from "@/lib/prisma";
import { formatLbs, getFarmBySlug, money } from "@/lib/shop";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ farmSlug: string; packageId: string }>;
}) {
  const { farmSlug, packageId } = await params;
  const farm = await getFarmBySlug(farmSlug);
  if (!farm) notFound();

  const pkg = await prisma.freezerPackage.findFirst({
    where: {
      id: packageId,
      farmId: farm.id,
      status: "AVAILABLE",
      inspectionPath: "INSPECTED_RETAIL",
    },
    include: { animal: true },
  });
  if (!pkg) notFound();

  return (
    <div className="shop-shell shop-section shop-detail">
      <Link href={`/shop/${farm.slug}`} className="shop-back">
        ← {farm.name}
      </Link>

      <header className="shop-detail-head">
        <p className="shop-kicker">Inspected retail · {farm.city}, {farm.state}</p>
        <h1>{pkg.cutName}</h1>
        <p className="shop-hero-lede">
          {formatLbs(pkg.weightLbs)} catch-weight package
          {pkg.animal ? ` from animal ${pkg.animal.tag}` : ""}.
        </p>
        <p className="shop-price-lg">{money(pkg.priceCents)}</p>
      </header>

      <ModeCallout mode="retail" />

      <AddRetailForm
        packageId={pkg.id}
        farmSlug={farm.slug}
        returnTo={`/shop/${farm.slug}/p/${pkg.id}`}
        label="Add to cart"
      />

      <p className="shop-muted shop-detail-note">
        Pickup choice (farm or butcher/locker) is selected at checkout. Payment is stubbed for the
        pilot — your order will still reserve this package.
      </p>
    </div>
  );
}
