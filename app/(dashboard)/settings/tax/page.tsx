import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TaxSettingsClient from "./tax-settings-client";

export default async function TaxSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <TaxSettingsClient />;
}
