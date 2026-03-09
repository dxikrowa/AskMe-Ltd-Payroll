"use client";

import { useEffect, useMemo, useState } from "react";
import { panel, sectionTitle, input, primaryBtn, ghostBtn, dangerBtn } from "@/components/styles";

type Org = any;

function money(cents: number) {
  return (cents / 100).toFixed(2);
}

function computeOvertimeCents(row: any): number {
  const minutes = Number(row.minutes ?? 0);
  const rate = Number(row.rateCents ?? 0);
  const mult = Number(row.multiplierBp ?? 100);
  return Math.round((minutes / 60) * rate * (mult / 100));
}

export default function TimesheetsClient({ organisations }: { organisations: Org[] }) {
  const [orgId, setOrgId] = useState<string>(organisations[0]?.id ?? "");
  const org = useMemo(() => organisations.find((o) => o.id === orgId) ?? organisations[0], [organisations, orgId]);
  const employees = org?.employees ?? [];
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? "");

  useEffect(() => {
    setEmployeeId((prev) => {
      if (employees.find((e: any) => e.id === prev)) return prev;
      return employees[0]?.id ?? "";
    });
  }, [orgId]);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    hours: "",
    rate: "",
    multiplier: "1.5",
    notes: "",
  });

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ organisationId: orgId });
      if (employeeId) qs.set("employeeId", employeeId);
      const res = await fetch(`/api/timesheets?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, employeeId]);

  async function addEntry() {
    if (!orgId || !employeeId) return;
    const res = await fetch("/api/timesheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organisationId: orgId,
        employeeId,
        date: form.date,
        hours: form.hours,
        rate: form.rate,
        multiplier: form.multiplier,
        notes: form.notes,
      }),
    });
    if (!res.ok) {
      alert((await res.json())?.error ?? "Failed");
      return;
    }
    setForm((s) => ({ ...s, hours: "", notes: "" }));
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/timesheets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json())?.error ?? "Failed");
      return;
    }
    await load();
  }

  const totalCents = rows.reduce((a, r) => a + computeOvertimeCents(r), 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Timesheets</div>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>Track overtime entries. These totals are used in FS5 overtime boxes.</div>

      <div style={panel}>
        <div style={sectionTitle}>Selection</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={input as any}>
            {organisations.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>

          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={input as any}>
            {employees.map((e: any) => (
              <option key={e.id} value={e.id}>
                {e.firstName} {e.lastName}
              </option>
            ))}
          </select>

          <button style={ghostBtn} onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Add overtime entry</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Date</div>
            <input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} style={input} />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Hours</div>
            <input value={form.hours} onChange={(e) => setForm((s) => ({ ...s, hours: e.target.value }))} style={input} placeholder="e.g. 2.5" />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Rate (€/hour)</div>
            <input value={form.rate} onChange={(e) => setForm((s) => ({ ...s, rate: e.target.value }))} style={input} placeholder="e.g. 10" />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Multiplier</div>
            <input value={form.multiplier} onChange={(e) => setForm((s) => ({ ...s, multiplier: e.target.value }))} style={input} placeholder="1.5" />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div>
            <input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} style={input} />
          </label>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <button style={primaryBtn} onClick={addEntry}>
            Save entry
          </button>
          <div style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 700 }}>Total overtime: € {money(totalCents)}</div>
        </div>
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Entries</div>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No entries yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ minWidth: 110, fontWeight: 800 }}>{new Date(r.date).toISOString().slice(0, 10)}</div>
                <div style={{ flex: 1, opacity: 0.85 }}>
                  {(r.employee?.firstName ?? "")} {(r.employee?.lastName ?? "")} — {Math.round((r.minutes / 60) * 100) / 100}h @ €{money((r.rateCents ?? 0) as number)} × {(r.multiplierBp ?? 100) / 100}
                  {r.notes ? <span style={{ opacity: 0.7 }}> — {r.notes}</span> : null}
                </div>
                <div style={{ width: 140, textAlign: "right", fontWeight: 800 }}>€ {money(computeOvertimeCents(r))}</div>
                <button style={dangerBtn} onClick={() => remove(r.id)}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
