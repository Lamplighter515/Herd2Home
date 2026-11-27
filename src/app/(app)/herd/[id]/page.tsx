import Link from "next/link";
import { notFound } from "next/navigation";
import { requireFarmContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/PageHeader";
import {
  addBreedingAction,
  addHealthEventAction,
  addShareRosterAction,
  addWeightAction,
  deleteAnimalAction,
  moveAnimalStatusAction,
  recordBirthAction,
  removeShareRosterAction,
  updateAnimalAction,
  updatePregnancyAction,
  updateSaleFlagsAction,
} from "@/app/actions/herd";
import {
  BREEDING_METHOD_LABELS,
  CLASS_LABELS,
  CLASSES_BY_SPECIES,
  COST_ALLOCATION_METHOD_LABELS,
  COST_CATEGORY_LABELS,
  HEALTH_TYPE_LABELS,
  PREGNANCY_STATUS_LABELS,
  SALE_BLOCK_LABELS,
  SALE_PATH_LABELS,
  SEX_LABELS,
  SHARE_PORTION_LABELS,
  SPECIES_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  WEIGHT_SOURCE_LABELS,
  WEIGHT_TYPE_LABELS,
  formatDate,
  formatMoney,
  statusBadgeClass,
} from "@/lib/labels";
import {
  activeWithdrawal,
  canProcessOrSell,
  normalizeStatus,
} from "@/lib/herd";
import { centsToDollarInput } from "@/lib/costs";

const TABS = [
  { id: "timeline", label: "Timeline" },
  { id: "edit", label: "Edit" },
  { id: "costs", label: "Costs" },
  { id: "weights", label: "Weights" },
  { id: "health", label: "Health" },
  { id: "breeding", label: "Breeding" },
  { id: "sale", label: "Sale / share" },
  { id: "status", label: "Move status" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default async function AnimalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const { farm } = await requireFarmContext();
  const { id } = await params;
  const sp = await searchParams;
  const tab = (TABS.some((t) => t.id === sp.tab) ? sp.tab : "timeline") as TabId;

  const animal = await prisma.animal.findFirst({
    where: { id, farmId: farm.id },
    include: {
      lot: true,
      dam: { select: { id: true, tag: true, name: true } },
      sire: { select: { id: true, tag: true, name: true } },
      offspring: { select: { id: true, tag: true, sexEnum: true, animalClass: true, birthOrAcquired: true } },
      statusHistory: { orderBy: { changedAt: "desc" } },
      weightEvents: { orderBy: { weighedAt: "desc" } },
      healthEvents: { orderBy: { eventAt: "desc" } },
      breedingAsFemale: {
        orderBy: { createdAt: "desc" },
        include: { sire: { select: { tag: true, name: true } }, pregnancy: true },
      },
      pregnancies: { orderBy: { dueDate: "asc" } },
      shareSlotsRoster: { orderBy: { createdAt: "asc" } },
      jobLinks: {
        include: {
          job: { include: { butcher: true, cutSheet: true } },
        },
      },
      costAllocations: {
        include: {
          costEntry: {
            include: { lot: { select: { name: true } } },
          },
        },
        orderBy: { costEntry: { incurredAt: "desc" } },
      },
    },
  });
  if (!animal) notFound();

  const allocatedCents = animal.costAllocations.reduce((s, a) => s + a.amountCents, 0);
  const purchaseCents = animal.purchasePriceCents ?? 0;
  const costBasisCents = purchaseCents + allocatedCents;
  const hangingWeight = animal.weightEvents.find((w) => w.type === "HANGING")?.weightLb;
  const lastLiveWeight = animal.weightEvents.find(
    (w) => w.type !== "HANGING",
  )?.weightLb;
  const weightForStub = hangingWeight ?? lastLiveWeight;
  const perLbStub =
    weightForStub && weightForStub > 0
      ? costBasisCents / weightForStub
      : null;

  const lots = await prisma.lot.findMany({
    where: { farmId: farm.id },
    orderBy: { name: "asc" },
  });
  const herdPeers = await prisma.animal.findMany({
    where: { farmId: farm.id, id: { not: animal.id } },
    select: { id: true, tag: true, name: true, sexEnum: true, animalClass: true },
    orderBy: { tag: "asc" },
  });

  const status = normalizeStatus(animal.status);
  const withdrawal = activeWithdrawal(animal.healthEvents);
  const gate = canProcessOrSell(animal, {
    withdrawalEndsAt: withdrawal?.meatWithdrawalEndsAt,
    rosterCount: animal.shareSlotsRoster.length,
  });

  const birthValue = animal.birthOrAcquired
    ? animal.birthOrAcquired.toISOString().slice(0, 10)
    : "";
  const today = new Date().toISOString().slice(0, 10);

  const timeline = [
    ...animal.statusHistory.map((h) => ({
      at: h.changedAt,
      kind: "status" as const,
      title: `${h.fromStatus ? STATUS_LABELS[normalizeStatus(h.fromStatus)] + " → " : ""}${STATUS_LABELS[normalizeStatus(h.toStatus)]}`,
      detail: h.notes,
    })),
    ...animal.weightEvents.map((w) => ({
      at: w.weighedAt,
      kind: "weight" as const,
      title: `${w.weightLb} lb · ${WEIGHT_TYPE_LABELS[w.type]}`,
      detail: w.notes,
    })),
    ...animal.healthEvents.map((h) => ({
      at: h.eventAt,
      kind: "health" as const,
      title: `${HEALTH_TYPE_LABELS[h.type]}${h.productName ? ` · ${h.productName}` : ""}`,
      detail: h.meatWithdrawalEndsAt
        ? `Withdrawal ends ${formatDate(h.meatWithdrawalEndsAt)}${h.notes ? ` — ${h.notes}` : ""}`
        : h.notes,
    })),
    ...animal.breedingAsFemale.map((b) => ({
      at: b.aiDate ?? b.exposureStart ?? b.createdAt,
      kind: "breeding" as const,
      title: `Breeding · ${BREEDING_METHOD_LABELS[b.method]}`,
      detail: b.sire?.tag ?? b.sireName ?? b.notes,
    })),
    ...animal.jobLinks.map((j) => ({
      at: j.job.scheduledDate,
      kind: "job" as const,
      title: `Processor job · ${j.job.status}`,
      detail: `${j.job.butcher?.name ?? "No butcher"} · ${j.job.notes ?? ""}`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <div>
      <PageHeader
        farmName={farm.name}
        title={animal.tag}
        description={`${SPECIES_LABELS[animal.species]} · ${CLASS_LABELS[animal.animalClass]} · ${animal.lot?.name ?? "No lot"}`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`badge ${statusBadgeClass(status)}`}>{STATUS_LABELS[status]}</span>
        {animal.availableForSale ? (
          <span className="badge badge-sale">{SALE_PATH_LABELS[animal.salePath]}</span>
        ) : null}
        {withdrawal ? (
          <span className="badge badge-withdrawal">
            Withdrawal until {formatDate(withdrawal.meatWithdrawalEndsAt)}
          </span>
        ) : null}
        {animal.eid ? <span className="muted text-sm">EID {animal.eid}</span> : null}
        {animal.name ? <span className="muted text-sm">“{animal.name}”</span> : null}
      </div>

      {sp.error === "withdrawal" ? (
        <div className="callout mb-4">
          Blocked by active meat withdrawal. Use override + reason on Sale or Move status if you must proceed.
        </div>
      ) : null}
      {!gate.ok ? (
        <div className="callout mb-4">
          Sale/process blockers:{" "}
          {gate.reasons.map((r) => SALE_BLOCK_LABELS[r] ?? r).join("; ")}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/herd/${animal.id}?tab=${t.id}`}
            className="nav-link"
            data-active={tab === t.id ? "true" : "false"}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/herd" className="btn btn-ghost ml-auto">
          Back to herd
        </Link>
      </div>

      {tab === "timeline" ? (
        <div className="card p-5">
          <h2 className="text-xl">Animal timeline</h2>
          <p className="muted mt-1 text-sm">
            Status, weights, health, breeding, and processor jobs in one place.
          </p>
          <ul className="mt-5 space-y-3">
            {timeline.length === 0 ? (
              <li className="muted">No events yet.</li>
            ) : (
              timeline.map((item, i) => (
                <li
                  key={`${item.kind}-${item.at.toISOString()}-${i}`}
                  className="border-b border-[var(--line)] pb-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{item.title}</span>
                    <span className="muted text-sm">{formatDate(item.at)}</span>
                  </div>
                  {item.detail ? <p className="muted mt-1 text-sm">{item.detail}</p> : null}
                  <span className="badge mt-2 badge-pasture">{item.kind}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold">Parentage</h3>
              <p className="muted text-sm">
                Dam:{" "}
                {animal.dam ? (
                  <Link href={`/herd/${animal.dam.id}`} className="text-[var(--brand)]">
                    {animal.dam.tag}
                  </Link>
                ) : (
                  "—"
                )}
                <br />
                Sire:{" "}
                {animal.sire ? (
                  <Link href={`/herd/${animal.sire.id}`} className="text-[var(--brand)]">
                    {animal.sire.tag}
                  </Link>
                ) : (
                  animal.sireName ?? "—"
                )}
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Offspring</h3>
              {animal.offspring.length === 0 ? (
                <p className="muted text-sm">None recorded</p>
              ) : (
                <ul className="text-sm">
                  {animal.offspring.map((o) => (
                    <li key={o.id}>
                      <Link href={`/herd/${o.id}`} className="text-[var(--brand)]">
                        {o.tag}
                      </Link>{" "}
                      · {CLASS_LABELS[o.animalClass]} · {formatDate(o.birthOrAcquired)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "edit" ? (
        <div className="card max-w-3xl p-6">
          <form action={updateAnimalAction} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="id" value={animal.id} />
            <div className="field">
              <label htmlFor="tag">Tag</label>
              <input id="tag" name="tag" defaultValue={animal.tag} required />
            </div>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" name="name" defaultValue={animal.name ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="eid">EID / AIN</label>
              <input id="eid" name="eid" defaultValue={animal.eid ?? ""} />
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
              <label htmlFor="animalClass">Class / stage</label>
              <select id="animalClass" name="animalClass" defaultValue={animal.animalClass}>
                {(CLASSES_BY_SPECIES[animal.species] ?? Object.keys(CLASS_LABELS)).map((value) => (
                  <option key={value} value={value}>
                    {CLASS_LABELS[value as keyof typeof CLASS_LABELS]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sexEnum">Sex</label>
              <select id="sexEnum" name="sexEnum" defaultValue={animal.sexEnum}>
                {Object.entries(SEX_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="breed">Breed</label>
              <input id="breed" name="breed" defaultValue={animal.breed ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="colorMarkings">Color / markings</label>
              <input
                id="colorMarkings"
                name="colorMarkings"
                defaultValue={animal.colorMarkings ?? ""}
              />
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
            <div className="field">
              <label htmlFor="purchasePrice">Purchase / acquisition ($)</label>
              <input
                id="purchasePrice"
                name="purchasePrice"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                defaultValue={centsToDollarInput(animal.purchasePriceCents)}
              />
            </div>
            <div className="field">
              <label htmlFor="damId">Dam</label>
              <select id="damId" name="damId" defaultValue={animal.damId ?? ""}>
                <option value="">Unknown</option>
                {herdPeers
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
              <label htmlFor="sireId">Sire</label>
              <select id="sireId" name="sireId" defaultValue={animal.sireId ?? ""}>
                <option value="">Unknown / external</option>
                {herdPeers
                  .filter((p) => p.sexEnum === "MALE")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tag}
                      {p.name ? ` (${p.name})` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="sireName">External / AI sire name</label>
              <input id="sireName" name="sireName" defaultValue={animal.sireName ?? ""} />
            </div>
            <div className="field sm:col-span-2">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows={3} defaultValue={animal.notes ?? ""} />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn">
                Save identity
              </button>
            </div>
          </form>
          <form action={deleteAnimalAction} className="mt-6 border-t border-[var(--line)] pt-4">
            <input type="hidden" name="id" value={animal.id} />
            <button type="submit" className="text-sm font-semibold text-red-700">
              Delete animal
            </button>
          </form>
        </div>
      ) : null}

      {tab === "costs" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl">Cost basis</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
                <dt className="muted">Purchase / acquisition</dt>
                <dd className="font-semibold">
                  {animal.purchasePriceCents != null
                    ? formatMoney(animal.purchasePriceCents)
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
                <dt className="muted">Allocated expenses</dt>
                <dd className="font-semibold">{formatMoney(allocatedCents)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="font-semibold">Total basis</dt>
                <dd className="text-lg font-semibold">{formatMoney(costBasisCents)}</dd>
              </div>
            </dl>
            <p className="muted mt-3 text-xs">
              $/lb &amp; margin — stub only. With{" "}
              {hangingWeight
                ? `hanging weight ${hangingWeight} lb`
                : lastLiveWeight
                  ? `last live weight ${lastLiveWeight} lb`
                  : "no weight yet"}
              {perLbStub != null
                ? `: ~${formatMoney(Math.round(perLbStub))}/lb basis. Full margin vs sale lands with freezer/checkout rollup.`
                : ". Add hanging or live weight to preview $/lb."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/herd/${animal.id}?tab=edit`} className="btn btn-ghost">
                Edit purchase price
              </Link>
              <Link href="/herd/costs" className="btn">
                Record farm expense
              </Link>
            </div>
          </div>
          <div className="card p-5">
            <h2 className="text-xl">Allocated expenses</h2>
            {animal.costAllocations.length === 0 ? (
              <p className="muted mt-3 text-sm">No allocated hay/feed or other costs yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {animal.costAllocations.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--line)] py-2 text-sm"
                  >
                    <div>
                      <div className="font-semibold">
                        {COST_CATEGORY_LABELS[a.costEntry.category]} ·{" "}
                        {formatDate(a.costEntry.incurredAt)}
                      </div>
                      <div className="muted text-xs">
                        {COST_ALLOCATION_METHOD_LABELS[a.costEntry.allocationMethod]}
                        {a.costEntry.lot?.name ? ` · ${a.costEntry.lot.name}` : ""}
                        {a.costEntry.description ? ` — ${a.costEntry.description}` : ""}
                      </div>
                    </div>
                    <div className="font-semibold">{formatMoney(a.amountCents)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {tab === "weights" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl">Add weight</h2>
            <form action={addWeightAction} className="mt-4 grid gap-3">
              <input type="hidden" name="animalId" value={animal.id} />
              <div className="field">
                <label htmlFor="weightLb">Weight (lb)</label>
                <input id="weightLb" name="weightLb" type="number" step="0.1" required />
              </div>
              <div className="field">
                <label htmlFor="weighedAt">Date</label>
                <input id="weighedAt" name="weighedAt" type="date" defaultValue={today} />
              </div>
              <div className="field">
                <label htmlFor="type">Type</label>
                <select id="type" name="type" defaultValue="PERIODIC">
                  {Object.entries(WEIGHT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="source">Source</label>
                <select id="source" name="source" defaultValue="SCALE">
                  {Object.entries(WEIGHT_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="wnotes">Notes</label>
                <input id="wnotes" name="notes" />
              </div>
              <button type="submit" className="btn self-start">
                Save weight
              </button>
            </form>
          </div>
          <div className="card p-5">
            <h2 className="text-xl">History</h2>
            <ul className="mt-4 space-y-2">
              {animal.weightEvents.length === 0 ? (
                <li className="muted">No weights yet.</li>
              ) : (
                animal.weightEvents.map((w) => (
                  <li key={w.id} className="flex justify-between border-b border-[var(--line)] py-2">
                    <span>
                      <strong>{w.weightLb} lb</strong> · {WEIGHT_TYPE_LABELS[w.type]}
                    </span>
                    <span className="muted text-sm">{formatDate(w.weighedAt)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "health" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl">Record treatment / vet</h2>
            <form action={addHealthEventAction} className="mt-4 grid gap-3">
              <input type="hidden" name="animalId" value={animal.id} />
              <div className="field">
                <label htmlFor="htype">Type</label>
                <select id="htype" name="type" defaultValue="TREATMENT">
                  {Object.entries(HEALTH_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="productName">Product / drug</label>
                <input id="productName" name="productName" />
              </div>
              <div className="field">
                <label htmlFor="eventAt">Date</label>
                <input id="eventAt" name="eventAt" type="date" defaultValue={today} />
              </div>
              <div className="field">
                <label htmlFor="withdrawalDays">Meat withdrawal days</label>
                <input id="withdrawalDays" name="withdrawalDays" type="number" min={0} />
              </div>
              <div className="field">
                <label htmlFor="dose">Dose</label>
                <input id="dose" name="dose" />
              </div>
              <div className="field">
                <label htmlFor="route">Route</label>
                <input id="route" name="route" placeholder="IM / SQ / oral" />
              </div>
              <div className="field">
                <label htmlFor="vetName">Vet</label>
                <input id="vetName" name="vetName" />
              </div>
              <div className="field">
                <label htmlFor="hnotes">Notes</label>
                <textarea id="hnotes" name="notes" rows={2} />
              </div>
              <button type="submit" className="btn self-start">
                Save health event
              </button>
            </form>
          </div>
          <div className="card p-5">
            <h2 className="text-xl">Health history</h2>
            <ul className="mt-4 space-y-3">
              {animal.healthEvents.length === 0 ? (
                <li className="muted">No health events.</li>
              ) : (
                animal.healthEvents.map((h) => (
                  <li key={h.id} className="border-b border-[var(--line)] pb-3">
                    <div className="font-semibold">
                      {HEALTH_TYPE_LABELS[h.type]}
                      {h.productName ? ` · ${h.productName}` : ""}
                    </div>
                    <div className="muted text-sm">{formatDate(h.eventAt)}</div>
                    {h.meatWithdrawalEndsAt ? (
                      <div className="mt-1">
                        <span
                          className={`badge ${
                            h.meatWithdrawalEndsAt > new Date()
                              ? "badge-withdrawal"
                              : "badge-pasture"
                          }`}
                        >
                          Withdrawal ends {formatDate(h.meatWithdrawalEndsAt)}
                        </span>
                      </div>
                    ) : null}
                    {h.notes ? <p className="muted mt-1 text-sm">{h.notes}</p> : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "breeding" ? (
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h2 className="text-xl">Record breeding</h2>
              <form action={addBreedingAction} className="mt-4 grid gap-3">
                <input type="hidden" name="femaleId" value={animal.id} />
                <div className="field">
                  <label htmlFor="method">Method</label>
                  <select id="method" name="method" defaultValue="NATURAL">
                    {Object.entries(BREEDING_METHOD_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="bsireId">Sire (on farm)</label>
                  <select id="bsireId" name="sireId" defaultValue="">
                    <option value="">External / AI name</option>
                    {herdPeers
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
                  <label htmlFor="bsireName">Sire name</label>
                  <input id="bsireName" name="sireName" />
                </div>
                <div className="field">
                  <label htmlFor="exposureStart">Exposure / AI date</label>
                  <input id="exposureStart" name="exposureStart" type="date" defaultValue={today} />
                </div>
                <div className="field">
                  <label htmlFor="aiDate">AI date (if AI)</label>
                  <input id="aiDate" name="aiDate" type="date" />
                </div>
                <div className="field">
                  <label htmlFor="dueDate">Due date (optional override)</label>
                  <input id="dueDate" name="dueDate" type="date" />
                </div>
                <button type="submit" className="btn self-start">
                  Save breeding
                </button>
              </form>
            </div>

            <div className="card p-5">
              <h2 className="text-xl">Record birth / calf</h2>
              <p className="muted text-sm">
                Captures sex at birth + sire; heifer→cow (or gilt→sow) on dam.
              </p>
              <form action={recordBirthAction} className="mt-4 grid gap-3">
                <input type="hidden" name="damId" value={animal.id} />
                <input
                  type="hidden"
                  name="pregnancyId"
                  value={
                    animal.pregnancies.find((p) => p.status === "BRED" || p.status === "CONFIRMED")
                      ?.id ?? ""
                  }
                />
                <div className="field">
                  <label htmlFor="ctag">Calf tag *</label>
                  <input id="ctag" name="tag" required placeholder="C-202" />
                </div>
                <div className="field">
                  <label htmlFor="csex">Sex</label>
                  <select id="csex" name="sexEnum" defaultValue="FEMALE">
                    {Object.entries(SEX_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cclass">Class</label>
                  <select id="cclass" name="animalClass" defaultValue="CALF">
                    {(CLASSES_BY_SPECIES[animal.species] ?? ["CALF", "OTHER"]).map((value) => (
                      <option key={value} value={value}>
                        {CLASS_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="birthDate">Birth date</label>
                  <input id="birthDate" name="birthDate" type="date" defaultValue={today} />
                </div>
                <div className="field">
                  <label htmlFor="birthWeight">Birth weight (lb)</label>
                  <input id="birthWeight" name="birthWeight" type="number" step="0.1" />
                </div>
                <div className="field">
                  <label htmlFor="csireId">Sire</label>
                  <select id="csireId" name="sireId" defaultValue={animal.sireId ?? ""}>
                    <option value="">From breeding / name</option>
                    {herdPeers
                      .filter((p) => p.sexEnum === "MALE")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.tag}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="csireName">Sire name</label>
                  <input id="csireName" name="sireName" defaultValue={animal.sireName ?? ""} />
                </div>
                <button type="submit" className="btn self-start">
                  Create offspring
                </button>
              </form>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-xl">Pregnancies</h2>
            <ul className="mt-4 space-y-4">
              {animal.pregnancies.length === 0 ? (
                <li className="muted">No pregnancies recorded.</li>
              ) : (
                animal.pregnancies.map((p) => (
                  <li key={p.id} className="border-b border-[var(--line)] pb-4">
                    <div className="font-semibold">
                      {PREGNANCY_STATUS_LABELS[p.status]} · due {formatDate(p.dueDate)}
                    </div>
                    <form action={updatePregnancyAction} className="mt-3 grid gap-3 sm:grid-cols-4">
                      <input type="hidden" name="pregnancyId" value={p.id} />
                      <input type="hidden" name="femaleId" value={animal.id} />
                      <div className="field">
                        <label>Status</label>
                        <select name="status" defaultValue={p.status}>
                          {Object.entries(PREGNANCY_STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>Due</label>
                        <input
                          name="dueDate"
                          type="date"
                          defaultValue={p.dueDate ? p.dueDate.toISOString().slice(0, 10) : ""}
                        />
                      </div>
                      <div className="field">
                        <label>Check date</label>
                        <input
                          name="checkDate"
                          type="date"
                          defaultValue={p.checkDate ? p.checkDate.toISOString().slice(0, 10) : ""}
                        />
                      </div>
                      <div className="field">
                        <label>Check result</label>
                        <input name="checkResult" defaultValue={p.checkResult ?? ""} />
                      </div>
                      <button type="submit" className="btn btn-ghost self-end">
                        Update
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "sale" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <h2 className="text-xl">Available for sale</h2>
            <form action={updateSaleFlagsAction} className="mt-4 grid gap-3">
              <input type="hidden" name="id" value={animal.id} />
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  name="availableForSale"
                  defaultChecked={animal.availableForSale}
                />
                Listed / available for sale
              </label>
              <div className="field">
                <label htmlFor="salePath">Sale path</label>
                <select id="salePath" name="salePath" defaultValue={animal.salePath}>
                  {Object.entries(SALE_PATH_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="sharePortion">Share portion (custom-exempt)</label>
                <select
                  id="sharePortion"
                  name="sharePortion"
                  defaultValue={animal.sharePortion ?? ""}
                >
                  <option value="">—</option>
                  {Object.entries(SHARE_PORTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="shareSlots">Share slots needed</label>
                <input
                  id="shareSlots"
                  name="shareSlots"
                  type="number"
                  min={1}
                  defaultValue={animal.shareSlots ?? ""}
                />
              </div>
              <div className="field">
                <label htmlFor="targetReadyDate">Target ready / locker week</label>
                <input
                  id="targetReadyDate"
                  name="targetReadyDate"
                  type="date"
                  defaultValue={
                    animal.targetReadyDate
                      ? animal.targetReadyDate.toISOString().slice(0, 10)
                      : ""
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="publicBlurb">Public blurb</label>
                <textarea
                  id="publicBlurb"
                  name="publicBlurb"
                  rows={2}
                  defaultValue={animal.publicBlurb ?? ""}
                />
              </div>
              {withdrawal ? (
                <div className="callout">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" name="overrideWithdrawal" className="mt-1" />
                    <span>
                      Override meat withdrawal block (logged). Reason required:
                      <input
                        name="overrideReason"
                        className="mt-2 w-full rounded-[10px] border border-[var(--line)] px-3 py-2"
                        placeholder="Reason for override"
                      />
                    </span>
                  </label>
                </div>
              ) : null}
              <button type="submit" className="btn self-start">
                Save sale flags
              </button>
            </form>
          </div>

          <div className="card p-5">
            <h2 className="text-xl">Custom-exempt share roster</h2>
            <p className="muted text-sm">
              Named owners before slaughter. {animal.shareSlotsRoster.length}
              {animal.shareSlots ? ` / ${animal.shareSlots}` : ""} slots filled.
            </p>
            <ul className="mt-4 space-y-2">
              {animal.shareSlotsRoster.length === 0 ? (
                <li className="muted">No owners rostered.</li>
              ) : (
                animal.shareSlotsRoster.map((slot) => (
                  <li
                    key={slot.id}
                    className="flex items-center justify-between border-b border-[var(--line)] py-2"
                  >
                    <span>
                      <strong>{slot.ownerName}</strong> · {SHARE_PORTION_LABELS[slot.portion]}
                      {slot.phone ? ` · ${slot.phone}` : ""}
                    </span>
                    <form action={removeShareRosterAction}>
                      <input type="hidden" name="animalId" value={animal.id} />
                      <input type="hidden" name="slotId" value={slot.id} />
                      <button type="submit" className="text-sm text-red-700">
                        Remove
                      </button>
                    </form>
                  </li>
                ))
              )}
            </ul>
            <form action={addShareRosterAction} className="mt-4 grid gap-3">
              <input type="hidden" name="animalId" value={animal.id} />
              <div className="field">
                <label htmlFor="ownerName">Owner name</label>
                <input id="ownerName" name="ownerName" required />
              </div>
              <div className="field">
                <label htmlFor="portion">Portion</label>
                <select id="portion" name="portion" defaultValue="HALF">
                  {Object.entries(SHARE_PORTION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" />
              </div>
              <button type="submit" className="btn self-start">
                Add to roster
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {tab === "status" ? (
        <div className="card max-w-xl p-5">
          <h2 className="text-xl">Move lifecycle status</h2>
          <p className="muted mt-1 text-sm">
            Explicit move with date history. Mortality clears sale listing.
          </p>
          <form action={moveAnimalStatusAction} className="mt-4 grid gap-3">
            <input type="hidden" name="id" value={animal.id} />
            <div className="field">
              <label htmlFor="toStatus">New status</label>
              <select id="toStatus" name="toStatus" defaultValue={status}>
                {STATUS_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="snotes">Notes / mortality reason</label>
              <textarea id="snotes" name="notes" rows={2} />
            </div>
            {withdrawal ? (
              <div className="callout">
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="overrideWithdrawal" className="mt-1" />
                  <span>
                    Override withdrawal for locker booking
                    <input
                      name="overrideReason"
                      className="mt-2 w-full rounded-[10px] border border-[var(--line)] px-3 py-2"
                      placeholder="Override reason"
                    />
                  </span>
                </label>
              </div>
            ) : null}
            <button type="submit" className="btn self-start">
              Move status
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
