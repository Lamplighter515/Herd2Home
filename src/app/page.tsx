import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getSessionUser();
  // Public buyers land on the shop; signed-in farmers go to ops.
  redirect(user ? "/dashboard" : "/shop");
}
