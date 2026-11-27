import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { SPECIES_LABELS } from "@/lib/labels";

export default async function ProcessorPage() {
  const { farm } = await requireFarmContext();
  const jobs = await prisma.processorJob.findMany({
    where: { farmId: farm.id },
    include: {
      butcher: true,
      cutSheet: true,
      animals: { include: { animal: true } },
    },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Processor"
        description="Thin stub: locker booking, cut sheets, and hanging weight → expected freezer inventory."
      />

      <div className="callout mb-4">
        Processor jobs and cut sheets are seeded read-only in this scaffold. Full booking/yield
        workflows come next.
      </div>

      <div className="space-y-4">
        {jobs.length === 0 ? (
          <div className="card p-6 muted">No processor jobs for this farm yet.</div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">
                    {job.butcher?.name ?? "Unassigned locker"} ·{" "}
                    {job.scheduledDate.toLocaleDateString()}
                  </h2>
                  <p className="muted mt-1 text-sm">Status: {job.status}</p>
                </div>
                {job.hangingWeight != null ? (
                  <div className="text-sm font-semibold">
                    Hanging weight: {job.hangingWeight} lb
                  </div>
                ) : (
                  <div className="muted text-sm">Hanging weight not entered</div>
                )}
              </div>
              <p className="mt-3">{job.notes}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                    Animals
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {job.animals.map((link) => (
                      <li key={link.id}>
                        {link.animal.tag} ({SPECIES_LABELS[link.animal.species]})
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--muted)]">
                    Cut sheet
                  </h3>
                  {job.cutSheet ? (
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-[#f7f1e6] p-3 text-sm">
                      {JSON.stringify(JSON.parse(job.cutSheet.templateJson), null, 2)}
                    </pre>
                  ) : (
                    <p className="muted mt-2 text-sm">No cut sheet attached.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
