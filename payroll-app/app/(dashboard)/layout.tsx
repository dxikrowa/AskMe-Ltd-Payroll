import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import Header from "@/components/header";
import Sidebar from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const twoFactorEnabled = Boolean((session.user as any)?.twoFactorEnabled);
  const twoFactorVerified = Boolean((session.user as any)?.twoFactorVerified);

  if (twoFactorEnabled && !twoFactorVerified) {
    redirect("/verify-2fa");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { stripeStatus: true },
  });

  if (!user || user.stripeStatus !== "active") redirect("/billing");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--text)",
      }}
    >
      <aside
        style={{
          width: 260,
          borderRight: "1px solid var(--sidebar-border)",
          background: "var(--sidebar-bg)",
        }}
      >
        <Sidebar />
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            borderBottom: "1px solid var(--panel-border)",
            background: "var(--panel-bg)",
            backdropFilter: "blur(10px)",
          }}
        >
          <Header />
        </div>

        <main
          style={{
            flex: 1,
            padding: 28,
            background: "var(--background)",
          }}
        >
          <div
            style={{
              minHeight: "calc(100vh - 56px - 56px)",
              borderRadius: 12,
              padding: 16,
              background: "var(--panel-bg)",
              border: "1px solid var(--panel-border)",
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
