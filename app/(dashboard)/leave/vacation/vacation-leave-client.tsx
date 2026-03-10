"use client";

import { useEffect, useMemo, useState } from "react";
import { panel, sectionTitle, input, primaryBtn, ghostBtn, dangerBtn } from "@/components/styles";

type Org = any;

function minutesToHours(mins: number) { return Math.round((mins / 60) * 100) / 100; }

function entitlementCycle(employee: any, ref: Date) {
  const start0 = employee?.employmentStartDate ? new Date(employee.employmentStartDate) : null;
  if (!start0 || Number.isNaN(start0.getTime())) {
    const y = ref.getFullYear();
    return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
  const y = ref.getFullYear();
  const annThisYear = new Date(y, start0.getMonth(), start0.getDate());
  const start = ref < annThisYear ? new Date(y - 1, start0.getMonth(), start0.getDate()) : annThisYear;
  const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
  return { start, end };
}

export default function VacationLeaveClient({ organisations }: { organisations: Org[] }) {
  const [tab, setTab] = useState<"used" | "carry">("used");
  const [orgId, setOrgId] = useState<string>(organisations[0]?.id ?? "");
  const org = useMemo(() => organisations.find((o) => o.id === orgId) ?? organisations[0], [organisations, orgId]);
  const employees = org?.employees ?? [];
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? "");

  useEffect(() => { setEmployeeId((prev) => { if (employees.find((e: any) => e.id === prev)) return prev; return employees[0]?.id ?? ""; }); }, [orgId, employees]);

  const employee = employees.find((e: any) => e.id === employeeId);

  const [rows, setRows] = useState<any[]>([]);
  const [carryRows, setCarryRows] = useState<any[]>([]);
  const [ptHoursWorked, setPtHoursWorked] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), hours: "", notes: "" });

  async function load() {
    if (!orgId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ organisationId: orgId });
      if (employeeId) qs.set("employeeId", employeeId);
      const [res1, res2] = await Promise.all([
        fetch(`/api/vacation-leave?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/vacation-leave-carry-forward?${qs.toString()}`, { cache: "no-store" }),
      ]);
      const data1 = await res1.json().catch(() => ({}));
      const data2 = await res2.json().catch(() => ({}));
      setRows(data1.rows ?? []);
      setCarryRows(data2.rows ?? []);

      if (employeeId && employee?.employmentType === "PART_TIME") {
         const cyc = entitlementCycle(employee, new Date());
         const ptQs = new URLSearchParams({ organisationId: orgId, employeeId, entryType: "PART_TIME_HOURS", from: cyc.start.toISOString(), to: cyc.end.toISOString() });
         const ptRes = await fetch(`/api/timesheets?${ptQs.toString()}`, { cache: "no-store" });
         const ptData = await ptRes.json().catch(() => ({}));
         const totalMins = (ptData.rows ?? []).reduce((a: number, r: any) => a + Number(r.minutes || 0), 0);
         setPtHoursWorked(totalMins / 60);
      } else {
         setPtHoursWorked(0);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orgId, employeeId]);

  async function addEntry() {
    if (!orgId || !employeeId) return;
    const res = await fetch("/api/vacation-leave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organisationId: orgId, employeeId, date: form.date, hours: form.hours, notes: form.notes }) });
    if (!res.ok) { alert((await res.json())?.error ?? "Failed"); return; }
    setForm((s) => ({ ...s, hours: "", notes: "" }));
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/vacation-leave/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json())?.error ?? "Failed"); return; }
    await load();
  }

  async function addCarryForwardEntry(hours: string, notes: string) {
    if (!orgId || !employeeId) return;
    const res = await fetch("/api/vacation-leave-carry-forward", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organisationId: orgId, employeeId, hours, notes }) });
    if (!res.ok) { alert((await res.json())?.error ?? "Failed"); return; }
    await load();
  }

  async function removeCarry(id: string) {
    if (!confirm("Delete this carried forward entry?")) return;
    const res = await fetch(`/api/vacation-leave-carry-forward/${id}`, { method: "DELETE" });
    if (!res.ok) { alert((await res.json())?.error ?? "Failed"); return; }
    await load();
  }

  const cycle = employee ? entitlementCycle(employee, new Date()) : null;
  const usedMinutes = rows.reduce((a, r) => {
    const d = new Date(r.date);
    if (!cycle) return a + Number(r.minutesUsed ?? 0);
    if (d >= cycle.start && d < cycle.end) return a + Number(r.minutesUsed ?? 0);
    return a;
  }, 0);

  const carriedMinutes = (() => {
    if (!cycle) return 0;
    const key = cycle.start.toISOString().slice(0, 10);
    const match = carryRows.find((x) => (x.cycleStart ?? "").toString().slice(0, 10) === key);
    return Number(match?.minutesCarried ?? 0);
  })();

  let entitledMinutes = 0;
  if (employee) {
    if (employee.employmentType === "PART_TIME") {
      entitledMinutes = Math.round((ptHoursWorked / 2080) * 216 * 60);
    } else {
      const weekly = Number(employee.normalWeeklyHours ?? 40);
      entitledMinutes = Math.round(216 * 60 * (weekly / 40));
    }
  }
  
  const remainingMinutes = Math.max(0, entitledMinutes + carriedMinutes - usedMinutes);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Vacation Leave</div>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>Record vacation leave used.</div>

      <div style={panel}>
        <div style={sectionTitle}>Selection</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={input as any}>{organisations.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={input as any}>{employees.map((e: any) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}</select>
          <button style={ghostBtn} onClick={load} disabled={loading}>Refresh</button>
        </div>
      </div>

      <div style={panel}>
        <div style={sectionTitle}>Balance</div>
        {employee ? (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div><b>Annual entitlement:</b> {minutesToHours(entitledMinutes)} h</div>
            <div><b>Carried forward:</b> {minutesToHours(carriedMinutes)} h</div>
            <div><b>Used:</b> {minutesToHours(usedMinutes)} h</div>
            <div><b>Remaining:</b> {minutesToHours(remainingMinutes)} h</div>
            {cycle ? <div style={{ opacity: 0.75 }}><b>Entitlement year:</b> {cycle.start.toISOString().slice(0, 10)} → {new Date(cycle.end.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}</div> : null}
          </div>
        ) : <div style={{ opacity: 0.7 }}>Select an employee.</div>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <button style={{ ...ghostBtn, opacity: tab === "used" ? 1 : 0.75 }} onClick={() => setTab("used")}>Vacation leave used</button>
        <button style={{ ...ghostBtn, opacity: tab === "carry" ? 1 : 0.75 }} onClick={() => setTab("carry")}>Carried forward</button>
      </div>

      {tab === "used" ? (
        <>
          <div style={panel}>
            <div style={sectionTitle}>Add vacation leave entry</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              <label><div style={{ fontSize: 12, opacity: 0.7 }}>Date</div><input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} style={input} /></label>
              <label><div style={{ fontSize: 12, opacity: 0.7 }}>Hours used</div><input value={form.hours} onChange={(e) => setForm((s) => ({ ...s, hours: e.target.value }))} style={input} placeholder="e.g. 8" /></label>
              <label><div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div><input value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} style={input} /></label>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}><button style={primaryBtn} onClick={addEntry}>Save entry</button></div>
          </div>
          <div style={panel}>
            <div style={sectionTitle}>Entries</div>
            {rows.length === 0 ? <div style={{ opacity: 0.7 }}>No entries yet.</div> : (
              <div style={{ display: "grid", gap: 10 }}>
                {rows.map((r) => (
                  <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ minWidth: 110, fontWeight: 800 }}>{new Date(r.date).toISOString().slice(0, 10)}</div>
                    <div style={{ flex: 1, opacity: 0.85 }}>{(r.employee?.firstName ?? "")} {(r.employee?.lastName ?? "")}{r.notes ? <span style={{ opacity: 0.7 }}> — {r.notes}</span> : null}</div>
                    <div style={{ width: 120, textAlign: "right", fontWeight: 800 }}>{minutesToHours(Number(r.minutesUsed ?? 0))} h</div>
                    <button style={dangerBtn} onClick={() => remove(r.id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : <CarryForwardTab carryRows={carryRows} onAdd={addCarryForwardEntry} onDelete={removeCarry} />}
    </div>
  );
}

function CarryForwardTab({ carryRows, onAdd, onDelete }: { carryRows: any[]; onAdd: (hours: string, notes: string) => Promise<void>; onDelete: (id: string) => Promise<void>; }) {
  const [hours, setHours] = useState(""); const [notes, setNotes] = useState("");
  return (
    <>
      <div style={panel}>
        <div style={sectionTitle}>Add carried forward leave (once per entitlement year)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <label><div style={{ fontSize: 12, opacity: 0.7 }}>Hours carried forward</div><input value={hours} onChange={(e) => setHours(e.target.value)} style={input} placeholder="e.g. 12" /></label>
          <label><div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div><input value={notes} onChange={(e) => setNotes(e.target.value)} style={input} placeholder="optional" /></label>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
          <button style={primaryBtn} onClick={async () => { await onAdd(hours, notes); setHours(""); setNotes(""); }}>Save carried forward</button>
        </div>
      </div>
      <div style={panel}>
        <div style={sectionTitle}>Carried forward entries</div>
        {carryRows.length === 0 ? <div style={{ opacity: 0.7 }}>No carried forward entries yet.</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            {carryRows.map((r) => (
              <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                <div style={{ minWidth: 160, fontWeight: 800 }}>Entitlement start: {new Date(r.cycleStart).toISOString().slice(0, 10)}</div>
                <div style={{ flex: 1, opacity: 0.85 }}>{(r.employee?.firstName ?? "")} {(r.employee?.lastName ?? "")}{r.notes ? <span style={{ opacity: 0.7 }}> — {r.notes}</span> : null}</div>
                <div style={{ width: 120, textAlign: "right", fontWeight: 800 }}>{minutesToHours(Number(r.minutesCarried ?? 0))} h</div>
                <button style={dangerBtn} onClick={() => onDelete(r.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}