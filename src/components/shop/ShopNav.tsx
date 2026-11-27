import Link from "next/link";
import { readCart } from "@/lib/shop";

export async function ShopNav({ farmName }: { farmName?: string }) {
  const cart = await readCart();
  const count = cart.items.length;

  return (
    <header className="shop-nav">
      <div className="shop-shell shop-nav-inner">
        <Link href="/shop" className="shop-brand">
          <span className="shop-brand-mark">Herd 2 Home</span>
          <span className="shop-brand-sub">Indiana local meat</span>
        </Link>

        {farmName ? <p className="shop-nav-farm">{farmName}</p> : null}

        <div className="shop-nav-actions">
          <Link href="/shop" className="shop-nav-link">
            Farms
          </Link>
          <Link href="/shop/cart" className="shop-cart-btn" aria-label={`Cart, ${count} items`}>
            Cart
            {count > 0 ? <span className="shop-cart-count">{count}</span> : null}
          </Link>
        </div>
      </div>
    </header>
  );
}
