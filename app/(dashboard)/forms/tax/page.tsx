import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <main style={{ padding: 24 }}>
      <h1>Tax</h1>

    </main>
  );
}
