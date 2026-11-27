import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createLotAction } from "@/app/actions/herd";
import {
  SPECIES_LABELS,
  STATUS_LABELS,
  statusBadgeClass,
} from "@/lib/labels";
import type { AnimalStatus, Species } from "@prisma/client";

export default async function HerdPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; species?: string; status?: string }>;
}) {
  const { farm } = await requireFarmContext();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const species = params.species as Species | undefined;
  const status = params.status as AnimalStatus | undefined;

  const animals = await prisma.animal.findMany({
    where: {
      farmId: farm.id,
      ...(species ? { species } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { tag: { contains: q } },
              { notes: { contains: q } },
              { lot: { name: { contains: q } } },
            ],
          }
        : {}),
    },
    include: { lot: true },
    orderBy: [{ tag: "asc" }],
  });

  const lots = await prisma.lot.findMany({
    where: { farmId: farm.id },
    include: { _count: { select: { animals: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Herd"
        description="Strong multi-species herd CRUD with pasture → locker → hanging → freezer → sold lifecycle. Search and filter by tag, species, or status."
        actionHref="/herd/new"
        actionLabel="Add animal"
      />

      <form className="card mb-4 flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <div className="field flex-1">
          <label htmlFor="q">Search</label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search tag, lot, notes"
          />
        </div>
        <div className="field">
          <label htmlFor="species">Species</label>
          <select id="species" name="species" defaultValue={species ?? ""}>
            <option value="">All species</option>
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
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn">
          Filter
        </button>
      </form>

      <div className="card table-wrap mb-6">
        <table className="data">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Species</th>
              <th>Sex</th>
              <th>Lot</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {animals.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted py-8 text-center">
                  No animals match these filters.
                </td>
              </tr>
            ) : (
              animals.map((animal) => (
                <tr key={animal.id}>
                  <td className="font-semibold">{animal.tag}</td>
                  <td>{SPECIES_LABELS[animal.species]}</td>
                  <td>{animal.sex}</td>
                  <td>{animal.lot?.name ?? "—"}</td>
                  <td>
                    <span className={`badge ${statusBadgeClass(animal.status)}`}>
                      {STATUS_LABELS[animal.status]}
                    </span>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl">Lots / groups</h2>
          <ul className="mt-4 space-y-2">
            {lots.length === 0 ? (
              <li className="muted">No lots yet.</li>
            ) : (
              lots.map((lot) => (
                <li key={lot.id} className="flex justify-between border-b border-[var(--line)] py-2">
                  <span>
                    {lot.name} — {SPECIES_LABELS[lot.species]}
                  </span>
                  <span className="muted">({lot._count.animals})</span>
                </li>
              ))
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
