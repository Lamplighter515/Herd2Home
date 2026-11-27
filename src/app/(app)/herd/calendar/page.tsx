import Link from "next/link";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { PREGNANCY_STATUS_LABELS, SPECIES_LABELS, formatDate } from "@/lib/labels";

export default async function BreedingCalendarPage() {
  const { farm } = await requireFarmContext();
  const now = new Date();
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 90);

  const pregnancies = await prisma.pregnancy.findMany({
    where: {
      female: { farmId: farm.id },
      dueDate: { gte: now, lte: horizon },
      status: { in: ["BRED", "CONFIRMED"] },
    },
    include: {
      female: { select: { id: true, tag: true, name: true, species: true, animalClass: true } },
      breedingEvent: {
        include: { sire: { select: { tag: true, name: true } } },
      },
    },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Breeding calendar"
        description="Due dates in the next 90 days — light planning view for locker slots and calving watch."
      />

      <div className="mb-4">
        <Link href="/herd" className="btn btn-ghost">
          Back to herd
        </Link>
      </div>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Due</th>
              <th>Female</th>
              <th>Species</th>
              <th>Status</th>
              <th>Sire</th>
            </tr>
          </thead>
          <tbody>
            {pregnancies.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted py-8 text-center">
                  No confirmed/bred due dates in the next 90 days.
                </td>
              </tr>
            ) : (
              pregnancies.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold">{formatDate(p.dueDate)}</td>
                  <td>
                    <Link href={`/herd/${p.female.id}`} className="text-[var(--brand)]">
                      {p.female.tag}
                      {p.female.name ? ` (${p.female.name})` : ""}
                    </Link>
                  </td>
                  <td>{SPECIES_LABELS[p.female.species]}</td>
                  <td>{PREGNANCY_STATUS_LABELS[p.status]}</td>
                  <td>
                    {p.breedingEvent?.sire?.tag ??
                      p.breedingEvent?.sireName ??
                      "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
