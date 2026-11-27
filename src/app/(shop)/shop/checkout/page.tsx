import Link from "next/link";
import { redirect } from "next/navigation";
import { placeOrderAction } from "@/app/actions/shop";
import {
  money,
  packageLabel,
  readCart,
  resolveCart,
  shareLabel,
} from "@/lib/shop";
import { SPECIES_LABELS } from "@/lib/labels";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Checkout · Herd 2 Home",
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const cart = await readCart();
  const resolved = await resolveCart(cart);

  if (!resolved.farm || (resolved.retail.length === 0 && resolved.shares.length === 0)) {
    redirect("/shop/cart?error=empty");
  }
  if (resolved.errors.length > 0) {
    redirect("/shop/cart?error=stale");
  }

  const butchers = await prisma.butcher.findMany({
    where: { farmId: resolved.farm.id },
    orderBy: { name: "asc" },
  });

  return (
    <div className="shop-shell shop-section">
      <header className="shop-section-head">
        <h1>Checkout</h1>
        <p>
          {resolved.farm.name} · reserve your order. Stripe stays stubbed for the pilot; packages and
          shares are still held.
        </p>
      </header>

      {error === "name" ? (
        <p className="shop-error" role="alert">
          Enter your name.
        </p>
      ) : null}
      {error === "contact" ? (
        <p className="shop-error" role="alert">
          Add an email or phone so the farm can reach you.
        </p>
      ) : null}
      {error === "butcher" ? (
        <p className="shop-error" role="alert">
          Choose a butcher / locker for that pickup option.
        </p>
      ) : null}
      {error === "owners" ? (
        <p className="shop-error" role="alert">
          List at least one share owner name for each live share.
        </p>
      ) : null}

      <div className="shop-checkout-summary">
        {resolved.retail.map(({ pkg }) => (
          <p key={pkg.id}>
            <span>Retail · {packageLabel(pkg)}</span>
            <span>{money(pkg.priceCents)}</span>
          </p>
        ))}
        {resolved.shares.map(({ item, animal, priceCents }) => (
          <p key={animal.id}>
            <span>
              Live share · {shareLabel(item.sharePct)} {SPECIES_LABELS[animal.species]} {animal.tag}
            </span>
            <span>{money(priceCents)}</span>
          </p>
        ))}
        <p className="shop-checkout-total">
          <span>Total</span>
          <span>{money(resolved.totalCents)}</span>
        </p>
      </div>

      <form action={placeOrderAction} className="shop-checkout-form">
        <div className="shop-field">
          <label htmlFor="buyerName">Your name</label>
          <input id="buyerName" name="buyerName" required autoComplete="name" />
        </div>
        <div className="shop-field">
          <label htmlFor="buyerEmail">Email</label>
          <input id="buyerEmail" name="buyerEmail" type="email" autoComplete="email" />
        </div>
        <div className="shop-field">
          <label htmlFor="buyerPhone">Phone</label>
          <input id="buyerPhone" name="buyerPhone" type="tel" autoComplete="tel" />
        </div>

        <fieldset className="shop-pickup-fieldset">
          <legend>Pickup</legend>
          <label className="shop-share-option">
            <input type="radio" name="pickupType" value="FARM" defaultChecked />
            <span>
              <strong>On-farm pickup</strong>
              <em>
                {resolved.farm.city}, {resolved.farm.state}
              </em>
            </span>
          </label>
          {butchers.length > 0 ? (
            <label className="shop-share-option">
              <input type="radio" name="pickupType" value="BUTCHER" />
              <span>
                <strong>Butcher / locker pickup</strong>
                <em>Choose a locker below</em>
              </span>
            </label>
          ) : null}
        </fieldset>

        {butchers.length > 0 ? (
          <div className="shop-field">
            <label htmlFor="butcherId">Butcher / locker</label>
            <select id="butcherId" name="butcherId" defaultValue={butchers[0].id}>
              {butchers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.city}, {b.state}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {resolved.shares.map(({ animal, item }) => (
          <div key={animal.id} className="shop-field">
            <label htmlFor={`owners_${animal.id}`}>
              Share owners for {animal.tag} ({shareLabel(item.sharePct)})
            </label>
            <textarea
              id={`owners_${animal.id}`}
              name={`owners_${animal.id}`}
              rows={3}
              required
              placeholder="One name per line — required before slaughter"
            />
            <p className="shop-hint">
              Custom-exempt path: names go on the owner roster. Not a by-the-pound meat sale.
            </p>
          </div>
        ))}

        <div className="shop-field">
          <label htmlFor="notes">Notes (optional)</label>
          <textarea id="notes" name="notes" rows={3} placeholder="Preferred pickup window, etc." />
        </div>

        <div className="shop-pay-stub">
          <strong>Payment stub</strong>
          <p>
            Stripe capture is not live yet. Submitting reserves your retail packages and/or live
            share and stores a stub payment id for the pilot.
          </p>
        </div>

        <div className="shop-hero-cta">
          <button type="submit" className="shop-btn shop-btn-primary">
            Place reservation
          </button>
          <Link href="/shop/cart" className="shop-btn shop-btn-ghost">
            Back to cart
          </Link>
        </div>
      </form>
    </div>
  );
}
