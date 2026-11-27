import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { deleteAnimalAction, updateAnimalAction } from "@/app/actions/herd";
import { SPECIES_LABELS, STATUS_LABELS, statusBadgeClass } from "@/lib/labels";

export default async function AnimalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { farm } = await requireFarmContext();
  const { id } = await params;

  const animal = await prisma.animal.findFirst({
    where: { id, farmId: farm.id },
    include: { lot: true },
  });
  if (!animal) notFound();

  const lots = await prisma.lot.findMany({
    where: { farmId: farm.id },
    orderBy: { name: "asc" },
  });

  const birthValue = animal.birthOrAcquired
    ? animal.birthOrAcquired.toISOString().slice(0, 10)
    : "";

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title={animal.tag}
        description={`${SPECIES_LABELS[animal.species]} · ${animal.sex} · ${animal.lot?.name ?? "No lot"}`}
      />

      <div className="mb-4">
        <span className={`badge ${statusBadgeClass(animal.status)}`}>
          {STATUS_LABELS[animal.status]}
        </span>
      </div>

      <div className="card max-w-2xl p-6">
        <form action={updateAnimalAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={animal.id} />
          <div className="field">
            <label htmlFor="tag">Tag / ID</label>
            <input id="tag" name="tag" defaultValue={animal.tag} required />
          </div>
          <div className="field">
            <label htmlFor="sex">Sex</label>
            <input id="sex" name="sex" defaultValue={animal.sex} required />
          </div>
          <div className="field">
            <label htmlFor="species">Species</label>
            <select id="species" name="species" defaultValue={animal.species}>
              {Object.entries(SPECIES_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={animal.status}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lotId">Lot</label>
            <select id="lotId" name="lotId" defaultValue={animal.lotId ?? ""}>
              <option value="">No lot</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="birthOrAcquired">Birth / acquired</label>
            <input
              id="birthOrAcquired"
              name="birthOrAcquired"
              type="date"
              defaultValue={birthValue}
            />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={animal.notes ?? ""} />
          </div>
          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <button type="submit" className="btn">
              Save changes
            </button>
            <Link href="/herd" className="btn btn-ghost">
              Back to herd
            </Link>
          </div>
        </form>

        <form action={deleteAnimalAction} className="mt-6 border-t border-[var(--line)] pt-4">
          <input type="hidden" name="id" value={animal.id} />
          <button type="submit" className="text-sm font-semibold text-red-700">
            Delete animal
          </button>
        </form>
      </div>
    </div>
  );
}
