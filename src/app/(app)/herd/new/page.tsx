import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { createAnimalAction } from "@/app/actions/herd";
import {
  CLASS_LABELS,
  CLASSES_BY_SPECIES,
  SEX_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/labels";

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
  const parents = await prisma.animal.findMany({
    where: { farmId: farm.id },
    select: { id: true, tag: true, name: true, sexEnum: true, animalClass: true },
    orderBy: { tag: "asc" },
  });

  const allClasses = Object.keys(CLASS_LABELS) as (keyof typeof CLASS_LABELS)[];

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Add animal"
        description="Identity, class (heifer vs cow), optional EID, dam/sire, and starting lifecycle status."
      />

      <div className="card max-w-3xl p-6">
        {params.error === "tag" ? (
          <p className="mb-4 text-sm font-semibold text-red-700">Tag is required.</p>
        ) : null}
        <form action={createAnimalAction} className="grid gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="tag">Visual tag *</label>
            <input id="tag" name="tag" placeholder="C-103" required />
          </div>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" name="name" placeholder="Daisy" />
          </div>
          <div className="field">
            <label htmlFor="eid">EID / AIN</label>
            <input id="eid" name="eid" placeholder="84000…" />
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
            <label htmlFor="animalClass">Class / stage</label>
            <select id="animalClass" name="animalClass" defaultValue="HEIFER">
              {CLASSES_BY_SPECIES.CATTLE.map((value) => (
                <option key={value} value={value}>
                  {CLASS_LABELS[value]}
                </option>
              ))}
              <option disabled>——</option>
              {allClasses
                .filter((c) => !CLASSES_BY_SPECIES.CATTLE.includes(c))
                .map((value) => (
                  <option key={value} value={value}>
                    {CLASS_LABELS[value]}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sexEnum">Sex</label>
            <select id="sexEnum" name="sexEnum" defaultValue="FEMALE">
              {Object.entries(SEX_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="breed">Breed</label>
            <input id="breed" name="breed" placeholder="Angus cross" />
          </div>
          <div className="field">
            <label htmlFor="colorMarkings">Color / markings</label>
            <input id="colorMarkings" name="colorMarkings" />
          </div>
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="ON_FARM">
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
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
          <div className="field">
            <label htmlFor="damId">Dam</label>
            <select id="damId" name="damId" defaultValue="">
              <option value="">Unknown</option>
              {parents
                .filter((p) => p.sexEnum === "FEMALE")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.tag}
                    {p.name ? ` (${p.name})` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sireId">Sire (on farm)</label>
            <select id="sireId" name="sireId" defaultValue="">
              <option value="">Unknown / external</option>
              {parents
                .filter((p) => p.sexEnum === "MALE")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.tag}
                    {p.name ? ` (${p.name})` : ""}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sireName">Sire name (if external / AI)</label>
            <input id="sireName" name="sireName" placeholder="AI stud or bull name" />
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
