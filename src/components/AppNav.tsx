import Link from "next/link";
import type { Farm, User } from "@prisma/client";
import { logoutAction, switchFarmAction } from "@/app/actions/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/herd", label: "Herd" },
  { href: "/herd/calendar", label: "Breeding" },
  { href: "/herd/costs", label: "Costs" },
  { href: "/processor", label: "Processor" },
  { href: "/freezer", label: "Freezer" },
  { href: "/butchers", label: "Butchers" },
  { href: "/checkout", label: "Checkout" },
] as const;

export function AppNav({
  user,
  farm,
  farms,
  pathname,
}: {
  user: User;
  farm: Farm;
  farms: Farm[];
  pathname: string;
}) {
  return (
    <header className="border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_88%,transparent)] backdrop-blur">
      <div className="shell flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start justify-between gap-4 md:items-center">
          <Link href="/dashboard" className="shrink-0">
            <div className="brand-title text-xl text-[var(--brand)]">Herd 2 Home</div>
            <div className="text-[0.68rem] font-bold tracking-[0.14em] text-[var(--muted)]">
              INDIANA PILOT
            </div>
          </Link>
          <nav className="hidden flex-wrap items-center gap-4 lg:flex">
            {LINKS.map((link) => {
              const active =
                link.href === "/herd"
                  ? pathname === "/herd" ||
                    (pathname.startsWith("/herd/") &&
                      !pathname.startsWith("/herd/calendar") &&
                      !pathname.startsWith("/herd/costs") &&
                      !pathname.startsWith("/herd/new"))
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link"
                  data-active={active ? "true" : "false"}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <form action={switchFarmAction} className="flex items-center gap-2">
            <select
              name="farmId"
              defaultValue={farm.id}
              className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <button type="submit" className="text-sm font-semibold text-[var(--brand)]">
              Switch
            </button>
          </form>
          <div className="text-sm text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)]">{user.name}</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" className="text-sm font-semibold text-[var(--brand)]">
              Log out
            </button>
          </form>
        </div>

        <nav className="flex flex-wrap gap-3 lg:hidden">
          {LINKS.map((link) => {
            const active =
              link.href === "/herd"
                ? pathname === "/herd" ||
                  (pathname.startsWith("/herd/") &&
                    !pathname.startsWith("/herd/calendar") &&
                    !pathname.startsWith("/herd/costs") &&
                    !pathname.startsWith("/herd/new"))
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link"
                data-active={active ? "true" : "false"}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
