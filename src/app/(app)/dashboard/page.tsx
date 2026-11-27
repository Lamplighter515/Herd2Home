import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/labels";

export default async function DashboardPage() {
  const { farm } = await requireFarmContext();

  const [animals, jobs, packages, orders] = await Promise.all([
    prisma.animal.findMany({ where: { farmId: farm.id } }),
    prisma.processorJob.count({ where: { farmId: farm.id } }),
    prisma.freezerPackage.count({
      where: { farmId: farm.id, status: "AVAILABLE" },
    }),
    prisma.buyerOrder.count({ where: { farmId: farm.id } }),
  ]);

  const byStatus = STATUS_ORDER.map((status) => ({
    status,
    count: animals.filter((a) => a.status === status).length,
  }));

  const stats = [
    { label: "Herd animals", value: animals.length },
    { label: "Processor jobs", value: jobs },
    { label: "Freezer packages available", value: packages },
    { label: "Buyer orders", value: orders },
  ];

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Dashboard"
        description={`Thin end-to-end spine for ${farm.name} (${farm.county}, ${farm.state}): herd → processor → freezer → pickup.`}
        actionHref="/herd/new"
        actionLabel="Add animal"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="text-3xl font-semibold text-[var(--brand)]">{stat.value}</div>
            <div className="muted mt-1 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl">Herd by status</h2>
          <ul className="mt-4 space-y-3">
            {byStatus.map((row) => (
              <li key={row.status} className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                <span className="muted">{STATUS_LABELS[row.status]}</span>
                <span className="text-lg font-semibold">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-xl">Quick links</h2>
          <ul className="mt-4 space-y-2 font-semibold text-[var(--brand)]">
            <li>
              <Link href="/herd">Manage herd</Link>
            </li>
            <li>
              <Link href="/herd/calendar">Breeding calendar</Link>
            </li>
            <li>
              <Link href="/processor">Processor jobs & cut sheets</Link>
            </li>
            <li>
              <Link href="/freezer">Freezer inventory</Link>
            </li>
            <li>
              <Link href="/butchers">Butcher profiles</Link>
            </li>
            <li>
              <Link href="/checkout">Checkout modes</Link>
            </li>
          </ul>
          <div className="callout mt-5">
            Stripe is stubbed (<code>stripePaymentIntentId</code> stored, no capture). SMS reminders
            and shipping are out of scope for this PR.
          </div>
          <p className="muted mt-4 text-sm">
            Herd v1.1: on farm → reserved share → booked/at locker → hanging → freezer → sold
            (plus dead/culled). Sale path + withdrawal gates feed storefront rules.
          </p>
        </div>
      </div>
    </div>
  );
}
