import type {
  Animal,
  AnimalClass,
  AnimalSex,
  AnimalStatus,
  HealthEvent,
  SalePath,
  Species,
} from "@prisma/client";

/** Canonical operational statuses for v1.1 UI (legacy values still accepted). */
export const LIFECYCLE_STATUSES: AnimalStatus[] = [
  "ON_FARM",
  "RESERVED_SHARE",
  "BOOKED_LOCKER",
  "AT_LOCKER",
  "HANGING",
  "IN_FREEZER",
  "SOLD",
  "DEAD",
  "CULLED_OTHER",
];

export function normalizeStatus(status: AnimalStatus): AnimalStatus {
  switch (status) {
    case "PASTURE":
      return "ON_FARM";
    case "BOOKED_AT_LOCKER":
      return "BOOKED_LOCKER";
    case "SOLD_RESERVED":
      return "SOLD";
    default:
      return status;
  }
}

export function isLiveStatus(status: AnimalStatus): boolean {
  const s = normalizeStatus(status);
  return s === "ON_FARM" || s === "RESERVED_SHARE";
}

export function activeWithdrawal(events: Pick<HealthEvent, "meatWithdrawalEndsAt">[], now = new Date()) {
  const active = events.filter(
    (e) => e.meatWithdrawalEndsAt && e.meatWithdrawalEndsAt.getTime() > now.getTime(),
  );
  if (active.length === 0) return null;
  return active.reduce((latest, e) =>
    (e.meatWithdrawalEndsAt?.getTime() ?? 0) > (latest.meatWithdrawalEndsAt?.getTime() ?? 0)
      ? e
      : latest,
  );
}

export type SaleBlockReason =
  | "in_meat_withdrawal"
  | "dead_or_culled"
  | "missing_tag"
  | "custom_exempt_needs_live"
  | "custom_exempt_roster_incomplete";

export function saleBlockReasons(
  animal: Pick<
    Animal,
    "tag" | "status" | "salePath" | "sharePortion" | "shareSlots" | "availableForSale"
  >,
  opts: {
    withdrawalEndsAt?: Date | null;
    rosterCount?: number;
  } = {},
): SaleBlockReason[] {
  const reasons: SaleBlockReason[] = [];
  const status = normalizeStatus(animal.status);

  if (!animal.tag?.trim()) reasons.push("missing_tag");
  if (status === "DEAD" || status === "CULLED_OTHER") reasons.push("dead_or_culled");
  if (opts.withdrawalEndsAt && opts.withdrawalEndsAt.getTime() > Date.now()) {
    reasons.push("in_meat_withdrawal");
  }

  if (animal.salePath === "CUSTOM_EXEMPT_SHARE") {
    if (!isLiveStatus(status)) reasons.push("custom_exempt_needs_live");
    const needed =
      animal.shareSlots ??
      (animal.sharePortion === "WHOLE" ? 1 : animal.sharePortion === "HALF" ? 2 : animal.sharePortion === "QUARTER" ? 4 : 0);
    if (needed > 0 && (opts.rosterCount ?? 0) < needed) {
      reasons.push("custom_exempt_roster_incomplete");
    }
  }

  return reasons;
}

export function canProcessOrSell(
  animal: Pick<Animal, "tag" | "status" | "salePath" | "sharePortion" | "shareSlots" | "availableForSale">,
  opts: { withdrawalEndsAt?: Date | null; rosterCount?: number; override?: boolean } = {},
): { ok: boolean; reasons: SaleBlockReason[] } {
  const reasons = saleBlockReasons(animal, opts).filter((r) => {
    if (opts.override && r === "in_meat_withdrawal") return false;
    return true;
  });
  return { ok: reasons.length === 0, reasons };
}

/** Gestation defaults in days for due-date estimates. */
export const GESTATION_DAYS: Record<Species, number> = {
  CATTLE: 283,
  HOGS: 114,
  SHEEP: 147,
  GOATS: 150,
  POULTRY: 21,
};

export function estimateDueDate(species: Species, breedDate: Date): Date {
  const d = new Date(breedDate);
  d.setDate(d.getDate() + GESTATION_DAYS[species]);
  return d;
}

export function parseOptionalDate(raw: string): Date | null {
  const v = raw.trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function parseOptionalFloat(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseOptionalInt(raw: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export function sexFromClass(animalClass: AnimalClass): AnimalSex {
  switch (animalClass) {
    case "HEIFER":
    case "COW":
    case "GILT":
    case "SOW":
    case "EWE":
    case "DOE":
    case "HEN":
      return "FEMALE";
    case "BULL":
    case "BOAR":
    case "RAM":
    case "BUCK":
    case "ROOSTER":
      return "MALE";
    case "STEER":
    case "BARROW":
    case "WETHER":
      return "CASTRATE";
    default:
      return "UNKNOWN";
  }
}

export function legacySexLabel(sexEnum: AnimalSex, animalClass: AnimalClass): string {
  if (animalClass !== "OTHER") {
    return animalClass.toLowerCase().replaceAll("_", " ");
  }
  switch (sexEnum) {
    case "MALE":
      return "male";
    case "FEMALE":
      return "female";
    case "CASTRATE":
      return "castrate";
    default:
      return "unknown";
  }
}

export const SALE_PATH_TO_CHECKOUT: Record<
  Exclude<SalePath, "NONE" | "LIVE_ANIMAL">,
  "INSPECTED_RETAIL" | "CUSTOM_EXEMPT_SHARE"
> = {
  INSPECTED_RETAIL: "INSPECTED_RETAIL",
  CUSTOM_EXEMPT_SHARE: "CUSTOM_EXEMPT_SHARE",
};
