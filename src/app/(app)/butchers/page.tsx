import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { formatMoney } from "@/lib/labels";

export default async function ButchersPage() {
  const { farm } = await requireFarmContext();
  const butchers = await prisma.butcher.findMany({
    where: { farmId: farm.id },
    include: { prices: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Butchers"
        description="Thin stub: butcher profiles with basic pricing selectable at sale time."
      />

      <div className="space-y-4">
        {butchers.length === 0 ? (
          <div className="card p-6 muted">No butchers linked to this farm yet.</div>
        ) : (
          butchers.map((butcher) => (
            <div key={butcher.id} className="card p-5">
              <h2 className="text-xl">{butcher.name}</h2>
              <p className="muted mt-1">
                {butcher.city}, {butcher.state}
                {butcher.phone ? ` · ${butcher.phone}` : ""}
              </p>
              {butcher.notes ? <p className="mt-2">{butcher.notes}</p> : null}
              <div className="mt-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                  Price list
                </h3>
                <ul className="mt-2 space-y-1">
                  {butcher.prices.map((price) => (
                    <li key={price.id} className="flex justify-between border-b border-[var(--line)] py-2">
                      <span>
                        {price.label}{" "}
                        <span className="muted">/ {price.unit}</span>
                      </span>
                      <span className="font-semibold">{formatMoney(price.priceCents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
