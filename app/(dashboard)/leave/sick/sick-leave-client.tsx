"use client";

import { useEffect, useState } from "react";

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

  return <div className="space-y-6">
    <div className="rounded-lg border bg-white p-4 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Add Sick Leave</h2><div className="grid gap-4 md:grid-cols-2">
      <div><label className="mb-1 block text-sm font-medium">Employee</label><select className="w-full rounded-md border px-3 py-2" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeLabel(employee)}</option>)}</select></div>
      <div><label className="mb-1 block text-sm font-medium">Date</label><input type="date" className="w-full rounded-md border px-3 py-2" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} /></div>
      <div><label className="mb-1 block text-sm font-medium">Sick Days</label><input type="number" min="1" step="1" className="w-full rounded-md border px-3 py-2" value={form.sickDays} onChange={(e) => setForm((prev) => ({ ...prev, sickDays: e.target.value }))} /></div>
      <div><label className="mb-1 block text-sm font-medium">Hours Per Day</label><input type="number" min="0" step="0.01" className="w-full rounded-md border px-3 py-2" value={form.hoursPerDay} onChange={(e) => setForm((prev) => ({ ...prev, hoursPerDay: e.target.value }))} /></div>
      <div><label className="mb-1 block text-sm font-medium">Pay Type</label><select className="w-full rounded-md border px-3 py-2" value={form.payType} onChange={(e) => setForm((prev) => ({ ...prev, payType: e.target.value as FormState['payType'] }))}><option value="FULL_PAY">Full-pay</option><option value="HALF_PAY">Half-pay</option><option value="NO_PAY">No pay</option></select></div>
      <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium">Notes</label><textarea className="w-full rounded-md border px-3 py-2" rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
    </div><div className="mt-4"><button type="button" onClick={addEntry} className="rounded-md border px-4 py-2">Add Sick Leave</button></div></div>
    <div className="rounded-lg border bg-white p-4 shadow-sm"><h2 className="mb-4 text-lg font-semibold">Sick Leave Entries</h2><div className="overflow-x-auto"><table className="min-w-full border-collapse text-sm"><thead><tr className="border-b text-left"><th className="px-3 py-2">Employee</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Days</th><th className="px-3 py-2">Hours/Day</th><th className="px-3 py-2">Pay Type</th><th className="px-3 py-2">Notes</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-b"><td className="px-3 py-2">{rowEmployeeLabel(row)}</td><td className="px-3 py-2">{new Date(row.startDate).toISOString().slice(0,10)}</td><td className="px-3 py-2">{row.meta?.sickDays ?? 0}</td><td className="px-3 py-2">{row.meta?.hoursPerDay ?? 0}</td><td className="px-3 py-2">{payTypeLabel(String(row.meta?.payType ?? 'FULL_PAY'))}</td><td className="px-3 py-2">{row.meta?.notes ?? ''}</td><td className="px-3 py-2"><button className="rounded-md border px-3 py-1" onClick={() => deleteEntry(row.id)}>Delete</button></td></tr>)}</tbody></table></div></div>
  </div>;
}
