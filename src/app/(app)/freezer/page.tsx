import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import { CHECKOUT_MODE_LABELS, PACKAGE_STATUS_LABELS } from "@/lib/labels";

export default async function FreezerPage() {
  const { farm } = await requireFarmContext();
  const packages = await prisma.freezerPackage.findMany({
    where: { farmId: farm.id },
    include: { animal: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title="Freezer"
        description="Thin stub: catch-weight packages generated from hanging yield, tagged by inspection path."
      />

      <div className="callout mb-4">
        Freezer inventory is seeded for demo. Yield rules and editable package creation are stubbed.
      </div>

      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Cut</th>
              <th>Weight</th>
              <th>Animal</th>
              <th>Inspection path</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted py-8 text-center">
                  No freezer packages yet.
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="font-semibold">{pkg.cutName}</td>
                  <td>{pkg.weightLbs.toFixed(1)} lb</td>
                  <td>{pkg.animal?.tag ?? "—"}</td>
                  <td>{CHECKOUT_MODE_LABELS[pkg.inspectionPath]}</td>
                  <td>{PACKAGE_STATUS_LABELS[pkg.status]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
