import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createAnimalAction } from "@/app/actions/herd";
import { SPECIES_LABELS, STATUS_LABELS } from "@/lib/labels";

export default async function NewAnimalPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { farm } = await requireFarmContext();
  const params = await searchParams;
  const lots = await prisma.lot.findMany({
    where: { farmId: farm.id },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Add animal"
        description="Create a farm-scoped animal record with tag, species, sex, lot, and lifecycle status."
      />

      <div className="card max-w-2xl p-6">
        {params.error === "tag" ? (
          <p className="mb-4 text-sm font-semibold text-red-700">Tag is required.</p>
        ) : null}
        <form action={createAnimalAction} className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="tag">Tag / ID</label>
            <input id="tag" name="tag" placeholder="C-103" required />
          </div>
          <div className="field">
            <label htmlFor="sex">Sex</label>
            <input id="sex" name="sex" placeholder="heifer, steer, gilt…" required />
          </div>
          <div className="field">
            <label htmlFor="species">Species</label>
            <select id="species" name="species" defaultValue="CATTLE">
              {Object.entries(SPECIES_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="PASTURE">
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="lotId">Lot</label>
            <select id="lotId" name="lotId" defaultValue="">
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
            <input id="birthOrAcquired" name="birthOrAcquired" type="date" />
          </div>
          <div className="field sm:col-span-2">
            <label htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" rows={3} />
          </div>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" className="btn">
              Save animal
            </button>
            <Link href="/herd" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
