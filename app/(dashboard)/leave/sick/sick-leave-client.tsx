"use client";

import { useEffect, useState } from "react";

const DAILY_BENEFIT_SINGLE = 25.81;
const DAILY_BENEFIT_MARRIED = 34.42;

type Employee = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
};

type SickLeaveRow = {
  id: string;
  date: string;
  sickDays: number;
  hoursPerDay: number;
  dailyBenefit: number;
  notes?: string | null;
  employee?: {
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  } | null;
};

type FormState = {
  date: string;
  sickDays: string;
  hoursPerDay: string;
  marriedRate: boolean;
  notes: string;
};

type Props = {
  orgId: string;
  employees: Employee[];
};

export default function SickLeaveClient({ orgId, employees }: Props) {
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [rows, setRows] = useState<SickLeaveRow[]>([]);
  const [form, setForm] = useState<FormState>({
    date: new Date().toISOString().slice(0, 10),
    sickDays: "1",
    hoursPerDay: "8",
    marriedRate: false,
    notes: "",
  });

  useEffect(() => {
    setEmployeeId((prev: string) => {
      const stillExists = employees.find((e) => e.id === prev)?.id;
      return stillExists ?? employees[0]?.id ?? "";
    });
  }, [employees, orgId]);

  async function load() {
    if (!orgId) return;

    const qs = new URLSearchParams({
      organisationId: orgId,
      employeeId,
    });

    const res = await fetch(`/api/sick-leave?${qs.toString()}`);
    const data = await res.json().catch(() => ({}));
    setRows(Array.isArray(data.rows) ? data.rows : []);
  }

  useEffect(() => {
    void load();
  }, [orgId, employeeId]);

  async function addEntry() {
    const dailyBenefit = form.marriedRate
      ? DAILY_BENEFIT_MARRIED
      : DAILY_BENEFIT_SINGLE;

    const res = await fetch("/api/sick-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organisationId: orgId,
        employeeId,
        date: form.date,
        sickDays: Number(form.sickDays),
        hoursPerDay: Number(form.hoursPerDay),
        dailyBenefit,
        notes: form.notes,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error?.error ?? "Failed");
      return;
    }

    setForm((prev: FormState) => ({
      ...prev,
      notes: "",
    }));

    await load();
  }

  async function deleteEntry(id: string) {
    const res = await fetch(`/api/sick-leave/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      alert(error?.error ?? "Failed");
      return;
    }

    await load();
  }

  function employeeLabel(employee: Employee) {
    const fullName = [employee.firstName, employee.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || employee.name || "Employee";
  }

  function rowEmployeeLabel(row: SickLeaveRow) {
    const fullName = [row.employee?.firstName, row.employee?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || row.employee?.name || "Employee";
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Add Sick Leave</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Employee</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employeeLabel(employee)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2"
              value={form.date}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Sick Days</label>
            <input
              type="number"
              min="1"
              step="1"
              className="w-full rounded-md border px-3 py-2"
              value={form.sickDays}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sickDays: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Hours Per Day
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border px-3 py-2"
              value={form.hoursPerDay}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, hoursPerDay: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Notes</label>
            <textarea
              className="w-full rounded-md border px-3 py-2"
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, notes: e.target.value }))
              }
            />
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.marriedRate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    marriedRate: e.target.checked,
                  }))
                }
              />
              Use married rate
            </label>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={addEntry}
            className="rounded-md border px-4 py-2"
          >
            Add Sick Leave
          </button>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Sick Leave Entries</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Employee</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Days</th>
                <th className="px-3 py-2">Hours/Day</th>
                <th className="px-3 py-2">Daily Benefit</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="px-3 py-2">{rowEmployeeLabel(row)}</td>
                  <td className="px-3 py-2">{row.date?.slice(0, 10)}</td>
                  <td className="px-3 py-2">{row.sickDays}</td>
                  <td className="px-3 py-2">{row.hoursPerDay}</td>
                  <td className="px-3 py-2">{row.dailyBenefit}</td>
                  <td className="px-3 py-2">{row.notes || ""}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => deleteEntry(row.id)}
                      className="rounded-md border px-3 py-1"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-sm text-gray-500" colSpan={7}>
                    No sick leave entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}