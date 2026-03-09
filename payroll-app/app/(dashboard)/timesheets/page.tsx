import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import TimesheetsClient from "./timesheets-client";

export default async function TimesheetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const organisations = await prisma.organisation.findMany({
    where: { memberships: { some: { userId: user.id } } },
    orderBy: { createdAt: "asc" },
    include: { employees: { orderBy: { createdAt: "asc" } } },
  });

  return <TimesheetsClient organisations={organisations} />;
}
