import type { CostAllocationMethod, WeightEvent } from "@prisma/client";

export type AllocationAnimalInput = {
  id: string;
  /** Days present in scope during period (animal-days). Defaults to full period if omitted. */
  animalDays?: number;
  /** Lb gained in period (weight-gain). Defaults to 0 if omitted / missing weights. */
  weightGainLb?: number;
  /** Manual share as fraction of 1, or absolute cents when using manualCents. */
  manualShare?: number;
  manualCents?: number;
};

export type AllocationLine = {
  animalId: string;
  amountCents: number;
  shareRatio: number;
};

/** Split totalCents across animals. Remainder cents go to the first recipients so the sum matches. */
export function allocateCost(
  totalCents: number,
  method: CostAllocationMethod,
  animals: AllocationAnimalInput[],
): AllocationLine[] {
  if (totalCents < 0) throw new Error("totalCents must be >= 0");
  if (animals.length === 0) return [];

  let weights: number[];

  switch (method) {
    case "EQUAL_PER_HEAD":
      weights = animals.map(() => 1);
      break;
    case "ANIMAL_DAYS": {
      weights = animals.map((a) => Math.max(0, a.animalDays ?? 0));
      if (weights.every((w) => w === 0)) weights = animals.map(() => 1);
      break;
    }
    case "WEIGHT_GAIN": {
      weights = animals.map((a) => Math.max(0, a.weightGainLb ?? 0));
      if (weights.every((w) => w === 0)) weights = animals.map(() => 1);
      break;
    }
    case "MANUAL": {
      const hasCents = animals.some((a) => a.manualCents != null);
      if (hasCents) {
        const lines = animals.map((a) => ({
          animalId: a.id,
          amountCents: Math.max(0, Math.round(a.manualCents ?? 0)),
          shareRatio: 0,
        }));
        const sum = lines.reduce((s, l) => s + l.amountCents, 0);
        for (const line of lines) {
          line.shareRatio = sum > 0 ? line.amountCents / sum : 0;
        }
        return lines;
      }
      weights = animals.map((a) => Math.max(0, a.manualShare ?? 0));
      if (weights.every((w) => w === 0)) weights = animals.map(() => 1);
      break;
    }
    default:
      weights = animals.map(() => 1);
  }

  const weightSum = weights.reduce((s, w) => s + w, 0);
  const raw = animals.map((a, i) => {
    const shareRatio = weightSum > 0 ? weights[i]! / weightSum : 1 / animals.length;
    return {
      animalId: a.id,
      shareRatio,
      amountCents: Math.floor(totalCents * shareRatio),
    };
  });

  let remainder = totalCents - raw.reduce((s, l) => s + l.amountCents, 0);
  let i = 0;
  while (remainder > 0 && raw.length > 0) {
    raw[i % raw.length]!.amountCents += 1;
    remainder -= 1;
    i += 1;
  }

  return raw;
}

/** Inclusive calendar-day count between two dates (UTC date parts). Min 1 when start===end. */
export function inclusiveDays(start: Date, end: Date): number {
  const s = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const e = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (e < s) return 0;
  return Math.floor((e - s) / 86_400_000) + 1;
}

/**
 * Approximate animal-days in [periodStart, periodEnd] using birth/acquired and mortality/exit.
 * Without lot-membership history we treat the animal as present for the overlap of
 * [acquired, exit] ∩ [periodStart, periodEnd].
 */
export function estimateAnimalDays(opts: {
  periodStart: Date;
  periodEnd: Date;
  acquiredAt: Date | null;
  exitedAt: Date | null;
}): number {
  const start = opts.acquiredAt && opts.acquiredAt > opts.periodStart ? opts.acquiredAt : opts.periodStart;
  const end = opts.exitedAt && opts.exitedAt < opts.periodEnd ? opts.exitedAt : opts.periodEnd;
  if (end < start) return 0;
  return inclusiveDays(start, end);
}

/** Lb gained between first and last weight event inside [periodStart, periodEnd], else 0. */
export function weightGainInPeriod(
  events: Pick<WeightEvent, "weighedAt" | "weightLb">[],
  periodStart: Date,
  periodEnd: Date,
): number {
  const inPeriod = events
    .filter((e) => e.weighedAt >= periodStart && e.weighedAt <= periodEnd)
    .sort((a, b) => a.weighedAt.getTime() - b.weighedAt.getTime());
  if (inPeriod.length < 2) return 0;
  const first = inPeriod[0]!.weightLb;
  const last = inPeriod[inPeriod.length - 1]!.weightLb;
  return Math.max(0, last - first);
}

/** Parse dollars string ("12.50") to cents; null if empty/invalid. */
export function dollarsToCents(raw: string): number | null {
  const v = raw.trim().replace(/[$,]/g, "");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}
