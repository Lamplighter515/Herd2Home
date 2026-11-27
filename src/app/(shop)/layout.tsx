import { ShopNav } from "@/components/shop/ShopNav";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shop-root">
      <ShopNav />
      <main>{children}</main>
      <footer className="shop-footer">
        <div className="shop-shell shop-footer-inner">
          <div>
            <p className="shop-footer-brand">Herd 2 Home</p>
            <p className="shop-muted">
              Local Indiana farms · farm &amp; locker pickup · inspected retail and custom-exempt
              shares
            </p>
          </div>
          <div className="shop-footer-links">
            <a href="/login">Farm sign-in</a>
            <a href="/shop">Browse farms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
