export function ModeCallout({ mode }: { mode: "retail" | "share" }) {
  if (mode === "retail") {
    return (
      <div className="shop-callout shop-callout-retail">
        <strong>Inspected retail cuts</strong>
        <p>
          These packages are sold by cut and weight after state/USDA inspection. Buy what you need —
          farm or locker pickup.
        </p>
      </div>
    );
  }

  return (
    <div className="shop-callout shop-callout-share">
      <strong>Custom-exempt live shares</strong>
      <p>
        You reserve a share of a living animal before slaughter and join the owner roster. This is
        not meat sold by the pound — halves and wholes only.
      </p>
    </div>
  );
}
