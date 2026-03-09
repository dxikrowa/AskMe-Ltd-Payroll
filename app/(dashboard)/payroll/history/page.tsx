import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import PayrollHistoryClient from "./payroll-history-client";

export default async function PayrollHistoryPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  // all employees from orgs user belongs to
  const employees = await prisma.employee.findMany({
    where: { organisation: { memberships: { some: { userId: user.id } } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      employeeNo: true,
      idNumber: true,
      organisation: { select: { id: true, name: true } },
    },
  });

  const organisations = await prisma.organisation.findMany({
    where: { memberships: { some: { userId: user.id } } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <main style={{ padding: 24 }}>
      <h1>Payroll History</h1>
      <PayrollHistoryClient employees={employees} organisations={organisations} />
    </main>
  );
}
