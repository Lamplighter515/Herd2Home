import Link from "next/link";
import { listShopFarms } from "@/lib/shop";

export const metadata = {
  title: "Shop local meat · Herd 2 Home",
  description:
    "Buy inspected freezer cuts and reserve custom-exempt live shares from Indiana pilot farms.",
};

export default async function ShopHomePage() {
  const farms = await listShopFarms();

  return (
    <>
      <section className="shop-hero">
        <div className="shop-hero-atmosphere" aria-hidden />
        <div className="shop-shell shop-hero-copy">
          <p className="shop-kicker">Indiana pilot</p>
          <h1 className="shop-hero-brand">Herd 2 Home</h1>
          <p className="shop-hero-lede">
            Meat from farms you can drive to — inspected cuts in the freezer, or a live share before
            the locker date.
          </p>
          <div className="shop-hero-cta">
            <a href="#farms" className="shop-btn shop-btn-primary">
              Browse farms
            </a>
            <Link href="/shop/cart" className="shop-btn shop-btn-ghost">
              View cart
            </Link>
          </div>
        </div>
      </section>

      <section id="farms" className="shop-shell shop-section">
        <header className="shop-section-head">
          <h2>Farms with product ready</h2>
          <p>Pick a farm, choose retail cuts or a live share, then set farm or butcher pickup.</p>
        </header>

        <ul className="shop-farm-list">
          {farms.map((farm) => {
            const stock = farm.availableCuts + farm.openShares;
            return (
              <li key={farm.id}>
                <Link href={`/shop/${farm.slug}`} className="shop-farm-row">
                  <div>
                    <h3>{farm.name}</h3>
                    <p className="shop-muted">
                      {farm.city}, {farm.county} County · {farm.tagline}
                    </p>
                  </div>
                  <div className="shop-farm-meta">
                    {farm.availableCuts > 0 ? (
                      <span>{farm.availableCuts} retail cuts</span>
                    ) : null}
                    {farm.openShares > 0 ? <span>{farm.openShares} live shares</span> : null}
                    {stock === 0 ? <span>Check back soon</span> : null}
                    <span className="shop-farm-go" aria-hidden>
                      →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="shop-shell shop-section shop-modes">
        <header className="shop-section-head">
          <h2>Two ways to buy — don’t mix them up</h2>
          <p>Checkout copy follows Indiana inspection paths so you reserve the right product.</p>
        </header>
        <div className="shop-mode-grid">
          <article>
            <h3>Inspected retail</h3>
            <p>
              Individual freezer packages sold by cut and weight after inspection. Add to cart like a
              normal store run.
            </p>
          </article>
          <article>
            <h3>Custom-exempt live share</h3>
            <p>
              Reserve a quarter, half, or whole of a living animal and join the owner roster before
              slaughter — not sold by the pound.
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
