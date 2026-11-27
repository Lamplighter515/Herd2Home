import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <h1 className="brand-title text-center text-3xl text-[var(--brand)]">Herd 2 Home</h1>
        <p className="muted mt-3 text-center text-sm leading-relaxed">
          Indiana pilot — herd records through locker processing into freezer inventory and local
          pickup.
        </p>

        <form action={loginAction} className="mt-8 flex flex-col gap-4">
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue="nathan@herd2home.local"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              defaultValue="pilot1234"
              autoComplete="current-password"
            />
          </div>
          {params.error ? (
            <p className="text-sm font-semibold text-red-700">Invalid email or password.</p>
          ) : null}
          <button type="submit" className="btn w-full">
            Sign in
          </button>
        </form>

        <p className="muted mt-5 text-center text-sm">
          Seed login: nathan@herd2home.local / pilot1234
        </p>
        <p className="mt-3 text-center text-sm">
          <a href="/shop" className="font-semibold text-[var(--brand)]">
            ← Public buyer shop
          </a>
        </p>
      </div>
    </div>
  );
}
