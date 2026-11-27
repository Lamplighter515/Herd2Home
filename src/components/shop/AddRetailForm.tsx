import { addRetailToCartAction } from "@/app/actions/shop";

export function AddRetailForm({
  packageId,
  farmSlug,
  returnTo,
  label = "Add to cart",
}: {
  packageId: string;
  farmSlug: string;
  returnTo: string;
  label?: string;
}) {
  return (
    <form action={addRetailToCartAction}>
      <input type="hidden" name="packageId" value={packageId} />
      <input type="hidden" name="farmSlug" value={farmSlug} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button type="submit" className="shop-btn shop-btn-primary">
        {label}
      </button>
    </form>
  );
}
