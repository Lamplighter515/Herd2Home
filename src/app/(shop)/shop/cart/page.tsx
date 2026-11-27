import Link from "next/link";
import { clearCartAction, removeCartItemAction } from "@/app/actions/shop";
import {
  formatLbs,
  money,
  packageLabel,
  readCart,
  resolveCart,
  shareLabel,
} from "@/lib/shop";
import { SPECIES_LABELS } from "@/lib/labels";

export const metadata = {
  title: "Cart · Herd 2 Home",
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cart = await readCart();
  const resolved = await resolveCart(cart);
  const empty = resolved.retail.length === 0 && resolved.shares.length === 0;

  return (
    <div className="shop-shell shop-section">
      <header className="shop-section-head">
        <h1>Your cart</h1>
        <p>
          {resolved.farm
            ? `From ${resolved.farm.name} — one farm per order.`
            : "Add inspected cuts or a live share from a farm shop."}
        </p>
      </header>

      {error === "empty" ? (
        <p className="shop-error" role="alert">
          Your cart is empty.
        </p>
      ) : null}
      {error === "stale" || resolved.errors.length > 0 ? (
        <p className="shop-error" role="alert">
          Some items changed. Remove unavailable lines and try again.
        </p>
      ) : null}

      {empty ? (
        <div className="shop-empty-state">
          <p>Nothing here yet.</p>
          <Link href="/shop" className="shop-btn shop-btn-primary">
            Browse farms
          </Link>
        </div>
      ) : (
        <>
          {resolved.retail.length > 0 ? (
            <section className="shop-block">
              <h2>Inspected retail</h2>
              <ul className="shop-cart-list">
                {resolved.retail.map(({ item, pkg }) => (
                  <li key={item.packageId} className="shop-cart-row">
                    <div>
                      <p className="shop-product-title">{packageLabel(pkg)}</p>
                      <p className="shop-muted">{formatLbs(pkg.weightLbs)} package</p>
                    </div>
                    <div className="shop-cart-side">
                      <span className="shop-price">{money(pkg.priceCents)}</span>
                      <form action={removeCartItemAction}>
                        <input type="hidden" name="kind" value="retail" />
                        <input type="hidden" name="id" value={item.packageId} />
                        <button type="submit" className="shop-text-btn">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {resolved.shares.length > 0 ? (
            <section className="shop-block">
              <h2>Custom-exempt live shares</h2>
              <ul className="shop-cart-list">
                {resolved.shares.map(({ item, animal, priceCents }) => (
                  <li key={item.animalId} className="shop-cart-row">
                    <div>
                      <p className="shop-product-title">
                        {shareLabel(item.sharePct)} · {SPECIES_LABELS[animal.species]} {animal.tag}
                      </p>
                      <p className="shop-muted">Live animal share — not sold by the pound</p>
                    </div>
                    <div className="shop-cart-side">
                      <span className="shop-price">{money(priceCents)}</span>
                      <form action={removeCartItemAction}>
                        <input type="hidden" name="kind" value="share" />
                        <input type="hidden" name="id" value={item.animalId} />
                        <button type="submit" className="shop-text-btn">
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="shop-cart-footer">
            <p className="shop-total">
              Total <strong>{money(resolved.totalCents)}</strong>
            </p>
            <div className="shop-hero-cta">
              <Link href="/shop/checkout" className="shop-btn shop-btn-primary">
                Checkout
              </Link>
              <form action={clearCartAction}>
                <button type="submit" className="shop-btn shop-btn-ghost">
                  Clear cart
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
