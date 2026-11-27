import type {
  AnimalClass,
  AnimalSex,
  AnimalStatus,
  BreedingMethod,
  CheckoutMode,
  CostAllocationMethod,
  CostCategory,
  HealthEventType,
  PackageStatus,
  PickupType,
  PregnancyStatus,
  SalePath,
  SharePortion,
  Species,
  WeightEventType,
  WeightSource,
} from "@prisma/client";
import { LIFECYCLE_STATUSES, normalizeStatus } from "@/lib/herd";

export const SPECIES_LABELS: Record<Species, string> = {
  CATTLE: "Cattle",
  HOGS: "Hogs",
  SHEEP: "Sheep",
  GOATS: "Goats",
  POULTRY: "Poultry",
};

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  PASTURE: "On farm",
  ON_FARM: "On farm",
  RESERVED_SHARE: "Reserved share",
  BOOKED_LOCKER: "Booked locker",
  BOOKED_AT_LOCKER: "Booked / at locker",
  AT_LOCKER: "At locker",
  HANGING: "Hanging",
  IN_FREEZER: "In freezer",
  SOLD: "Sold",
  SOLD_RESERVED: "Sold / reserved",
  DEAD: "Dead",
  CULLED_OTHER: "Culled / other",
};

export const STATUS_ORDER: AnimalStatus[] = LIFECYCLE_STATUSES;

export const SEX_LABELS: Record<AnimalSex, string> = {
  MALE: "Male",
  FEMALE: "Female",
  UNKNOWN: "Unknown",
  CASTRATE: "Castrate",
};

export const CLASS_LABELS: Record<AnimalClass, string> = {
  CALF: "Calf",
  HEIFER: "Heifer",
  COW: "Cow",
  BULL: "Bull",
  STEER: "Steer",
  PIGLET: "Piglet",
  GILT: "Gilt",
  SOW: "Sow",
  BARROW: "Barrow",
  BOAR: "Boar",
  LAMB: "Lamb",
  EWE: "Ewe",
  RAM: "Ram",
  WETHER: "Wether",
  KID: "Kid",
  DOE: "Doe",
  BUCK: "Buck",
  CHICK: "Chick",
  HEN: "Hen",
  ROOSTER: "Rooster",
  OTHER: "Other",
};

export const CLASSES_BY_SPECIES: Record<Species, AnimalClass[]> = {
  CATTLE: ["CALF", "HEIFER", "COW", "BULL", "STEER", "OTHER"],
  HOGS: ["PIGLET", "GILT", "SOW", "BARROW", "BOAR", "OTHER"],
  SHEEP: ["LAMB", "EWE", "RAM", "WETHER", "OTHER"],
  GOATS: ["KID", "DOE", "BUCK", "WETHER", "OTHER"],
  POULTRY: ["CHICK", "HEN", "ROOSTER", "OTHER"],
};

export const SALE_PATH_LABELS: Record<SalePath, string> = {
  NONE: "None",
  INSPECTED_RETAIL: "Inspected retail",
  CUSTOM_EXEMPT_SHARE: "Custom-exempt share",
  LIVE_ANIMAL: "Live animal",
};

export const SHARE_PORTION_LABELS: Record<SharePortion, string> = {
  WHOLE: "Whole",
  HALF: "Half",
  QUARTER: "Quarter",
};

export const WEIGHT_TYPE_LABELS: Record<WeightEventType, string> = {
  BIRTH: "Birth",
  WEAN: "Wean",
  PERIODIC: "Periodic",
  SALE: "Sale",
  HANGING: "Hanging",
  OTHER: "Other",
};

export const WEIGHT_SOURCE_LABELS: Record<WeightSource, string> = {
  SCALE: "Scale",
  ESTIMATE: "Estimate",
  PLANT: "Plant",
};

export const HEALTH_TYPE_LABELS: Record<HealthEventType, string> = {
  VACCINE: "Vaccine",
  TREATMENT: "Treatment",
  PROCEDURE: "Procedure",
  DIAGNOSIS: "Diagnosis",
  VET_VISIT: "Vet visit",
  OBSERVATION: "Observation",
};

export const BREEDING_METHOD_LABELS: Record<BreedingMethod, string> = {
  NATURAL: "Natural service",
  AI: "AI",
};

export const PREGNANCY_STATUS_LABELS: Record<PregnancyStatus, string> = {
  OPEN: "Open",
  BRED: "Bred",
  CONFIRMED: "Confirmed",
  OPEN_AFTER_CHECK: "Open after check",
  CALVED: "Calved",
  ABORTED: "Aborted",
};

export const CHECKOUT_MODE_LABELS: Record<CheckoutMode, string> = {
  INSPECTED_RETAIL: "Inspected retail",
  CUSTOM_EXEMPT_SHARE: "Custom-exempt share",
};

export const PICKUP_LABELS: Record<PickupType, string> = {
  FARM: "Farm pickup",
  BUTCHER: "Butcher / locker pickup",
};

export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  AVAILABLE: "Available",
  RESERVED: "Reserved",
  SOLD: "Sold",
};

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  HAY: "Hay",
  FEED: "Feed",
  VET: "Vet",
  HAUL: "Haul",
  PROCESSING: "Processing",
  OTHER: "Other",
};

export const COST_ALLOCATION_METHOD_LABELS: Record<CostAllocationMethod, string> = {
  EQUAL_PER_HEAD: "Equal per head",
  ANIMAL_DAYS: "Animal-days",
  WEIGHT_GAIN: "Weight gain",
  MANUAL: "Manual",
};

export const COST_ALLOCATION_METHOD_HELP: Record<CostAllocationMethod, string> = {
  EQUAL_PER_HEAD: "Split the bill evenly across every animal in scope (default).",
  ANIMAL_DAYS:
    "Weight by days each animal was on the farm during the expense period (acquired → exit).",
  WEIGHT_GAIN:
    "Weight by lb gained in the period (needs at least two weights per animal). Falls back to equal if no gains.",
  MANUAL: "Enter a dollar amount per selected animal; amounts should cover the bill.",
};

export const SALE_BLOCK_LABELS: Record<string, string> = {
  in_meat_withdrawal: "Active meat withdrawal",
  dead_or_culled: "Dead or culled",
  missing_tag: "Missing tag",
  custom_exempt_needs_live: "Custom-exempt requires live on-farm animal",
  custom_exempt_roster_incomplete: "Share roster incomplete",
};

export function statusBadgeClass(status: AnimalStatus): string {
  switch (normalizeStatus(status)) {
    case "ON_FARM":
      return "badge-pasture";
    case "RESERVED_SHARE":
      return "badge-reserved";
    case "BOOKED_LOCKER":
    case "AT_LOCKER":
      return "badge-booked";
    case "HANGING":
      return "badge-hanging";
    case "IN_FREEZER":
      return "badge-freezer";
    case "SOLD":
      return "badge-sold";
    case "DEAD":
    case "CULLED_OTHER":
      return "badge-dead";
    default:
      return "badge-pasture";
  }
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
