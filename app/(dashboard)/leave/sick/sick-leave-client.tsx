"use client";

import { useEffect, useState } from "react";
import { panel, sectionTitle, input, primaryBtn, dangerBtn } from "@/components/styles";

type Employee = { id: string; firstName?: string | null; lastName?: string | null; name?: string | null };
type SickLeaveRow = { id: string; startDate: string; meta?: any; employee?: { firstName?: string | null; lastName?: string | null; name?: string | null } | null };
type FormState = { date: string; sickDays: string; hoursPerDay: string; payType: "FULL_PAY" | "HALF_PAY" | "NO_PAY"; notes: string };

export default function SickLeaveClient({ orgId, employees }: { orgId: string; employees: Employee[] }) {
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [rows, setRows] = useState<SickLeaveRow[]>([]);
  const [form, setForm] = useState<FormState>({ date: new Date().toISOString().slice(0, 10), sickDays: "1", hoursPerDay: "8", payType: "FULL_PAY", notes: "" });

  useEffect(() => { setEmployeeId((prev) => employees.find((e) => e.id === prev)?.id ?? employees[0]?.id ?? ""); }, [employees, orgId]);
  
  async function load() {
    const qs = new URLSearchParams({ organisationId: orgId, employeeId });
    const res = await fetch(`/api/sick-leave?${qs.toString()}`);
    const data = await res.json().catch(() => ({}));
    setRows(Array.isArray(data.rows) ? data.rows : []);
  }
  useEffect(() => { void load(); }, [orgId, employeeId]);
  
  async function addEntry() {
    const res = await fetch("/api/sick-leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organisationId: orgId, employeeId, date: form.date, sickDays: Number(form.sickDays), hoursPerDay: Number(form.hoursPerDay), payType: form.payType, notes: form.notes }) });
    if (!res.ok) { const error = await res.json().catch(() => ({})); alert(error?.error ?? "Failed"); return; }
    setForm((prev) => ({ ...prev, notes: "" }));
    await load();
  }
  async function deleteEntry(id: string) {
    const res = await fetch(`/api/sick-leave/${id}`, { method: "DELETE" });
    if (!res.ok) { const error = await res.json().catch(() => ({})); alert(error?.error ?? "Failed"); return; }
    await load();
  }
  
  const employeeLabel = (employee: Employee) => [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim() || employee.name || "Employee";
  const rowEmployeeLabel = (row: SickLeaveRow) => [row.employee?.firstName, row.employee?.lastName].filter(Boolean).join(" ").trim() || row.employee?.name || "Employee";
  const payTypeLabel = (v: string) => v === "HALF_PAY" ? "Half-pay" : v === "NO_PAY" ? "No pay" : "Full-pay";

  return (
    <div style={{ marginTop: 14 }}>
      <div style={panel}>
        <div style={sectionTitle}>Add Sick Leave</div>
        {/* Strictly defined grid to prevent border overlaps */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Employee</div>
            <select style={{...input, width: "100%"} as any} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Date</div>
            <input type="date" style={{...input, width: "100%"}} value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Sick Days</div>
            <input type="number" min="1" step="1" style={{...input, width: "100%"}} value={form.sickDays} onChange={(e) => setForm((prev) => ({ ...prev, sickDays: e.target.value }))} />
          </label>
          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Hours Per Day</div>
            <input type="number" min="0" step="0.01" style={{...input, width: "100%"}} value={form.hoursPerDay} onChange={(e) => setForm((prev) => ({ ...prev, hoursPerDay: e.target.value }))} />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Pay Type</div>
            <select style={{...input, width: "100%"} as any} value={form.payType} onChange={(e) => setForm((prev) => ({ ...prev, payType: e.target.value as FormState['payType'] }))}>
              <option value="FULL_PAY">Full-pay</option>
              <option value="HALF_PAY">Half-pay</option>
              <option value="NO_PAY">No pay</option>
            </select>
          </label>
          <label style={{ gridColumn: "span 3" }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Notes</div>
            <input style={{...input, width: "100%"}} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          </label>
        </div>
        <button type="button" onClick={addEntry} style={{ ...primaryBtn, marginTop: 14 }}>Add Sick Leave</button>
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Sick Leave Entries</div>
        {rows.length === 0 ? <div style={{ opacity: 0.7, fontSize: 14 }}>No sick leave entries yet.</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((row) => (
              <div key={row.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ minWidth: 110, fontWeight: 800 }}>{new Date(row.startDate).toISOString().slice(0,10)}</div>
                <div style={{ flex: 1, opacity: 0.85 }}>{rowEmployeeLabel(row)} — {row.meta?.sickDays ?? 0} days ({payTypeLabel(String(row.meta?.payType ?? 'FULL_PAY'))}) {row.meta?.notes ? ` — ${row.meta.notes}` : ""}</div>
                <button style={dangerBtn} onClick={() => deleteEntry(row.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}