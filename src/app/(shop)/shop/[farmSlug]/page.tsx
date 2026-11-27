import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeCallout } from "@/components/shop/ModeCallout";
import { AddRetailForm } from "@/components/shop/AddRetailForm";
import {
  formatLbs,
  getAvailableRetail,
  getFarmBySlug,
  getOpenShares,
  money,
  remainingSharePct,
  shareLabel,
  sharePriceCents,
} from "@/lib/shop";
import { SPECIES_LABELS } from "@/lib/labels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ farmSlug: string }>;
}) {
  const { farmSlug } = await params;
  const farm = await getFarmBySlug(farmSlug);
  if (!farm) return { title: "Farm not found · Herd 2 Home" };
  return {
    title: `${farm.name} · Herd 2 Home`,
    description: farm.tagline ?? `Shop available meat from ${farm.name}`,
  };
}

export default async function FarmShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ farmSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { farmSlug } = await params;
  const { error } = await searchParams;
  const farm = await getFarmBySlug(farmSlug);
  if (!farm) notFound();

  const [packages, shares] = await Promise.all([
    getAvailableRetail(farm.id),
    getOpenShares(farm.id),
  ]);

  return (
    <>
      <section className="shop-farm-hero">
        <div className="shop-farm-hero-atmosphere" aria-hidden />
        <div className="shop-shell shop-farm-hero-copy">
          <p className="shop-kicker">
            {farm.city}, {farm.state}
          </p>
          <h1>{farm.name}</h1>
          <p className="shop-hero-lede">{farm.tagline}</p>
          {farm.about ? <p className="shop-farm-about">{farm.about}</p> : null}
          <div className="shop-hero-cta">
            <a href="#retail" className="shop-btn shop-btn-primary">
              Retail cuts
            </a>
            <a href="#shares" className="shop-btn shop-btn-ghost">
              Live shares
            </a>
          </div>
        </div>
      </section>

      <div className="shop-shell shop-section">
        {error === "mixed-farm" ? (
          <p className="shop-error" role="alert">
            Your cart already has items from another farm. Clear the cart or finish that order first.
          </p>
        ) : null}
        {error === "unavailable" ? (
          <p className="shop-error" role="alert">
            That item is no longer available.
          </p>
        ) : null}

        <section id="retail" className="shop-block">
          <header className="shop-section-head">
            <h2>Available retail cuts</h2>
            <p>Inspected packages ready for pickup.</p>
          </header>
          <ModeCallout mode="retail" />

          {packages.length === 0 ? (
            <p className="shop-empty">No inspected retail packages available right now.</p>
          ) : (
            <ul className="shop-product-list">
              {packages.map((pkg) => (
                <li key={pkg.id} className="shop-product-row">
                  <div>
                    <Link href={`/shop/${farm.slug}/p/${pkg.id}`} className="shop-product-title">
                      {pkg.cutName}
                    </Link>
                    <p className="shop-muted">
                      {formatLbs(pkg.weightLbs)}
                      {pkg.animal ? ` · from ${pkg.animal.tag}` : null}
                    </p>
                  </div>
                  <div className="shop-product-buy">
                    <span className="shop-price">{money(pkg.priceCents)}</span>
                    <AddRetailForm
                      packageId={pkg.id}
                      farmSlug={farm.slug}
                      returnTo={`/shop/${farm.slug}`}
                      label="Add"
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="shares" className="shop-block">
          <header className="shop-section-head">
            <h2>Custom-exempt live shares</h2>
            <p>Reserve a share of a living animal — owner roster before slaughter.</p>
          </header>
          <ModeCallout mode="share" />

          {shares.length === 0 ? (
            <p className="shop-empty">No live shares open right now.</p>
          ) : (
            <ul className="shop-product-list">
              {shares.map((animal) => {
                const remaining = remainingSharePct(animal);
                return (
                  <li key={animal.id} className="shop-product-row">
                    <div>
                      <Link
                        href={`/shop/${farm.slug}/share/${animal.id}`}
                        className="shop-product-title"
                      >
                        {SPECIES_LABELS[animal.species]} · {animal.tag}
                      </Link>
                      <p className="shop-muted">
                        {shareLabel(100)} deposit {money(animal.sharePriceCents ?? 0)} ·{" "}
                        {remaining}% open
                        {animal.lot ? ` · ${animal.lot.name}` : null}
                      </p>
                    </div>
                    <div className="shop-product-buy">
                      <span className="shop-price">
                        from {money(sharePriceCents(animal, Math.min(25, remaining) || 25))}
                      </span>
                      <Link
                        href={`/shop/${farm.slug}/share/${animal.id}`}
                        className="shop-btn shop-btn-primary"
                      >
                        Reserve
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="shop-block shop-pickup-note">
          <h2>Pickup</h2>
          <p>
            At checkout you’ll choose <strong>on-farm pickup</strong>
            {farm.butchers.length > 0 ? (
              <>
                {" "}
                or <strong>butcher / locker pickup</strong> (
                {farm.butchers.map((b) => b.name).join(", ")})
              </>
            ) : null}
            .
          </p>
          <p className="shop-muted">
            Farm ops stay behind sign-in.{" "}
            <Link href="/login" className="shop-text-link">
              Farmer login
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
