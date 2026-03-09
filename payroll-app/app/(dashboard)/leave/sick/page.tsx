import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import SickLeaveClient from "./sick-leave-client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SickLeavePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  const organisations = await prisma.organisation.findMany({
    where: {
      memberships: {
        some: {
          userId: user.id,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    include: {
      employees: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const organisation = organisations[0];

  if (!organisation) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Sick Leave</h1>
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">
            No organisation found for this account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Sick Leave</h1>
      <SickLeaveClient
        orgId={organisation.id}
        employees={organisation.employees}
      />
    </div>
  );
}