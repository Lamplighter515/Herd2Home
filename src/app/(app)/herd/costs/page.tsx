import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createCostEntryAction, deleteCostEntryAction } from "@/app/actions/costs";
import {
  COST_ALLOCATION_METHOD_HELP,
  COST_ALLOCATION_METHOD_LABELS,
  COST_CATEGORY_LABELS,
  SPECIES_LABELS,
  formatDate,
  formatMoney,
} from "@/lib/labels";
import type { CostAllocationMethod } from "@prisma/client";

export default async function HerdCostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lot?: string;
    created?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const { farm } = await requireFarmContext();
  const params = await searchParams;
  const filterLot = params.lot ?? "";

  const [lots, animals, entries] = await Promise.all([
    prisma.lot.findMany({
      where: { farmId: farm.id },
      include: {
        animals: {
          select: {
            id: true,
            tag: true,
            purchasePriceCents: true,
            costAllocations: { select: { amountCents: true } },
          },
        },
        _count: { select: { animals: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.animal.findMany({
      where: { farmId: farm.id },
      select: {
        id: true,
        tag: true,
        name: true,
        lotId: true,
        species: true,
        purchasePriceCents: true,
      },
      orderBy: { tag: "asc" },
    }),
    prisma.costEntry.findMany({
      where: {
        farmId: farm.id,
        ...(filterLot ? { lotId: filterLot } : {}),
      },
      include: {
        lot: { select: { name: true } },
        allocations: {
          include: { animal: { select: { id: true, tag: true } } },
          orderBy: { amountCents: "desc" },
        },
      },
      orderBy: { incurredAt: "desc" },
      take: 40,
    }),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const methods = Object.keys(COST_ALLOCATION_METHOD_LABELS) as CostAllocationMethod[];

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Herd costs"
        description="Purchase prices on animals; hay/feed and other farm expenses allocated across the herd. Default split is equal per head."
        actionHref="/herd"
        actionLabel="Back to herd"
      />

      {params.created ? (
        <div className="callout mb-4">Expense recorded and allocated.</div>
      ) : null}
      {params.deleted ? <div className="callout mb-4">Expense deleted.</div> : null}
      {params.error === "amount" ? (
        <div className="callout mb-4">Enter a valid dollar amount greater than zero.</div>
      ) : null}
      {params.error === "animals" ? (
        <div className="callout mb-4">No animals in scope. Pick a lot with animals or select animals.</div>
      ) : null}
      {params.error === "manual" ? (
        <div className="callout mb-4">Manual allocation needs a dollar amount on at least one animal.</div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl">Record expense</h2>
          <p className="muted mt-1 text-sm">
            Categories: hay, feed, vet, haul, processing, other. Choose how to divide the bill —
            equal per head is the default.
          </p>
          <form action={createCostEntryAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue="FEED">
                {Object.entries(COST_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="amount">Amount ($)</label>
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="240.00"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="incurredAt">Date</label>
              <input id="incurredAt" name="incurredAt" type="date" defaultValue={today} />
            </div>
            <div className="field">
              <label htmlFor="lotId">Lot scope (optional)</label>
              <select id="lotId" name="lotId" defaultValue="">
                <option value="">Whole farm (or pick animals)</option>
                {lots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} ({lot._count.animals})
                  </option>
                ))}
              </select>
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="allocationMethod">Allocation method</label>
              <select
                id="allocationMethod"
                name="allocationMethod"
                defaultValue="EQUAL_PER_HEAD"
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {COST_ALLOCATION_METHOD_LABELS[m]}
                    {m === "EQUAL_PER_HEAD" ? " (default)" : ""}
                  </option>
                ))}
              </select>
              <ul className="muted mt-2 space-y-1 text-xs">
                {methods.map((m) => (
                  <li key={m}>
                    <span className="font-semibold text-[var(--ink)]">
                      {COST_ALLOCATION_METHOD_LABELS[m]}:
                    </span>{" "}
                    {COST_ALLOCATION_METHOD_HELP[m]}
                  </li>
                ))}
              </ul>
            </div>
            <div className="field">
              <label htmlFor="periodStart">Period start (animal-days / gain)</label>
              <input id="periodStart" name="periodStart" type="date" defaultValue={today} />
            </div>
            <div className="field">
              <label htmlFor="periodEnd">Period end</label>
              <input id="periodEnd" name="periodEnd" type="date" defaultValue={today} />
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="description">Description</label>
              <input
                id="description"
                name="description"
                placeholder="Round bales — North Pasture"
              />
            </div>
            <div className="field sm:col-span-2">
              <label>Animals in scope (optional if lot selected)</label>
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-[var(--line)] p-3">
                {animals.length === 0 ? (
                  <p className="muted text-sm">No animals yet.</p>
                ) : (
                  animals.map((a) => (
                    <label key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                      <input type="checkbox" name="animalIds" value={a.id} />
                      <span className="font-semibold">{a.tag}</span>
                      <span className="muted">
                        {SPECIES_LABELS[a.species]}
                        {a.name ? ` · ${a.name}` : ""}
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <span className="muted text-xs">Manual $</span>
                        <input
                          name={`manual_${a.id}`}
                          type="text"
                          inputMode="decimal"
                          className="w-20"
                          placeholder="—"
                        />
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn">
                Save &amp; allocate
              </button>
            </div>
          </form>
        </div>

        <div className="card p-5">
          <h2 className="text-xl">Lot cost summaries</h2>
          <p className="muted mt-1 text-sm">
            Purchase prices + allocated expenses for animals currently in each lot. $/lb and margin
            roll up later with hanging weight and sales.
          </p>
          <ul className="mt-4 space-y-3">
            {lots.length === 0 ? (
              <li className="muted">No lots yet.</li>
            ) : (
              lots.map((lot) => {
                const purchase = lot.animals.reduce(
                  (s, a) => s + (a.purchasePriceCents ?? 0),
                  0,
                );
                const allocated = lot.animals.reduce(
                  (s, a) => s + a.costAllocations.reduce((x, c) => x + c.amountCents, 0),
                  0,
                );
                const basis = purchase + allocated;
                return (
                  <li
                    key={lot.id}
                    className="border-b border-[var(--line)] pb-3 last:border-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/herd?lot=${lot.id}`}
                        className="font-semibold text-[var(--brand)]"
                      >
                        {lot.name}
                      </Link>
                      <span className="text-sm font-semibold">{formatMoney(basis)}</span>
                    </div>
                    <div className="muted text-xs">
                      {lot._count.animals} head · purchase {formatMoney(purchase)} · allocated{" "}
                      {formatMoney(allocated)}
                    </div>
                    <Link
                      href={`/herd/costs?lot=${lot.id}`}
                      className="text-xs font-semibold text-[var(--brand)]"
                    >
                      Filter ledger to lot
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl">Cost ledger</h2>
          {filterLot ? (
            <Link href="/herd/costs" className="btn btn-ghost">
              Clear lot filter
            </Link>
          ) : null}
        </div>
        <div className="table-wrap mt-4">
          <table className="data min-w-[720px]">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Scope</th>
                <th>Allocations</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No expenses recorded yet.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap">{formatDate(e.incurredAt)}</td>
                    <td className="whitespace-nowrap">
                      {COST_CATEGORY_LABELS[e.category]}
                    </td>
                    <td className="whitespace-nowrap font-semibold">
                      {formatMoney(e.amountCents)}
                    </td>
                    <td className="whitespace-nowrap">
                      {COST_ALLOCATION_METHOD_LABELS[e.allocationMethod]}
                    </td>
                    <td>
                      {e.lot?.name ?? "Farm"}
                      {e.description ? (
                        <div className="muted text-xs">{e.description}</div>
                      ) : null}
                    </td>
                    <td>
                      {e.allocations.slice(0, 4).map((a) => (
                        <div key={a.id}>
                          <Link
                            href={`/herd/${a.animal.id}?tab=costs`}
                            className="text-[var(--brand)]"
                          >
                            {a.animal.tag}
                          </Link>{" "}
                          {formatMoney(a.amountCents)}
                        </div>
                      ))}
                      {e.allocations.length > 4 ? (
                        <div className="muted text-xs">
                          +{e.allocations.length - 4} more
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <form action={deleteCostEntryAction}>
                        <input type="hidden" name="id" value={e.id} />
                        <button type="submit" className="text-xs font-semibold text-red-700">
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
