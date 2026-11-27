import { addShareToCartAction } from "@/app/actions/shop";
import { remainingSharePct, shareLabel, sharePriceCents, money } from "@/lib/shop";
import type { Animal } from "@prisma/client";

export function AddShareForm({
  animal,
  farmSlug,
  returnTo,
}: {
  animal: Animal & { shareRoster: { sharePct: number }[] };
  farmSlug: string;
  returnTo: string;
}) {
  const remaining = remainingSharePct(animal);
  const options = ([25, 50, 100] as const).filter((pct) => pct <= remaining);

  if (options.length === 0) {
    return <p className="shop-muted">This animal’s custom-exempt shares are fully reserved.</p>;
  }

  return (
    <form action={addShareToCartAction} className="shop-share-form">
      <input type="hidden" name="animalId" value={animal.id} />
      <input type="hidden" name="farmSlug" value={farmSlug} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <fieldset className="shop-share-options">
        <legend>Choose share size</legend>
        {options.map((pct) => (
          <label key={pct} className="shop-share-option">
            <input
              type="radio"
              name="sharePct"
              value={pct}
              defaultChecked={pct === options[0]}
              required
            />
            <span>
              <strong>{shareLabel(pct)}</strong>
              <em>{money(sharePriceCents(animal, pct))} deposit</em>
            </span>
          </label>
        ))}
      </fieldset>

      <p className="shop-hint">{remaining}% of this animal remains open for share owners.</p>
      <button type="submit" className="shop-btn shop-btn-primary">
        Reserve share
      </button>
    </form>
  );
}
