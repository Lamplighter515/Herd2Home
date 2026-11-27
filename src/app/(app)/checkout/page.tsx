import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { CHECKOUT_MODE_LABELS, PICKUP_LABELS } from "@/lib/labels";

export default async function CheckoutPage() {
  const { farm } = await requireFarmContext();
  const orders = await prisma.buyerOrder.findMany({
    where: { farmId: farm.id },
    include: {
      butcher: true,
      items: true,
      shareOwners: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Checkout"
        description="Thin stub: inspected retail cuts and custom-exempt live shares, with farm or butcher pickup."
      />

      <div className="callout mb-4">
        Stripe is stubbed — orders may store a <code>stripePaymentIntentId</code> without capture.
        Custom-exempt rows keep an owner roster before slaughter.
      </div>

      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="card p-6 muted">No buyer orders yet.</div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{order.buyerName}</h2>
                  <p className="muted mt-1 text-sm">
                    {CHECKOUT_MODE_LABELS[order.checkoutMode]} · {PICKUP_LABELS[order.pickupType]} ·{" "}
                    {order.status}
                  </p>
                </div>
                <div className="text-sm">
                  {order.stripePaymentIntentId ? (
                    <span className="font-mono text-[var(--muted)]">
                      {order.stripePaymentIntentId}
                    </span>
                  ) : (
                    <span className="muted">No Stripe id</span>
                  )}
                </div>
              </div>
              {order.notes ? <p className="mt-3">{order.notes}</p> : null}
              {order.butcher ? (
                <p className="muted mt-2 text-sm">Locker: {order.butcher.name}</p>
              ) : null}

              {order.items.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                    Items
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.label} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {order.shareOwners.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                    Share owners (custom-exempt)
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {order.shareOwners.map((owner) => (
                      <li key={owner.id}>
                        {owner.name} — {owner.sharePct}%
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
