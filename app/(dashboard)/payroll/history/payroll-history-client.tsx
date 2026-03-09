"use client";

import { useMemo, useState } from "react";
import { input as inputBase, panel, row } from "@/components/styles";

type EmployeeItem = {
  id: string;
  firstName: string;
  lastName: string;
  employeeNo: string | null;
  idNumber: string | null;
  organisation: { id: string; name: string };
};

type OrgItem = { id: string; name: string };

type PayslipItem = {
  id: string;
  createdAt: string;
  payPeriodFrom?: string | null;
  payPeriodTo?: string | null;
  grossCents: number;
  taxCents: number;
  niCents: number;
  netCents: number;
  allowanceCents: number;
  bonusCents: number;
  overtimeCents?: number;
  maternityFundCents?: number;
  pdfPath: string | null;
};

type FssItem = {
  id: string;
  type: "FS3" | "FS5" | "FS7";
  year: number;
  month: number | null;
  createdAt: string;
  pdfPath: string | null;
  employeeId?: string | null;
};

function eur(cents: number) {
  const n = (cents ?? 0) / 100;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toIso(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function groupForms(forms: FssItem[]) {
  const fs3 = forms.filter((f) => f.type === "FS3");
  const fs5 = forms.filter((f) => f.type === "FS5");
  const fs7 = forms.filter((f) => f.type === "FS7");

  const sort = (a: FssItem, b: FssItem) => {
    const ay = a.year * 100 + (a.month ?? 0);
    const by = b.year * 100 + (b.month ?? 0);
    if (ay !== by) return by - ay;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };

  return {
    fs3: fs3.sort(sort),
    fs5: fs5.sort(sort),
    fs7: fs7.sort(sort),
  };
}

export default function PayrollHistoryClient({
  employees,
  organisations,
}: {
  employees: EmployeeItem[];
  organisations: OrgItem[];
}) {
  const [mode, setMode] = useState<"employees" | "companies">("employees");

  // shared date filter
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 2);
    return toIso(d);
  });
  const [dateTo, setDateTo] = useState<string>(() => toIso(new Date()));

  // employee mode
  const [query, setQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeLabel, setEmployeeLabel] = useState<string>("");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  // company mode
  const [orgQuery, setOrgQuery] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [companyLabel, setCompanyLabel] = useState<string>("");

  // loaded data
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"payslips" | "fss">("payslips");
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [forms, setForms] = useState<FssItem[]>([]);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return employees
      .filter((e) => {
        const name = `${e.firstName} ${e.lastName}`.toLowerCase();
        const org = e.organisation.name.toLowerCase();
        const empNo = (e.employeeNo ?? "").toLowerCase();
        const idNo = (e.idNumber ?? "").toLowerCase();
        return name.includes(q) || org.includes(q) || empNo.includes(q) || idNo.includes(q);
      })
      .slice(0, 50);
  }, [employees, query]);

  const filteredOrgs = useMemo(() => {
    const q = orgQuery.trim().toLowerCase();
    if (q.length < 1) return organisations;
    return organisations.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 50);
  }, [organisations, orgQuery]);

  async function loadEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setPayslips([]);
    setForms([]);
    setLoading(true);
    setTab("payslips");

    try {
      const qs = new URLSearchParams({ employeeId });
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);

      const res = await fetch(`/api/payslips?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "Failed to load payslips");
        return;
      }

      const emp = data.employee;
      setEmployeeLabel(`${emp.firstName} ${emp.lastName}`);
      setSelectedOrgId(emp.organisationId);
      setPayslips(data.payslips ?? []);

      const qs2 = new URLSearchParams({ organisationId: emp.organisationId, employeeId });
      if (dateFrom) qs2.set("dateFrom", dateFrom);
      if (dateTo) qs2.set("dateTo", dateTo);

      const res2 = await fetch(`/api/fss/forms?${qs2.toString()}`, { cache: "no-store" });
      const data2 = await res2.json();
      setForms(data2.forms ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCompany(orgId: string) {
    setSelectedCompanyId(orgId);
    setCompanyLabel(organisations.find((o) => o.id === orgId)?.name ?? "");
    setPayslips([]);
    setForms([]);
    setLoading(true);
    setTab("fss");

    try {
      const qs = new URLSearchParams({ organisationId: orgId });
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);

      const res = await fetch(`/api/fss/forms?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error ?? "Failed to load forms");
        return;
      }
      setForms(data.forms ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function deletePayslip(id: string) {
    if (!confirm("Delete this payslip?")) return;
    const res = await fetch(`/api/payslips/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json())?.error ?? "Failed");
      return;
    }
    setPayslips((p) => p.filter((x) => x.id !== id));
  }

  async function deleteFss(id: string) {
    if (!confirm("Delete this FSS form?")) return;
    const res = await fetch(`/api/fss/forms/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json())?.error ?? "Failed");
      return;
    }
    setForms((p) => p.filter((x) => x.id !== id));
  }

  const grouped = useMemo(() => groupForms(forms), [forms]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            setMode("employees");
            setPayslips([]);
            setForms([]);
          }}
          style={{
            ...row,
            padding: "8px 12px",
            background: mode === "employees" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            cursor: "pointer",
          }}
        >
          Employees
        </button>
        <button
          onClick={() => {
            setMode("companies");
            setPayslips([]);
            setForms([]);
          }}
          style={{
            ...row,
            padding: "8px 12px",
            background: mode === "companies" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            cursor: "pointer",
          }}
        >
          Companies
        </button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ opacity: 0.75, fontSize: 12 }}>Filter by date</div>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ ...inputBase, width: 160 }} />
          <div style={{ opacity: 0.7 }}>→</div>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ ...inputBase, width: 160 }} />
        </div>
      </div>

      {mode === "employees" ? (
        <>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee (name, org, employee no, ID no)"
              style={{ ...inputBase, width: 420, maxWidth: "100%" }}
            />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {filteredEmployees.map((e) => (
              <button
                key={e.id}
                onClick={() => loadEmployee(e.id)}
                style={{
                  textAlign: "left",
                  ...row,
                  padding: 12,
                  background: selectedEmployeeId === e.id ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800 }}>
                  {e.lastName}, {e.firstName}
                </div>
                <div style={{ opacity: 0.7, fontSize: 13 }}>
                  {e.organisation.name}
                  {e.employeeNo ? ` • EmpNo: ${e.employeeNo}` : ""}
                  {e.idNumber ? ` • ID: ${e.idNumber}` : ""}
                </div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>History {employeeLabel ? `for ${employeeLabel}` : ""}</h2>
              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button
                  onClick={() => setTab("payslips")}
                  style={{
                    ...row,
                    padding: "8px 12px",
                    background: tab === "payslips" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    cursor: "pointer",
                  }}
                >
                  Payslips
                </button>
                <button
                  onClick={() => setTab("fss")}
                  style={{
                    ...row,
                    padding: "8px 12px",
                    background: tab === "fss" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    cursor: "pointer",
                  }}
                >
                  FSS Forms
                </button>
              </div>
            </div>

            {loading ? (
              <div>Loading…</div>
            ) : tab === "payslips" ? (
              payslips.length === 0 ? (
                <div style={{ opacity: 0.7 }}>No payslips in this period.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {payslips.map((p) => (
                    <div key={p.id} style={{ ...panel, marginTop: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800 }}>
                          {p.payPeriodFrom && p.payPeriodTo
                            ? `Pay period ${String(p.payPeriodFrom).slice(0, 10)} → ${String(p.payPeriodTo).slice(0, 10)}`
                            : new Date(p.createdAt).toLocaleString()}
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <a href={`/api/payslips/${p.id}/pdf`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                            View PDF
                          </a>
                          <a href={`/api/payslips/${p.id}/pdf`} download style={{ textDecoration: "underline" }}>
                            Download PDF
                          </a>
                          <button
                            onClick={() => deletePayslip(p.id)}
                            style={{ ...row, padding: "6px 10px", background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.35)" }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, display: "flex", gap: 16, flexWrap: "wrap", opacity: 0.85 }}>
                        <div>Gross: € {eur(p.grossCents)}</div>
                        <div>Tax: € {eur(p.taxCents)}</div>
                        <div>NI: € {eur(p.niCents)}</div>
                        <div>Net: € {eur(p.netCents)}</div>
                        <div>Overtime: € {eur((p.overtimeCents ?? 0) as number)}</div>
                        <div>Maternity fund: € {eur((p.maternityFundCents ?? 0) as number)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <FormsGrouped grouped={grouped} onDelete={deleteFss} />
            )}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input value={orgQuery} onChange={(e) => setOrgQuery(e.target.value)} placeholder="Search company" style={{ ...inputBase, width: 420, maxWidth: "100%" }} />
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {filteredOrgs.map((o) => (
              <button
                key={o.id}
                onClick={() => loadCompany(o.id)}
                style={{
                  textAlign: "left",
                  ...row,
                  padding: 12,
                  background: selectedCompanyId === o.id ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.02)",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 800 }}>{o.name}</div>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <h2 style={{ margin: 0, marginBottom: 10 }}>FSS forms {companyLabel ? `for ${companyLabel}` : ""}</h2>
            {loading ? <div>Loading…</div> : <FormsGrouped grouped={grouped} onDelete={deleteFss} />}
          </div>
        </>
      )}
    </div>
  );
}

function FormsGrouped({
  grouped,
  onDelete,
}: {
  grouped: { fs3: FssItem[]; fs5: FssItem[]; fs7: FssItem[] };
  onDelete: (id: string) => void;
}) {
  const Section = ({ title, items }: { title: string; items: FssItem[] }) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ opacity: 0.7 }}>None in this period.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((f) => (
            <div key={f.id} style={{ ...panel, marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>
                  {f.type} — {f.month ? `${String(f.month).padStart(2, "0")}/${f.year}` : f.year} — {new Date(f.createdAt).toLocaleString()}
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <a href={`/api/fss/forms/${f.id}/pdf`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                    View PDF
                  </a>
                  <a href={`/api/fss/forms/${f.id}/pdf`} download style={{ textDecoration: "underline" }}>
                    Download PDF
                  </a>
                  <button onClick={() => onDelete(f.id)} style={{ ...row, padding: "6px 10px", background: "rgba(239,68,68,0.16)", border: "1px solid rgba(239,68,68,0.35)" }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <Section title="FS3" items={grouped.fs3} />
      <Section title="FS5" items={grouped.fs5} />
      <Section title="FS7" items={grouped.fs7} />
    </>
  );
}
