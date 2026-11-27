import type { AnimalStatus, CheckoutMode, PackageStatus, PickupType, Species } from "@prisma/client";

export const SPECIES_LABELS: Record<Species, string> = {
  CATTLE: "Cattle",
  HOGS: "Hogs",
  SHEEP: "Sheep",
  GOATS: "Goats",
  POULTRY: "Poultry",
};

export const STATUS_LABELS: Record<AnimalStatus, string> = {
  PASTURE: "Pasture",
  BOOKED_AT_LOCKER: "Booked / at locker",
  HANGING: "Hanging",
  IN_FREEZER: "In freezer",
  SOLD_RESERVED: "Sold / reserved",
};

export const STATUS_ORDER: AnimalStatus[] = [
  "PASTURE",
  "BOOKED_AT_LOCKER",
  "HANGING",
  "IN_FREEZER",
  "SOLD_RESERVED",
];

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

export function statusBadgeClass(status: AnimalStatus): string {
  switch (status) {
    case "PASTURE":
      return "badge-pasture";
    case "BOOKED_AT_LOCKER":
      return "badge-booked";
    case "HANGING":
      return "badge-hanging";
    case "IN_FREEZER":
      return "badge-freezer";
    case "SOLD_RESERVED":
      return "badge-sold";
  }
}

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
