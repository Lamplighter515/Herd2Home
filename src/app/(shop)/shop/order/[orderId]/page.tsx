import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CHECKOUT_MODE_LABELS, PICKUP_LABELS } from "@/lib/labels";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ also?: string }>;
}) {
  const { orderId } = await params;
  const { also } = await searchParams;
  const alsoIds = also ? also.split(",").filter(Boolean) : [];

  const orders = await prisma.buyerOrder.findMany({
    where: { id: { in: [orderId, ...alsoIds] } },
    include: {
      farm: true,
      butcher: true,
      items: true,
      shareOwners: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (orders.length === 0) notFound();
  const primary = orders[0];

  return (
    <div className="shop-shell shop-section shop-confirm">
      <p className="shop-kicker">Reservation confirmed</p>
      <h1>Thanks, {primary.buyerName}</h1>
      <p className="shop-hero-lede">
        {primary.farm.name} has your order. Payment is stubbed for the pilot — inventory and share
        roster are reserved.
      </p>

      {orders.map((order) => (
        <section key={order.id} className="shop-confirm-block">
          <h2>{CHECKOUT_MODE_LABELS[order.checkoutMode]}</h2>
          <p className="shop-muted">
            {PICKUP_LABELS[order.pickupType]}
            {order.butcher ? ` · ${order.butcher.name}` : ` · ${order.farm.city}`} · {order.status}
          </p>
          <p className="shop-mono">Ref {order.id}</p>
          {order.stripePaymentIntentId ? (
            <p className="shop-mono shop-muted">Stripe stub · {order.stripePaymentIntentId}</p>
          ) : null}

          {order.items.length > 0 ? (
            <ul className="shop-confirm-list">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.label} × {item.quantity}
                </li>
              ))}
            </ul>
          ) : null}

          {order.shareOwners.length > 0 ? (
            <div>
              <h3>Share owners</h3>
              <ul className="shop-confirm-list">
                {order.shareOwners.map((owner) => (
                  <li key={owner.id}>
                    {owner.name} — {owner.sharePct}%
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}

      <div className="shop-hero-cta">
        <Link href={`/shop/${primary.farm.slug}`} className="shop-btn shop-btn-primary">
          Back to {primary.farm.name}
        </Link>
        <Link href="/shop" className="shop-btn shop-btn-ghost">
          All farms
        </Link>
      </div>
    </div>
  );
}
