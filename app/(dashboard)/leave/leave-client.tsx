"use client";

import { useEffect, useMemo, useState } from "react";
import { panel, sectionTitle, input, primaryBtn, ghostBtn, dangerBtn } from "@/components/styles";

type Org = any;

function money(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function LeaveClient({ organisations }: { organisations: Org[] }) {
  const [orgId, setOrgId] = useState<string>(organisations[0]?.id ?? "");
  const org = useMemo(() => organisations.find((o) => o.id === orgId) ?? organisations[0], [organisations, orgId]);
  const employees = org?.employees ?? [];
  const [employeeId, setEmployeeId] = useState<string>("");

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    employeeId: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    maternityContribution: "0.00",
    notes: "",
  });

  useEffect(() => {
    setForm((s) => ({ ...s, employeeId: "" }));
  }, [orgId]);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ organisationId: orgId, type: "MATERNITY" });
      const res = await fetch(`/api/leave?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function addEntry() {
    if (!orgId) return;
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organisationId: orgId,
        employeeId: form.employeeId || null,
        startDate: form.startDate,
        endDate: form.endDate,
        maternityContribution: form.maternityContribution,
        notes: form.notes,
      }),
    });
    if (!res.ok) {
      alert((await res.json())?.error ?? "Failed");
      return;
    }
    setForm((s) => ({ ...s, notes: "" }));
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/leave/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json())?.error ?? "Failed");
      return;
    }
    await load();
  }

  const totalCents = rows.reduce((a, r) => a + Number(r.maternityContributionCents ?? 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Leave Management</div>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>
        Maternity leave is tracked only for FSS forms. The contribution amount is automatically added into FS5 / FS7.
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Organisation</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={input as any}>
            {organisations.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button style={ghostBtn} onClick={load} disabled={loading}>
            Refresh
          </button>
          <div style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 700 }}>Total maternity: € {money(totalCents)}</div>
        </div>
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Add maternity entry</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Employee </div>
            <select
              value={form.employeeId}
              onChange={(e) => setForm((s) => ({ ...s, employeeId: e.target.value }))}
              style={input as any}
            >
              <option value="">—</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Start Date</div>
            <input type="date" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} style={input} />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>End Date</div>
            <input type="date" value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} style={input} />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Contribution (€)</div>
            <input value={form.maternityContribution} onChange={(e) => setForm((s) => ({ ...s, maternityContribution: e.target.value }))} style={input} />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div>
            <input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} style={input} />
          </label>
        </div>
        <div style={{ marginTop: 10 }}>
          <button style={primaryBtn} onClick={addEntry}>
            Save entry
          </button>
        </div>
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Entries</div>
        {rows.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No maternity entries yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ minWidth: 240, fontWeight: 800 }}>
                  {new Date(r.startDate).toISOString().slice(0, 10)} → {new Date(r.endDate).toISOString().slice(0, 10)}
                </div>
                <div style={{ flex: 1, opacity: 0.85 }}>
                  {r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : "(no employee)"}
                  {r.notes ? <span style={{ opacity: 0.7 }}> — {r.notes}</span> : null}
                </div>
                <div style={{ width: 160, textAlign: "right", fontWeight: 800 }}>€ {money(Number(r.maternityContributionCents ?? 0))}</div>
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
