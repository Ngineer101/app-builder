export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import DashboardClient from "@/components/dashboard-client";

export default async function Home() {
  const session = await getAuth().api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return <DashboardClient user={{ id: session.user.id, name: session.user.name ?? "" }} />;
}
