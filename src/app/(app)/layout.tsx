import { headers } from "next/headers";
import { requireFarmContext } from "@/lib/auth";
import { AppNav } from "@/components/AppNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, farm, farms } = await requireFarmContext();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/dashboard";

  return (
    <div className="min-h-screen">
      <AppNav user={user} farm={farm} farms={farms} pathname={pathname} />
      <main className="shell py-8">{children}</main>
    </div>
  );
}
