import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts from "./dashboard-charts";

function euros(cents: number) {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString("en-MT", { style: "currency", currency: "EUR" });
}

function monthRange(d: Date) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start, end };
}

function parseYM(s?: string | string[]) {
  const v = Array.isArray(s) ? s[0] : s;
  if (!v) return null;

  const m = v.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

type DashboardSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: DashboardSearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const email = session.user?.email;
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const resolvedSearchParams = (await searchParams) ?? {};

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { organisationId: true },
  });
  const orgIds = memberships.map((m) => m.organisationId);

  const now = new Date();
  const ym = parseYM(resolvedSearchParams.month) ?? {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  const trendMonthsRaw = Array.isArray(resolvedSearchParams.trendMonths)
    ? resolvedSearchParams.trendMonths[0]
    : resolvedSearchParams.trendMonths;

  const trendMonthsParam = Number(trendMonthsRaw);
  const trendMonths = [3, 6, 12, 24].includes(trendMonthsParam)
    ? trendMonthsParam
    : 6;

  const viewDate = new Date(ym.year, ym.month - 1, 1);
  const { start, end } = monthRange(viewDate);

  const agg = await prisma.payslip.aggregate({
    where: {
      organisationId: { in: orgIds },
      createdAt: { gte: start, lt: end },
    },
    _sum: {
      grossCents: true,
      netCents: true,
      taxCents: true,
      niCents: true,
      overtimeCents: true,
      allowanceCents: true,
      bonusCents: true,
    },
    _count: { id: true },
  });

  const baseGross = Math.max(
    0,
    Number(agg._sum.grossCents ?? 0) -
      Number(agg._sum.overtimeCents ?? 0) -
      Number(agg._sum.allowanceCents ?? 0) -
      Number(agg._sum.bonusCents ?? 0)
  );

  const lastMonths: Array<{ label: string; grossCents: number; netCents: number }> = [];
  for (let i = trendMonths - 1; i >= 0; i--) {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
    const r = monthRange(d);

    const a = await prisma.payslip.aggregate({
      where: {
        organisationId: { in: orgIds },
        createdAt: { gte: r.start, lt: r.end },
      },
      _sum: { grossCents: true, netCents: true },
    });

    lastMonths.push({
      label: d.toLocaleString("en-MT", { month: "short", year: "2-digit" }),
      grossCents: Number(a._sum.grossCents ?? 0),
      netCents: Number(a._sum.netCents ?? 0),
    });
  }

  const recent = await prisma.payslip.findMany({
    where: { organisationId: { in: orgIds } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      createdAt: true,
      grossCents: true,
      netCents: true,
      overtimeCents: true,
      employee: { select: { firstName: true, lastName: true } },
      organisation: { select: { name: true } },
    },
  });

  const cards = [
    { label: "Payslips (this month)", value: String(agg._count.id ?? 0) },
    { label: "Gross", value: euros(agg._sum.grossCents ?? 0) },
    { label: "Net", value: euros(agg._sum.netCents ?? 0) },
    { label: "Overtime", value: euros(agg._sum.overtimeCents ?? 0) },
    { label: "Tax", value: euros(agg._sum.taxCents ?? 0) },
    { label: "NI", value: euros(agg._sum.niCents ?? 0) },
  ];

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <form style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ opacity: 0.75, fontSize: 13 }}>View month</div>
          <input
            type="month"
            name="month"
            defaultValue={`${ym.year}-${String(ym.month).padStart(2, "0")}`}
            style={{
              height: 36,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text)",
            }}
          />
          <div style={{ opacity: 0.75, fontSize: 13 }}>Trend</div>
          <select
            name="trendMonths"
            defaultValue={String(trendMonths)}
            style={{
              height: 36,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid var(--input-border)",
              background: "var(--input-bg)",
              color: "var(--text)",
            }}
          >
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="12">12 months</option>
            <option value="24">24 months</option>
          </select>
          <button
            type="submit"
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid var(--btn-ghost-border)",
              background: "var(--btn-ghost-bg)",
              color: "var(--text)",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Apply
          </button>
        </form>
      </div>

      <div style={{ marginTop: 12, opacity: 0.75 }}>
        Payroll overview for{" "}
        {viewDate.toLocaleString("en-MT", { month: "long", year: "numeric" })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginTop: 16,
        }}
      >
        {cards.map((c) => (
          <div
            key={c.label}
            style={{
              border: "1px solid var(--card-border)",
              background: "var(--card)",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.7 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{c.value}</div>
          </div>
        ))}
      </div>

      <DashboardCharts
        breakdown={{
          base: baseGross,
          overtime: Number(agg._sum.overtimeCents ?? 0),
          allowances: Number(agg._sum.allowanceCents ?? 0),
          bonuses: Number(agg._sum.bonusCents ?? 0),
        }}
        deductions={{
          tax: Number(agg._sum.taxCents ?? 0),
          ni: Number(agg._sum.niCents ?? 0),
          maternity: 0,
        }}
        lastMonths={lastMonths}
      />

      <div
        style={{
          marginTop: 18,
          border: "1px solid var(--card-border)",
          background: "var(--card)",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            padding: 14,
            borderBottom: "1px solid var(--card-border)",
            fontWeight: 700,
          }}
        >
          Recent payslips
        </div>
        <div style={{ padding: 14, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", opacity: 0.7, fontSize: 12 }}>
                <th style={{ padding: "8px 6px" }}>Date</th>
                <th style={{ padding: "8px 6px" }}>Organisation</th>
                <th style={{ padding: "8px 6px" }}>Employee</th>
                <th style={{ padding: "8px 6px" }}>Gross</th>
                <th style={{ padding: "8px 6px" }}>Overtime</th>
                <th style={{ padding: "8px 6px" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid var(--card-border)" }}>
                  <td style={{ padding: "10px 6px" }}>
                    {new Date(p.createdAt).toLocaleDateString("en-MT")}
                  </td>
                  <td style={{ padding: "10px 6px" }}>{p.organisation?.name ?? "—"}</td>
                  <td style={{ padding: "10px 6px" }}>
                    {[p.employee?.firstName, p.employee?.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td style={{ padding: "10px 6px" }}>{euros(p.grossCents)}</td>
                  <td style={{ padding: "10px 6px" }}>{euros(p.overtimeCents ?? 0)}</td>
                  <td style={{ padding: "10px 6px" }}>{euros(p.netCents)}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, opacity: 0.7 }}>
                    No payslips yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}