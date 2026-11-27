import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import {
  createLotAction,
  groupHealthAction,
  groupMoveLotAction,
} from "@/app/actions/herd";
import {
  CLASS_LABELS,
  SALE_PATH_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  formatMoney,
  statusBadgeClass,
} from "@/lib/labels";
import { activeWithdrawal, normalizeStatus } from "@/lib/herd";
import type { AnimalStatus, Species } from "@prisma/client";

export default async function HerdPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    species?: string;
    status?: string;
    lot?: string;
    sale?: string;
    withdrawal?: string;
    moved?: string;
    treated?: string;
  }>;
}) {
  const { farm } = await requireFarmContext();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const species = params.species as Species | undefined;
  const status = params.status as AnimalStatus | undefined;
  const lot = params.lot ?? "";
  const sale = params.sale ?? "";
  const withdrawalOnly = params.withdrawal === "1";

  const animals = await prisma.animal.findMany({
    where: {
      farmId: farm.id,
      ...(species ? { species } : {}),
      ...(status ? { status } : {}),
      ...(lot ? { lotId: lot } : {}),
      ...(sale === "1" ? { availableForSale: true } : {}),
      ...(sale === "0" ? { availableForSale: false } : {}),
      ...(q
        ? {
            OR: [
              { tag: { contains: q } },
              { name: { contains: q } },
              { eid: { contains: q } },
              { notes: { contains: q } },
              { lot: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      lot: true,
      healthEvents: {
        where: { meatWithdrawalEndsAt: { not: null } },
        orderBy: { meatWithdrawalEndsAt: "desc" },
        take: 3,
      },
    },
    orderBy: [{ tag: "asc" }],
  });

  const now = new Date();
  const filtered = withdrawalOnly
    ? animals.filter((a) => activeWithdrawal(a.healthEvents, now))
    : animals;

  const lots = await prisma.lot.findMany({
    where: { farmId: farm.id },
    include: {
      _count: { select: { animals: true } },
      animals: {
        select: {
          purchasePriceCents: true,
          costAllocations: { select: { amountCents: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Herd"
        description="Farm herd book: identity, lifecycle, sale path, weights, health withdrawals, breeding. Search tag / EID / name."
        actionHref="/herd/new"
        actionLabel="Add animal"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Link href="/herd/calendar" className="btn btn-ghost">
          Breeding calendar
        </Link>
        <Link href="/herd/costs" className="btn btn-ghost">
          Costs &amp; feed
        </Link>
        {params.moved ? (
          <span className="callout">Lot move saved.</span>
        ) : null}
        {params.treated ? (
          <span className="callout">Group treatment recorded.</span>
        ) : null}
      </div>

      <form className="card mb-4 grid gap-3 p-4 md:grid-cols-6 md:items-end">
        <div className="field md:col-span-2">
          <label htmlFor="q">Search tag / EID / name</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="C-101, 84000…, Daisy"
          />
        </div>
        <div className="field">
          <label htmlFor="species">Species</label>
          <select id="species" name="species" defaultValue={species ?? ""}>
            <option value="">All</option>
            {Object.entries(SPECIES_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            {STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="lot">Lot</label>
          <select id="lot" name="lot" defaultValue={lot}>
            <option value="">All lots</option>
            {lots.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sale">For sale</label>
          <select id="sale" name="sale" defaultValue={sale}>
            <option value="">Any</option>
            <option value="1">Listed</option>
            <option value="0">Not listed</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="withdrawal">Withdrawal</label>
          <select id="withdrawal" name="withdrawal" defaultValue={withdrawalOnly ? "1" : ""}>
            <option value="">Any</option>
            <option value="1">In withdrawal</option>
          </select>
        </div>
        <button type="submit" className="btn md:col-span-6 md:justify-self-start">
          Filter
        </button>
      </form>

      <form action={groupMoveLotAction} className="card mb-4 p-4">
        <h2 className="text-lg">Group lot move</h2>
        <p className="muted mb-3 text-sm">
          Select animals in the table, pick a destination lot, then move.
        </p>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="field flex-1">
            <label htmlFor="groupLotId">Destination lot</label>
            <select id="groupLotId" name="lotId" defaultValue="">
              <option value="">Unassign</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field flex-1">
            <label htmlFor="moveNotes">Notes</label>
            <input id="moveNotes" name="notes" placeholder="Pasture rotate" />
          </div>
          <button type="submit" className="btn">
            Move selected
          </button>
        </div>

        <div className="mt-6 border-t border-[var(--line)] pt-4">
          <h3 className="font-semibold">Group treat / vaccine</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="field">
              <label htmlFor="gType">Type</label>
              <select id="gType" name="type" defaultValue="VACCINE">
                <option value="VACCINE">Vaccine</option>
                <option value="TREATMENT">Treatment</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="gProduct">Product</label>
              <input id="gProduct" name="productName" placeholder="CattleMaster" />
            </div>
            <div className="field">
              <label htmlFor="gEventAt">Date</label>
              <input
                id="gEventAt"
                name="eventAt"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="field">
              <label htmlFor="gWithdraw">Meat withdrawal days</label>
              <input id="gWithdraw" name="withdrawalDays" type="number" min={0} placeholder="0" />
            </div>
          </div>
          <button formAction={groupHealthAction} type="submit" className="btn btn-ghost mt-3">
            Apply treatment to selected
          </button>
        </div>

        <div className="card table-wrap mt-6">
          <table className="data">
            <thead>
              <tr>
                <th></th>
                <th>Tag</th>
                <th>Class</th>
                <th>Lot</th>
                <th>Status</th>
                <th>Sale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted py-8 text-center">
                    No animals match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((animal) => {
                  const wd = activeWithdrawal(animal.healthEvents, now);
                  const status = normalizeStatus(animal.status);
                  return (
                    <tr key={animal.id}>
                      <td>
                        <input type="checkbox" name="animalIds" value={animal.id} />
                      </td>
                      <td>
                        <div className="font-semibold">{animal.tag}</div>
                        <div className="muted text-xs">
                          {animal.name ?? animal.eid ?? SPECIES_LABELS[animal.species]}
                        </div>
                      </td>
                      <td>{CLASS_LABELS[animal.animalClass]}</td>
                      <td>{animal.lot?.name ?? "—"}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass(status)}`}>
                          {STATUS_LABELS[status]}
                        </span>
                        {wd ? (
                          <div className="mt-1">
                            <span className="badge badge-withdrawal">In withdrawal</span>
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {animal.availableForSale ? (
                          <span className="text-sm font-semibold text-[var(--brand)]">
                            {SALE_PATH_LABELS[animal.salePath]}
                          </span>
                        ) : (
                          <span className="muted text-sm">—</span>
                        )}
                      </td>
                      <td>
                        <Link
                          href={`/herd/${animal.id}`}
                          className="font-semibold text-[var(--brand)]"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl">Lots / groups</h2>
          <ul className="mt-4 space-y-2">
            {lots.length === 0 ? (
              <li className="muted">No lots yet.</li>
            ) : (
              lots.map((lotRow) => {
                const basis = lotRow.animals.reduce(
                  (s, a) =>
                    s +
                    (a.purchasePriceCents ?? 0) +
                    a.costAllocations.reduce((x, c) => x + c.amountCents, 0),
                  0,
                );
                return (
                  <li
                    key={lotRow.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-2"
                  >
                    <div>
                      <Link
                        href={`/herd?lot=${lotRow.id}`}
                        className="font-semibold text-[var(--brand)]"
                      >
                        {lotRow.name} — {SPECIES_LABELS[lotRow.species]}
                      </Link>
                      <div className="muted text-xs">
                        Cost basis {formatMoney(basis)} ·{" "}
                        <Link href={`/herd/costs?lot=${lotRow.id}`} className="text-[var(--brand)]">
                          costs
                        </Link>
                      </div>
                    </div>
                    <span className="muted">({lotRow._count.animals})</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="text-xl">Add lot</h2>
          <form action={createLotAction} className="mt-4 flex flex-col gap-3">
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" placeholder="North Pasture" required />
            </div>
            <div className="field">
              <label htmlFor="lotSpecies">Species</label>
              <select id="lotSpecies" name="species" defaultValue="CATTLE">
                {Object.entries(SPECIES_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn self-start">
              Create lot
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
