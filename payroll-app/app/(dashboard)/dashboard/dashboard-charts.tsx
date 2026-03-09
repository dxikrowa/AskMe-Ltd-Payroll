"use client";

import { panel } from "@/components/styles";
import { PieChart, BarChart } from "@/components/simple-charts";

function euros(cents: number) {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString("en-MT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function DashboardCharts({
  breakdown,
  deductions,
  lastMonths,
}: {
  breakdown: { base: number; overtime: number; allowances: number; bonuses: number };
  deductions: { tax: number; ni: number; maternity: number };
  lastMonths: Array<{ label: string; grossCents: number; netCents: number }>;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginTop: 14 }}>
      <div style={panel}>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 10 }}>Gross breakdown (this month)</div>
        <PieChart
          parts={[
            { label: "Base", value: Math.round(breakdown.base / 100) },
            { label: "Overtime", value: Math.round(breakdown.overtime / 100) },
            { label: "Allowances", value: Math.round(breakdown.allowances / 100) },
            { label: "Bonuses", value: Math.round(breakdown.bonuses / 100) },
          ]}
        />
      </div>

      <div style={panel}>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 10 }}>Deductions (this month)</div>
        <BarChart
          series={[
            { label: "Tax", value: deductions.tax / 100 },
            { label: "NI", value: deductions.ni / 100 },
            { label: "Maternity", value: deductions.maternity / 100 },
          ]}
          valueFormatter={(v) => `€${Math.round(v)}`}
        />
      </div>

      <div style={{ ...panel, gridColumn: "1 / -1" }}>
        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 800, marginBottom: 10 }}>Last 6 months</div>
        <BarChart
          width={760}
          series={lastMonths.map((m) => ({ label: m.label, value: m.grossCents / 100 }))}
          valueFormatter={(v) => `€${Math.round(v)}`}
        />
        <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
          Net (last 6 months): {euros(lastMonths.reduce((a, x) => a + x.netCents, 0))}
        </div>
      </div>
    </div>
  );
}
