"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ghostBtn, input as inputBase, panel, primaryBtn, row } from "@/components/styles";
import PdfPreview from "@/components/pdf-preview";

type Org = any;

type PayslipItem = {
  id: string;
  createdAt: string;
  payPeriodFrom?: string | null;
  payPeriodTo?: string | null;
  monthKey: string;
  grossCents: number;
  taxCents: number;
  niCents: number;
  netCents: number;
  allowanceCents: number;
  bonusCents: number;
  employee: { id: string; firstName: string; lastName: string };
};

type Fs5FormItem = {
  id: string;
  year: number;
  month: number | null;
  createdAt: string;
  pdfPath: string | null;
  data: any;
};

function moneyFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function monthLabelFromKey(key: string) {
  // YYYY-MM
  const [y, m] = key.split("-");
  return `${m}/${y}`;
}

export default function FssClient({ organisations }: { organisations: Org[] }) {
  const today = new Date();

  function toIsoDate(d: Date) {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }

  function toDMY(iso: string) {
    // Convert YYYY-MM-DD -> DD/MM/YYYY (what the PDF helpers expect)
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

  const [tab, setTab] = useState<"fs5" | "fs7" | "fs3">("fs5");

  const [orgId, setOrgId] = useState<string>(organisations[0]?.id ?? "");
  const org = useMemo(() => organisations.find((o) => o.id === orgId) ?? null, [organisations, orgId]);
  const employees = (org?.employees ?? []) as any[];

  // --- FS5 inputs ---
  const [fs5Year, setFs5Year] = useState<number>(today.getFullYear());
  const [fs5Month, setFs5Month] = useState<number>(today.getMonth() + 1);
  const [fs5PayDate, setFs5PayDate] = useState<string>(toIsoDate(today));
  const [fs5ChequeNo, setFs5ChequeNo] = useState<string>("");
  const [fs5BankAcc, setFs5BankAcc] = useState<string>("");
  const [fs5Bank, setFs5Bank] = useState<string>("");
  const [fs5Branch, setFs5Branch] = useState<string>("");
  const [fs5PayerName, setFs5PayerName] = useState<string>("");

  const [fs5EmployeeFilter, setFs5EmployeeFilter] = useState<string>(""); // optional

  // --- FS7 inputs ---
  const [fs7Year, setFs7Year] = useState<number>(today.getFullYear());
  const [fs7Date, setFs7Date] = useState<string>(toIsoDate(today));
  const [fs7ItReg, setFs7ItReg] = useState<string>("");
  const [fs7Jobsplus, setFs7Jobsplus] = useState<string>("");
  const [fs7ChildcareAns, setFs7ChildcareAns] = useState<"" | "yes" | "no">("");
  const [fs7ChildcareAmount, setFs7ChildcareAmount] = useState<string>("");
  const [fs7ChildcareEmployees, setFs7ChildcareEmployees] = useState<string>("");
  const [fs7ShareAns, setFs7ShareAns] = useState<"" | "yes" | "no">("");
  const [fs7ShareAmount, setFs7ShareAmount] = useState<string>("");
  const [fs7ShareEmployees, setFs7ShareEmployees] = useState<string>("");
  const [fs7PrincipalName, setFs7PrincipalName] = useState<string>("");
  const [fs7PrincipalPosition, setFs7PrincipalPosition] = useState<string>("");

  // --- FS3 inputs ---
  const [fs3EmployeeId, setFs3EmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [fs3Year, setFs3Year] = useState<number>(today.getFullYear());
  const [fs3Date, setFs3Date] = useState<string>(toIsoDate(today));
  const [fs3PeriodFrom, setFs3PeriodFrom] = useState<string>(toIsoDate(new Date(today.getFullYear(), 0, 1)));
  const [fs3PeriodTo, setFs3PeriodTo] = useState<string>(toIsoDate(new Date(today.getFullYear(), 11, 31)));

  // --- data ---
  const [loadingPayslips, setLoadingPayslips] = useState(false);
  const [payslips, setPayslips] = useState<PayslipItem[]>([]);
  const [selectedPayslipIds, setSelectedPayslipIds] = useState<Set<string>>(new Set());

  const [loadingFs5Forms, setLoadingFs5Forms] = useState(false);
  const [fs5Forms, setFs5Forms] = useState<Fs5FormItem[]>([]);
  const [selectedFs5FormIds, setSelectedFs5FormIds] = useState<Set<string>>(new Set());

  // --- editable fields ---
  const [overrideFields, setOverrideFields] = useState<Record<string, any>>({});

  // --- preview ---
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewError, setPreviewError] = useState<string>("");
  const lastPreviewUrlRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (lastPreviewUrlRef.current) URL.revokeObjectURL(lastPreviewUrlRef.current);
    };
  }, []);

  // keep employee selection valid
  useEffect(() => {
    const list = (org?.employees ?? []) as any[];
    setFs3EmployeeId(list[0]?.id ?? "");
  }, [orgId]);

  // default payer name from organisation (can be overridden in the UI)
  useEffect(() => {
    const suggested = (org as any)?.payrollManagerFullName ?? "";
    setFs5PayerName((prev) => (prev?.trim() ? prev : suggested));
  }, [orgId]);

  // Default FS7 IT / Jobsplus registration numbers from organisation details
  useEffect(() => {
    const it = (org as any)?.itRegistrationNumber ?? "";
    const jp = (org as any)?.jobsplusRegistrationNumber ?? "";
    setFs7ItReg((prev) => (prev?.trim() ? prev : it));
    setFs7Jobsplus((prev) => (prev?.trim() ? prev : jp));
  }, [orgId]);

  // Load payslips for FS5 selection (company + optional employee), grouped/sorted by month
  useEffect(() => {
    if (!orgId) return;
    if (tab !== "fs5") return;

    const url = new URL("/api/fss/payslips", window.location.origin);
    url.searchParams.set("organisationId", orgId);
    url.searchParams.set("scope", "month");
    url.searchParams.set("year", String(fs5Year));
    url.searchParams.set("month", String(fs5Month));
    if (fs5EmployeeFilter) url.searchParams.set("employeeId", fs5EmployeeFilter);

    setLoadingPayslips(true);
    setPreviewError("");

    fetch(url.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list: PayslipItem[] = data?.payslips ?? [];
        // Sort by employee then by createdAt
        const sorted = [...list].sort((a, b) => {
          const am = `${a.employee.lastName} ${a.employee.firstName}`.toLowerCase();
          const bm = `${b.employee.lastName} ${b.employee.firstName}`.toLowerCase();
          if (am < bm) return -1;
          if (am > bm) return 1;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        setPayslips(sorted);
        setSelectedPayslipIds(new Set(sorted.map((p) => p.id)));
      })
      .catch((e) => setPreviewError(e?.message ?? "Failed to load payslips"))
      .finally(() => setLoadingPayslips(false));
  }, [orgId, tab, fs5Year, fs5Month, fs5EmployeeFilter]);

  // Load previously generated FS5 forms for FS7 selection
  useEffect(() => {
    if (!orgId) return;
    if (tab !== "fs7") return;

    const url = new URL("/api/fss/forms", window.location.origin);
    url.searchParams.set("organisationId", orgId);
    url.searchParams.set("type", "FS5");
    url.searchParams.set("year", String(fs7Year));

    setLoadingFs5Forms(true);
    setPreviewError("");

    fetch(url.toString(), { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list: Fs5FormItem[] = data?.forms ?? [];
        const sorted = [...list].sort((a, b) => (a.month ?? 0) - (b.month ?? 0));
        setFs5Forms(sorted);
        setSelectedFs5FormIds(new Set(sorted.map((f) => f.id)));
      })
      .catch((e) => setPreviewError(e?.message ?? "Failed to load FS5 forms"))
      .finally(() => setLoadingFs5Forms(false));
  }, [orgId, tab, fs7Year]);

  const selectedPayslips = useMemo(
    () => payslips.filter((p) => selectedPayslipIds.has(p.id)),
    [payslips, selectedPayslipIds]
  );

  const payslipTotals = useMemo(() => {
    const gross = selectedPayslips.reduce((a, p) => a + p.grossCents, 0);
    const tax = selectedPayslips.reduce((a, p) => a + p.taxCents, 0);
    const ni = selectedPayslips.reduce((a, p) => a + p.niCents, 0);
    const net = selectedPayslips.reduce((a, p) => a + p.netCents, 0);
    const payees = new Set(selectedPayslips.map((p) => p.employee.id)).size;
    return { gross, tax, ni, net, payees, count: selectedPayslips.length };
  }, [selectedPayslips]);

  // Live preview (debounced)
  useEffect(() => {
    if (!orgId) return;
    if (tab === "fs3" && !fs3EmployeeId) return;

    setPreviewUrl("");
    setPreviewError("");

    const t = setTimeout(async () => {
      try {
        let endpoint = "";
        let payload: any = { organisationId: orgId, overrideFields };

        if (tab === "fs5") {
          endpoint = "/api/fss/fs5/preview";
          payload = {
            ...payload,
            payslipIds: Array.from(selectedPayslipIds),
            paymentMonth: `${String(fs5Month).padStart(2, "0")}/${fs5Year}`,
            payDate: toDMY(fs5PayDate),
            chequeNo: fs5ChequeNo,
            bankAccountNo: fs5BankAcc,
            bank: fs5Bank,
            branch: fs5Branch,
            payerFullName: fs5PayerName,
          };
        } else if (tab === "fs7") {
          endpoint = "/api/fss/fs7/preview";
          payload = {
            ...payload,
            fs5FormIds: Array.from(selectedFs5FormIds),
            year: fs7Year,
            date: toDMY(fs7Date),
            itRegNo: fs7ItReg,
            jobsplusRegNo: fs7Jobsplus,
            childcare: {
              answer: fs7ChildcareAns || undefined,
              amount: fs7ChildcareAmount,
              employees: fs7ChildcareEmployees,
            },
            shareOptions: {
              answer: fs7ShareAns || undefined,
              amount: fs7ShareAmount,
              employees: fs7ShareEmployees,
            },
            principalFullName: fs7PrincipalName,
            principalPosition: fs7PrincipalPosition,
            principalSignature: fs7PrincipalName,
          };
        } else {
          endpoint = "/api/fss/fs3/preview";
          payload = {
            ...payload,
            employeeId: fs3EmployeeId,
            year: fs3Year,
            date: toDMY(fs3Date),
            periodFrom: toDMY(fs3PeriodFrom),
            periodTo: toDMY(fs3PeriodTo),
          };
        }

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error ?? `Preview failed (${res.status})`);
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (lastPreviewUrlRef.current) URL.revokeObjectURL(lastPreviewUrlRef.current);
        lastPreviewUrlRef.current = url;
        setPreviewUrl(url);
      } catch (e: any) {
        setPreviewError(e?.message ?? "Failed to generate preview");
      }
    }, 450);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    orgId,
    fs5Year,
    fs5Month,
    fs5PayDate,
    fs5ChequeNo,
    fs5BankAcc,
    fs5Bank,
    fs5Branch,
    fs5PayerName,
    selectedPayslipIds,
    fs7Year,
    fs7Date,
    fs7ItReg,
    fs7Jobsplus,
    fs7ChildcareAns,
    fs7ChildcareAmount,
    fs7ChildcareEmployees,
    fs7ShareAns,
    fs7ShareAmount,
    fs7ShareEmployees,
    fs7PrincipalName,
    fs7PrincipalPosition,
    selectedFs5FormIds,
    fs3EmployeeId,
    fs3Year,
    fs3Date,
    fs3PeriodFrom,
    fs3PeriodTo,
    overrideFields,
  ]);

  function togglePayslip(id: string) {
    setSelectedPayslipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleFs5Form(id: string) {
    setSelectedFs5FormIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function downloadGenerate() {
    setPreviewError("");
    try {
      let endpoint = "";
      let payload: any = { organisationId: orgId, overrideFields };
      let filename = "fss.pdf";

      if (tab === "fs5") {
        endpoint = "/api/fss/fs5/generate";
        filename = `fs5-${String(fs5Month).padStart(2, "0")}-${fs5Year}.pdf`;
        payload = {
          ...payload,
          payslipIds: Array.from(selectedPayslipIds),
          paymentMonth: `${String(fs5Month).padStart(2, "0")}/${fs5Year}`,
          payDate: fs5PayDate,
          chequeNo: fs5ChequeNo,
          bankAccountNo: fs5BankAcc,
          bank: fs5Bank,
          branch: fs5Branch,
          payerFullName: fs5PayerName,
        };
      } else if (tab === "fs7") {
        endpoint = "/api/fss/fs7/generate";
        filename = `fs7-${fs7Year}.pdf`;
        payload = {
          ...payload,
          fs5FormIds: Array.from(selectedFs5FormIds),
          year: fs7Year,
          date: fs7Date,
          itRegNo: fs7ItReg,
          jobsplusRegNo: fs7Jobsplus,
          childcare: { answer: fs7ChildcareAns || undefined, amount: fs7ChildcareAmount, employees: fs7ChildcareEmployees },
          shareOptions: { answer: fs7ShareAns || undefined, amount: fs7ShareAmount, employees: fs7ShareEmployees },
          principalFullName: fs7PrincipalName,
          principalPosition: fs7PrincipalPosition,
          principalSignature: fs7PrincipalName,
        };
      } else {
        endpoint = "/api/fss/fs3/generate";
        filename = `fs3-${fs3Year}.pdf`;
        payload = {
          ...payload,
          employeeId: fs3EmployeeId,
          year: fs3Year,
          date: fs3Date,
          periodFrom: fs3PeriodFrom,
          periodTo: fs3PeriodTo,
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `Generate failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setPreviewError(e?.message ?? "Failed to generate");
    }
  }

  const overrideEntries = Object.entries(overrideFields);

  const fullInput: CSSProperties = { ...inputBase, width: "100%", marginTop: 6 };
  const fullSelect: CSSProperties = { ...inputBase, width: "100%", marginTop: 6, height: 38 };
  const lightRow: CSSProperties = {
    ...row,
    borderRadius: 0,
    border: "none",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "transparent",
    padding: 10,
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 16 }}>
      <div style={panel}>
        <h2 style={{ marginTop: 0 }}>FSS Forms</h2>

        <label>Company</label>
        <select value={orgId} onChange={(e) => setOrgId(e.target.value)} style={fullSelect}>
          {organisations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => setTab("fs5")}
            style={{ ...(tab === "fs5" ? primaryBtn : ghostBtn), flex: 1, justifyContent: "center" } as any}
          >
            FS5
          </button>
          <button
            onClick={() => setTab("fs7")}
            style={{ ...(tab === "fs7" ? primaryBtn : ghostBtn), flex: 1, justifyContent: "center" } as any}
          >
            FS7
          </button>
          <button
            onClick={() => setTab("fs3")}
            style={{ ...(tab === "fs3" ? primaryBtn : ghostBtn), flex: 1, justifyContent: "center" } as any}
          >
            FS3
          </button>
        </div>

        {tab === "fs5" && (
          <div style={{ marginTop: 14 }}>
            <h3 style={{ margin: "10px 0" }}>FS5 (Monthly)</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label>Year</label>
                <input type="number" value={fs5Year} onChange={(e) => setFs5Year(Number(e.target.value))} style={fullInput} />
              </div>
              <div>
                <label>Month</label>
                <input type="number" min={1} max={12} value={fs5Month} onChange={(e) => setFs5Month(Number(e.target.value))} style={fullInput} />
              </div>
            </div>

            <label style={{ marginTop: 10, display: "block" }}>Filter employee (optional)</label>
            <select value={fs5EmployeeFilter} onChange={(e) => setFs5EmployeeFilter(e.target.value)} style={fullSelect}>
              <option value="">All employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>

            <label style={{ marginTop: 10, display: "block" }}>Date of payment</label>
            <input type="date" value={fs5PayDate} onChange={(e) => setFs5PayDate(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Cheque/Receipt no.</label>
            <input value={fs5ChequeNo} onChange={(e) => setFs5ChequeNo(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Bank account no.</label>
            <input value={fs5BankAcc} onChange={(e) => setFs5BankAcc(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Bank</label>
            <input value={fs5Bank} onChange={(e) => setFs5Bank(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Branch</label>
            <input value={fs5Branch} onChange={(e) => setFs5Branch(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Name of payer</label>
            <input value={fs5PayerName} onChange={(e) => setFs5PayerName(e.target.value)} style={fullInput} />

            <div style={{ marginTop: 12, padding: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
              <div style={{ fontSize: 13 }}>
                Selected payslips: <b>{payslipTotals.count}</b> · Payees: <b>{payslipTotals.payees}</b>
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                Gross €{moneyFromCents(payslipTotals.gross)} · Tax €{moneyFromCents(payslipTotals.tax)} · SSC €{moneyFromCents(payslipTotals.ni)}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Payslips</b>
                <button
                  onClick={() => setSelectedPayslipIds(new Set(payslips.map((p) => p.id)))}
                  style={ghostBtn}
                >
                  Select all
                </button>
              </div>

              {loadingPayslips ? (
                <div style={{ marginTop: 10, color: "#6b7280" }}>Loading…</div>
              ) : payslips.length === 0 ? (
                <div style={{ marginTop: 10, color: "#6b7280" }}>No payslips found.</div>
              ) : (
                <div style={{ marginTop: 10, maxHeight: 230, overflow: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                  {payslips.map((p) => (
                    <label
                      key={p.id}
                      style={{
                        ...lightRow,
                        background: selectedPayslipIds.has(p.id) ? "rgba(59,130,246,0.12)" : "transparent",
                      }}
                    >
                      <input type="checkbox" checked={selectedPayslipIds.has(p.id)} onChange={() => togglePayslip(p.id)} />
                      <div style={{ fontSize: 13 }}>
                        <div>
                          {p.employee.firstName} {p.employee.lastName} ·{" "}
                          <span style={{ color: "#6b7280" }}>
                            {p.payPeriodFrom && p.payPeriodTo
                              ? `Pay period ${String(p.payPeriodFrom).slice(0, 10)} → ${String(p.payPeriodTo).slice(0, 10)}`
                              : monthLabelFromKey(p.monthKey)}
                          </span>
                        </div>
                        <div style={{ color: "#6b7280" }}>Gross €{moneyFromCents(p.grossCents)} · Tax €{moneyFromCents(p.taxCents)} · SSC €{moneyFromCents(p.niCents)}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "fs7" && (
          <div style={{ marginTop: 14 }}>
            <h3 style={{ margin: "10px 0" }}>FS7 (Annual)</h3>

            <label>Year</label>
            <input type="number" value={fs7Year} onChange={(e) => setFs7Year(Number(e.target.value))} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Date</label>
            <input type="date" value={fs7Date} onChange={(e) => setFs7Date(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>IT Reg. No.</label>
            <input value={fs7ItReg} onChange={(e) => setFs7ItReg(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Jobsplus Reg. No.</label>
            <input value={fs7Jobsplus} onChange={(e) => setFs7Jobsplus(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Childcare</label>
            <select value={fs7ChildcareAns} onChange={(e) => setFs7ChildcareAns(e.target.value as any)} style={fullSelect}>
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <div>
                <label>Amount</label>
                <input value={fs7ChildcareAmount} onChange={(e) => setFs7ChildcareAmount(e.target.value)} style={fullInput} />
              </div>
              <div>
                <label>Employees</label>
                <input value={fs7ChildcareEmployees} onChange={(e) => setFs7ChildcareEmployees(e.target.value)} style={fullInput} />
              </div>
            </div>

            <label style={{ marginTop: 10, display: "block" }}>Share Options</label>
            <select value={fs7ShareAns} onChange={(e) => setFs7ShareAns(e.target.value as any)} style={fullSelect}>
              <option value="">—</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              <div>
                <label>Amount</label>
                <input value={fs7ShareAmount} onChange={(e) => setFs7ShareAmount(e.target.value)} style={fullInput} />
              </div>
              <div>
                <label>Employees</label>
                <input value={fs7ShareEmployees} onChange={(e) => setFs7ShareEmployees(e.target.value)} style={fullInput} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
              <div>
                <label>Principal name</label>
                <input value={fs7PrincipalName} onChange={(e) => setFs7PrincipalName(e.target.value)} style={fullInput} />
              </div>
              <div>
                <label>Principal position</label>
                <input value={fs7PrincipalPosition} onChange={(e) => setFs7PrincipalPosition(e.target.value)} style={fullInput} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Use previously generated FS5 forms</b>
                <button
                  onClick={() => setSelectedFs5FormIds(new Set(fs5Forms.map((f) => f.id)))}
                  style={ghostBtn}
                >
                  Select all
                </button>
              </div>

              {loadingFs5Forms ? (
                <div style={{ marginTop: 10, color: "#6b7280" }}>Loading…</div>
              ) : fs5Forms.length === 0 ? (
                <div style={{ marginTop: 10, color: "#6b7280" }}>No FS5 forms found for {fs7Year}. Generate FS5 first.</div>
              ) : (
                <div style={{ marginTop: 10, maxHeight: 230, overflow: "auto", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 }}>
                  {fs5Forms.map((f) => (
                    <label
                      key={f.id}
                      style={{
                        ...lightRow,
                        background: selectedFs5FormIds.has(f.id) ? "rgba(59,130,246,0.12)" : "transparent",
                      }}
                    >
                      <input type="checkbox" checked={selectedFs5FormIds.has(f.id)} onChange={() => toggleFs5Form(f.id)} />
                      <div style={{ fontSize: 13 }}>
                        <div>
                          Month: <b>{String(f.month ?? "").padStart(2, "0")}/{f.year}</b> · <span style={{ color: "#6b7280" }}>{new Date(f.createdAt).toLocaleString()}</span>
                        </div>
                        <div style={{ color: "#6b7280" }}>
                          Gross €{(Number(f.data?.grossCents ?? 0) / 100).toFixed(2)} · Tax €{(Number(f.data?.taxCents ?? 0) / 100).toFixed(2)} · SSC €{(Number(f.data?.niCents ?? 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "fs3" && (
          <div style={{ marginTop: 14 }}>
            <h3 style={{ margin: "10px 0" }}>FS3 (Per employee)</h3>

            <label>Employee</label>
            <select value={fs3EmployeeId} onChange={(e) => setFs3EmployeeId(e.target.value)} style={fullSelect}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>

            <label style={{ marginTop: 10, display: "block" }}>Year</label>
            <input type="number" value={fs3Year} onChange={(e) => setFs3Year(Number(e.target.value))} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Period from</label>
            <input type="date" value={fs3PeriodFrom} onChange={(e) => setFs3PeriodFrom(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Period to</label>
            <input type="date" value={fs3PeriodTo} onChange={(e) => setFs3PeriodTo(e.target.value)} style={fullInput} />

            <label style={{ marginTop: 10, display: "block" }}>Date</label>
            <input type="date" value={fs3Date} onChange={(e) => setFs3Date(e.target.value)} style={fullInput} />
          </div>
        )}

        <hr style={{ margin: "16px 0" }} />

        <details>
          <summary style={{ cursor: "pointer" }}>
            <b>Edit PDF fields</b> (optional)
          </summary>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Add or change any PDF form field by name. These values override the auto-calculated ones and update the live preview.
            </div>

            {overrideEntries.length === 0 && <div style={{ marginTop: 10, color: "#6b7280" }}>No overrides yet.</div>}

            {overrideEntries.map(([k, v]) => (
              <div key={k} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginTop: 8 }}>
                <input value={k} readOnly style={{ ...inputBase, opacity: 0.85 }} />
                <input
                  value={String(v ?? "")}
                  onChange={(e) => setOverrideFields((prev) => ({ ...prev, [k]: e.target.value }))}
                  style={inputBase}
                />
                <button
                  onClick={() =>
                    setOverrideFields((prev) => {
                      const next = { ...prev };
                      delete next[k];
                      return next;
                    })
                  }
                  style={{ padding: "8px 10px" }}
                >
                  ✕
                </button>
              </div>
            ))}

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input id="newFieldKey" placeholder="field_name" style={inputBase} />
              <input id="newFieldVal" placeholder="value" style={inputBase} />
            </div>
            <button
              onClick={() => {
                const k = (document.getElementById("newFieldKey") as HTMLInputElement)?.value?.trim();
                const v = (document.getElementById("newFieldVal") as HTMLInputElement)?.value ?? "";
                if (!k) return;
                setOverrideFields((prev) => ({ ...prev, [k]: v }));
                (document.getElementById("newFieldKey") as HTMLInputElement).value = "";
                (document.getElementById("newFieldVal") as HTMLInputElement).value = "";
              }}
              style={{ marginTop: 8, padding: 10, width: "100%", borderRadius: 8 }}
            >
              Add override
            </button>
          </div>
        </details>

        <button onClick={downloadGenerate} style={{ ...primaryBtn, marginTop: 14, width: "100%" }}>
          Generate & Save
        </button>

        {previewError && <div style={{ marginTop: 10, color: "#b91c1c" }}>{previewError}</div>}
      </div>

      <div style={{ ...panel, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <b>Live preview</b>
        </div>
        {previewUrl ? (
          <PdfPreview url={previewUrl} />
        ) : (
          <div style={{ padding: 14, color: "#6b7280" }}>Preview will appear here…</div>
        )}
      </div>
    </div>
  );
}
