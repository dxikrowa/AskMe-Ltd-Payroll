"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PdfPreview from "@/components/pdf-preview";
import { calculateMaltaPayroll, type Period, type EmploymentType } from "@/lib/payroll/malta";
import { MONTHLY_AVG_HOURS_FULLTIME } from "@/lib/malta";
import taxVars from "@/lib/payroll/tax_variables.json";

const WEEKLY_ALLOWANCE = (taxVars as any).WEEKLY_ALLOWANCE ?? 121.16;
const WEEKLY_ALLOWANCE_2 = (taxVars as any).WEEKLY_ALLOWANCE_2 ?? 121.16;
const STATUTORY_BONUS = (taxVars as any).STATUTORY_BONUS ?? 135.10;
const STATUTORY_BONUS_2 = (taxVars as any).STATUTORY_BONUS_2 ?? 135.10;

type FormState = {
  grossWage: string;
  period: Period;
  taxStatus: number;
  employmentType: EmploymentType;

  includeAllowance1: boolean;
  includeAllowance2: boolean;
  includeBonus1: boolean;
  includeBonus2: boolean;

  includeNI: boolean;
  under17: boolean;
  apprentice: boolean;
  before1962: boolean;
};

type PayslipFields = {
  employee_name: string;
  employee_id: string;
  employee_designation: string;

  employer_name: string;
  employer_address: string;

  pe_number: string;
  ssn_number: string;

  pay_period_from: string;
  pay_period_to: string;

  // Some templates expose only `overtime_up_to`.
  // Newer templates expose dedicated overtime 1.5 fields.
  overtime_up_to: string;
  overtime_15_hours: string;
  overtime_15_thispay: string;

  basicpay_hours: string;
  basicpay_thispay: string;

  vl_pay_hours: string;
  vl_pay_thispay: string;

  thispay_march_supplement: string;
  thispay_june_bonus: string;
  thispay_september_supplement: string;
  thispay_december_bonus: string;

  thispay_allowances: string;
  thispay_commissions: string;

  thispay_grosspay: string;
  thispay_ni: string;
  thispay_tax: string;
  thispay_netpay: string;

  hours_vlentitled: string;
  hours_vlfrom: string;
  hours_vlconsumed: string;
  hours_vlremaining: string;

  ttd_basicpay: string;
  ttd_grosspay: string;
  ttd_netpay: string;

  ttd_vlpay: string;
  sl_pay_hours: string;
  sl_pay_thispay: string;
  ttd_sl_pay: string;
  ttd_overtime_15: string;
  ttd_commissions: string;
  ttd_allowances: string;
  ttd_december_bonus: string;
  ttd_september_supplement: string;
  ttd_june_bonus: string;
  ttd_march_supplement: string;
};

const emptyPayslipFields: PayslipFields = {
  employee_name: "",
  employee_id: "",
  employee_designation: "",

  employer_name: "",
  employer_address: "",

  pe_number: "",
  ssn_number: "",

  pay_period_from: "",
  pay_period_to: "",

  overtime_up_to: "",
  overtime_15_hours: "",
  overtime_15_thispay: "",

  basicpay_hours: "",
  basicpay_thispay: "",

  vl_pay_hours: "",
  vl_pay_thispay: "",

  thispay_march_supplement: "",
  thispay_june_bonus: "",
  thispay_september_supplement: "",
  thispay_december_bonus: "",

  thispay_allowances: "",
  thispay_commissions: "",

  thispay_grosspay: "",
  thispay_ni: "",
  thispay_tax: "",
  thispay_netpay: "",

  hours_vlentitled: "",
  hours_vlfrom: "",
  hours_vlconsumed: "",
  hours_vlremaining: "",

  ttd_basicpay: "",
  ttd_grosspay: "",
  ttd_netpay: "",

  ttd_vlpay: "",
  sl_pay_hours: "",
  sl_pay_thispay: "",
  ttd_sl_pay: "",
  ttd_overtime_15: "",
  ttd_commissions: "",
  ttd_allowances: "",
  ttd_december_bonus: "",
  ttd_september_supplement: "",
  ttd_june_bonus: "",
  ttd_march_supplement: "",
};

function money(n: number) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


function parseMoneyish(v: any) {
  const n = Number.parseFloat((v ?? "").toString().replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toIsoDate(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function minutesToHours(mins: number) {
  const h = mins / 60;
  return Math.round(h * 100) / 100;
}

function annualEntitlementMinutes(employee: any) {
  const weekly = Number(employee?.normalWeeklyHours ?? 40);
  const pro = weekly / 40;
  // Malta vacation leave entitlement: 216h (pro-rated by normal weekly hours)
  return Math.round(216 * 60 * pro);
}

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

function baseHoursForPeriod(employee: any, period: Period): number {
  const weekly = Number(employee?.normalWeeklyHours ?? 40);
  const pro = weekly / 40;
  const override = Number(employee?.partTimeHoursOverride ?? 0);
  if (employee?.employmentType === "PART_TIME" && override > 0 && period !== "Annual") return override;
  if (period === "Weekly") return weekly;
  if (period === "Annual") return weekly * 52;
  return MONTHLY_AVG_HOURS_FULLTIME * pro;
}

export default function RunPayrollPage() {
  const searchParams = useSearchParams();
  const employeeIdParam = searchParams.get("employeeId");

  const [form, setForm] = useState<FormState>({
    grossWage: "0",
    period: "Monthly",
    taxStatus: 1,
    employmentType: "Full_Time",

    includeAllowance1: false,
    includeAllowance2: false,
    includeBonus1: false,
    includeBonus2: false,

    includeNI: true,
    under17: false,
    apprentice: false,
    before1962: false,
  });

  const [payslipFields, setPayslipFields] = useState<PayslipFields>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { ...emptyPayslipFields, pay_period_from: toIsoDate(start), pay_period_to: toIsoDate(end) };
  });

  // If true: calculator auto-writes the money fields in the payslip form
  const [autoFillMoneyFields, setAutoFillMoneyFields] = useState(true);
  const [autoFillVacationLeave, setAutoFillVacationLeave] = useState(true);

  const [employeeDbId, setEmployeeDbId] = useState<string>("");
  const [organisationId, setOrganisationId] = useState<string>("");
  const [employeeForLeave, setEmployeeForLeave] = useState<any>(null);
  const [availablePayslips, setAvailablePayslips] = useState<any[]>([]);
  const [selectedPayslipIds, setSelectedPayslipIds] = useState<string[]>([]);
  const [pdfActionStatus, setPdfActionStatus] = useState<"idle" | "generating" | "downloading">("idle");

  // --------- import employee + org via employeeId query param ----------
  useEffect(() => {
    if (!employeeIdParam) return;

    let cancelled = false;

    (async () => {
      const res = await fetch(`/api/employees/${employeeIdParam}`, { cache: "no-store" });
      if (!res.ok) return;

      const data = await res.json();
      if (cancelled) return;

      const emp = data.employee;
      const org = data.organisation;

      setEmployeeDbId(emp.dbId);
      setOrganisationId(emp.organisationId);
      setEmployeeForLeave(emp);

      // Calculator defaults from employee
      setForm((s) => ({
        ...s,
        grossWage: ((emp.baseWageCents ?? 0) / 100).toFixed(2),
        period: emp.payFrequency === "WEEKLY" ? "Weekly" : emp.payFrequency === "ANNUAL" ? "Annual" : "Monthly",
        taxStatus: emp.taxStatus ?? 1,
        employmentType: emp.employmentType === "PART_TIME" ? "Part_Time" : "Full_Time",

        includeNI: Boolean(emp.includeNI),
        under17: Boolean(emp.under17),
        apprentice: Boolean(emp.apprentice),
        before1962: Boolean(emp.before1962),

        includeAllowance1: Boolean(emp.includeAllowance1),
        includeAllowance2: Boolean(emp.includeAllowance2),
        includeBonus1: Boolean(emp.includeBonus1),
        includeBonus2: Boolean(emp.includeBonus2),
      }));

      // Payslip identity fields
      const employerAddress = [org.address1, org.address2].filter(Boolean).join(", ");
      setPayslipFields((p) => ({
        ...p,
        employee_name: `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim(),
        employee_id: emp.idNumber ?? "",
        employee_designation: emp.designation ?? "",
        employer_name: org.name ?? "",
        employer_address: employerAddress,
        pe_number: org.peNumber ?? "",
        ssn_number: emp.ssnNumber ?? "",
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [employeeIdParam]);

  useEffect(() => {
    if (!employeeDbId) {
      setAvailablePayslips([]);
      setSelectedPayslipIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/payslips?employeeId=${employeeDbId}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!cancelled) setAvailablePayslips(data.payslips ?? []);
    })();
    return () => { cancelled = true; };
  }, [employeeDbId]);

  const gross = Number(form.grossWage || 0);

  // Extra taxable/NI-able amounts entered on the payslip (allowances/commissions/overtime).
  const extraTaxable = useMemo(() => {
    const parse = (v: any) => {
      const n = Number.parseFloat((v ?? "").toString().replace(/,/g, ""));
      return Number.isFinite(n) ? n : 0;
    };
    return parse(payslipFields.thispay_allowances) + parse(payslipFields.thispay_commissions) + parse(payslipFields.overtime_15_thispay);
  }, [payslipFields.thispay_allowances, payslipFields.thispay_commissions, payslipFields.overtime_15_thispay]);

  const result = useMemo(() => {
    if (!gross || gross < 0) return null;
    try {
      return calculateMaltaPayroll({
        // Calculator uses the taxable wage for the period.
        // Base wage stays in "basic pay"; extras are handled as separate lines but still affect tax/NI.
        grossWage: gross + extraTaxable,
        period: form.period,
        taxStatus: form.taxStatus,
        employmentType: form.employmentType,

        includeAllowance1: form.includeAllowance1,
        includeAllowance2: form.includeAllowance2,
        includeBonus1: form.includeBonus1,
        includeBonus2: form.includeBonus2,

        includeNI: form.includeNI,
        under17: form.under17,
        apprentice: form.apprentice,
        before1962: form.before1962,
      });
    } catch {
      return null;
    }
  }, [gross, extraTaxable, form]);

  // --------- auto-fill PDF money fields from calculator result ----------
  useEffect(() => {
    if (!result) return;
    if (!autoFillMoneyFields) return;

    // result.grossPerPeriod already includes user-entered taxable extras (allowances/commissions/overtime).
    const grossWithExtras = result.grossPerPeriod + result.allowancePerPeriod + result.bonusPerPeriod;

    setPayslipFields((p) => ({
      ...p,
      // Basic pay remains the base gross wage
      basicpay_thispay: gross.toFixed(2),
      // Gross pay for the pay run should include statutory bonuses/allowances
      thispay_grosspay: grossWithExtras.toFixed(2),
      thispay_tax: result.taxPerPeriod.toFixed(2),
      thispay_ni: result.niPerPeriod.toFixed(2),
      thispay_netpay: result.netPerPeriod.toFixed(2),
      // Allowances & commissions are editable in the payslip form; do not overwrite user input.

      // Statutory one-off amounts (also shown in preview + PDF)
      thispay_march_supplement: form.includeAllowance1 ? (WEEKLY_ALLOWANCE).toFixed(2) : "",
      thispay_september_supplement: form.includeAllowance2 ? (WEEKLY_ALLOWANCE_2).toFixed(2) : "",
      thispay_june_bonus: form.includeBonus1 ? (STATUTORY_BONUS).toFixed(2) : "",
      thispay_december_bonus: form.includeBonus2 ? (STATUTORY_BONUS_2).toFixed(2) : "",
    }));
  }, [result, autoFillMoneyFields, form.includeAllowance1, form.includeAllowance2, form.includeBonus1, form.includeBonus2]);

  // --------- auto-fill overtime fields from /timesheets (month of pay_period_to) ----------
  useEffect(() => {
    if (!organisationId || !employeeDbId) return;
    const from = payslipFields.pay_period_from;
    const to = payslipFields.pay_period_to;
    if (!from || !to) return;
    let cancelled = false;
    (async () => {
      const qs = new URLSearchParams({ organisationId, employeeId: employeeDbId });
      const res = await fetch(`/api/sick-leave?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;
      const rows: any[] = data.rows ?? [];
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime();
      const inPeriod = rows.filter((r) => {
        const ms = new Date(r.startDate).getTime();
        return ms >= fromMs && ms <= toMs;
      });
      const hoursPerDay = Number(inPeriod[0]?.meta?.hoursPerDay ?? (employeeForLeave?.normalWeeklyHours ? employeeForLeave.normalWeeklyHours / 5 : 8));
      const weightedSickDays = inPeriod.reduce((a, r) => {
        const days = Number(r.meta?.sickDays ?? 0);
        const payType = String(r.meta?.payType ?? "FULL_PAY");
        const factor = payType === "HALF_PAY" ? 0.5 : payType === "NO_PAY" ? 0 : 1;
        return a + days * factor;
      }, 0);
      const sickHours = Math.round(weightedSickDays * hoursPerDay * 100) / 100;
      const baseHours = employeeForLeave ? baseHoursForPeriod(employeeForLeave, form.period) : 0;
      const hourlyRate = baseHours > 0 ? gross / baseHours : 0;
      const sickPay = Math.round(sickHours * hourlyRate * 100) / 100;
      const basicHoursAfterSl = Math.max(0, Math.round((baseHours - sickHours) * 100) / 100);
      const basicPayAfterSl = Math.max(0, Math.round((gross - sickPay) * 100) / 100);
      setPayslipFields((p) => ({
        ...p,
        basicpay_hours: sickHours ? basicHoursAfterSl.toFixed(2) : p.basicpay_hours,
        basicpay_thispay: sickHours ? basicPayAfterSl.toFixed(2) : p.basicpay_thispay,
        sl_pay_hours: sickHours ? sickHours.toFixed(2) : "",
        sl_pay_thispay: sickHours ? sickPay.toFixed(2) : "",
      }));
    })();
    return () => { cancelled = true; };
  }, [organisationId, employeeDbId, employeeForLeave, payslipFields.pay_period_from, payslipFields.pay_period_to, gross, form.period]);

  const selectedPayslips = useMemo(() => availablePayslips.filter((p) => selectedPayslipIds.includes(p.id)), [availablePayslips, selectedPayslipIds]);

  useEffect(() => {
    const totals = selectedPayslips.reduce((acc, p) => {
      acc.basic += Number(p.grossCents ?? 0) / 100;
      acc.gross += Number(p.grossCents ?? 0) / 100;
      acc.net += Number(p.netCents ?? 0) / 100;
      acc.vl += Number(p.vacationConsumedMinutes ?? 0) / 60 * ((Number(p.grossCents ?? 0) / 100) / Math.max(1, Number(payslipFields.basicpay_hours || 0) || 1));
      acc.sl += 0;
      acc.ot += Number(p.overtimeCents ?? 0) / 100;
      return acc;
    }, { basic: 0, gross: 0, net: 0, vl: 0, sl: 0, ot: 0 });

    const currentBasic = parseMoneyish(payslipFields.basicpay_thispay);
    const currentGross = parseMoneyish(payslipFields.thispay_grosspay);
    const currentNet = parseMoneyish(payslipFields.thispay_netpay);
    const currentVl = parseMoneyish(payslipFields.vl_pay_thispay);
    const currentSl = parseMoneyish(payslipFields.sl_pay_thispay);
    const currentOt = parseMoneyish(payslipFields.overtime_15_thispay);

    setPayslipFields((p) => ({
      ...p,
      ttd_basicpay: (totals.basic + currentBasic).toFixed(2),
      ttd_grosspay: (totals.gross + currentGross).toFixed(2),
      ttd_netpay: (totals.net + currentNet).toFixed(2),
      ttd_vlpay: (totals.vl + currentVl).toFixed(2),
      ttd_sl_pay: (totals.sl + currentSl).toFixed(2),
      ttd_overtime_15: (totals.ot + currentOt).toFixed(2),
      ttd_commissions: parseMoneyish(p.thispay_commissions).toFixed(2),
      ttd_allowances: parseMoneyish(p.thispay_allowances).toFixed(2),
      ttd_december_bonus: parseMoneyish(p.thispay_december_bonus).toFixed(2),
      ttd_september_supplement: parseMoneyish(p.thispay_september_supplement).toFixed(2),
      ttd_june_bonus: parseMoneyish(p.thispay_june_bonus).toFixed(2),
      ttd_march_supplement: parseMoneyish(p.thispay_march_supplement).toFixed(2),
    }));
  }, [selectedPayslips, payslipFields.basicpay_thispay, payslipFields.thispay_grosspay, payslipFields.thispay_netpay, payslipFields.vl_pay_thispay, payslipFields.sl_pay_thispay, payslipFields.overtime_15_thispay, payslipFields.thispay_commissions, payslipFields.thispay_allowances, payslipFields.thispay_december_bonus, payslipFields.thispay_september_supplement, payslipFields.thispay_june_bonus, payslipFields.thispay_march_supplement]);

  // ---------- Live PDF preview ----------
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const lastUrlRef = useRef<string>("");

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const t = setTimeout(async () => {
      try {
        const payload = { pdfFields: payslipFields };

        const res = await fetch("/api/payslips/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        if (!res.ok) return;

        setPdfActionStatus("downloading");
    const blob = await res.blob();
        const url = URL.createObjectURL(blob);

        if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = url;
        setPreviewUrl(url);
      } catch {
        // ignore
      }
    }, 350); // debounce

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [payslipFields]);

  async function generatePdf() {
    setPdfActionStatus("generating");
    if (!employeeDbId || !organisationId) {
      alert("Import an employee first (from Organisations) so the payslip can be saved.");
      setPdfActionStatus("idle");
      return;
    }

    const payload = {
      pdfFields: payslipFields,
      employeeDbId,
      organisationId,
    };

    const res = await fetch("/api/payslips/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to generate payslip PDF.");
      setPdfActionStatus("idle");
      return;
    }

    setPdfActionStatus("downloading");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "payslip.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPdfActionStatus("idle");
  }

  const shownPayslipKeys: (keyof PayslipFields)[] = [
    "employee_name",
    "employee_id",
    "employee_designation",
    "employer_name",
    "employer_address",
    "pay_period_from",
    "pay_period_to",
    "overtime_15_hours",
    "overtime_15_thispay",
    "basicpay_hours",
    // Editable money fields
    "thispay_allowances",
    "thispay_commissions",
    // Vacation leave (auto-filled)
    "hours_vlentitled",
    "hours_vlfrom",
    "hours_vlconsumed",
    "hours_vlremaining",
    "sl_pay_hours",
    "sl_pay_thispay",
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>Run Payroll</div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            
          </div>
        </div>
      </div>

      <div className="rp-layout">
        {/* LEFT */}
        <div>
          <Panel>
            <SectionTitle>Inputs</SectionTitle>

            <Grid2>
              <Field label="Gross wage">
                <Input value={form.grossWage} onChange={(v) => setForm((s) => ({ ...s, grossWage: v }))} placeholder="Gross Wage" />
              </Field>
              {form.employmentType === "Part_Time" && employeeForLeave?.hourlyWageCents ? (
                <div style={{ fontSize: 13, color: "var(--text)", opacity: 0.8, gridColumn: "1 / -1", padding: "8px 12px", background: "var(--toggle-on-bg)", borderRadius: 8 }}>
                  Hourly Wage configured: <strong>€{(employeeForLeave.hourlyWageCents / 100).toFixed(2)}</strong>/hr
                </div>
              ) : null}

              <Field label="Period">
                <Select
                  value={form.period}
                  onChange={(v) => setForm((s) => ({ ...s, period: v as Period }))}
                  options={[
                    { value: "Weekly", label: "Weekly" },
                    { value: "Monthly", label: "Monthly" },
                    { value: "Annual", label: "Annual" },
                  ]}
                />
              </Field>

              <Field label="Employment type">
                <Select
                  value={form.employmentType}
                  onChange={(v) => setForm((s) => ({ ...s, employmentType: v as EmploymentType }))}
                  options={[
                    { value: "Full_Time", label: "Full-time" },
                    { value: "Part_Time", label: "Part-time" },
                  ]}
                />
              </Field>

              <Field label="Tax status">
                <Select
                  value={String(form.taxStatus)}
                  onChange={(v) => setForm((s) => ({ ...s, taxStatus: Number(v) }))}
                  options={[
                    { value: "1", label: "Individual" },
                    { value: "2", label: "Married" },
                    { value: "3", label: "Parent" },
                    { value: "4", label: "Married and 1 Child" },
                    { value: "5", label: "Married and 2+ Children" },
                    { value: "6", label: "Parent and 1 Child" },
                    { value: "7", label: "Parent and 2+ Children" },
                  ]}
                />
              </Field>
            </Grid2>

            <Divider />

            <SectionTitle>Allowances & Bonuses</SectionTitle>
            <Grid2>
              <Toggle label="March Allowance 2026" checked={form.includeAllowance1} onChange={(checked) => setForm((s) => ({ ...s, includeAllowance1: checked }))} />
              <Toggle label="September Allowance 2026" checked={form.includeAllowance2} onChange={(checked) => setForm((s) => ({ ...s, includeAllowance2: checked }))} />
              <Toggle label="Statutory Bonus Jan-June 2026" checked={form.includeBonus1} onChange={(checked) => setForm((s) => ({ ...s, includeBonus1: checked }))} />
              <Toggle label="Statutory Bonus Jul-Dec 2026" checked={form.includeBonus2} onChange={(checked) => setForm((s) => ({ ...s, includeBonus2: checked }))} />
            </Grid2>

            <Divider />

            <SectionTitle>National Insurance</SectionTitle>
            <Grid2>
              <Toggle label="Include National Insurance?" checked={form.includeNI} onChange={(checked) => setForm((s) => ({ ...s, includeNI: checked }))} />
              <div />
              <Toggle label="Are You Under 17?" checked={form.under17} onChange={(checked) => setForm((s) => ({ ...s, under17: checked }))} disabled={!form.includeNI} />
              <Toggle label="Are You An Apprentice?" checked={form.apprentice} onChange={(checked) => setForm((s) => ({ ...s, apprentice: checked }))} disabled={!form.includeNI} />
              <Toggle label="Are You Born Before 1962?" checked={form.before1962} onChange={(checked) => setForm((s) => ({ ...s, before1962: checked }))} disabled={!form.includeNI} />
              <div />
            </Grid2>
          </Panel>

          <div style={{ marginTop: 16 }}>
            <Panel>
              <SectionTitle>Payslip entries</SectionTitle>

              <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <Toggle label="Auto-fill money fields" checked={autoFillMoneyFields} onChange={setAutoFillMoneyFields} />
                <Toggle label="Auto-fill vacation leave" checked={autoFillVacationLeave} onChange={setAutoFillVacationLeave} />
                <Button variant="ghost" onClick={() => setPayslipFields((p) => ({ ...emptyPayslipFields, pay_period_from: p.pay_period_from, pay_period_to: p.pay_period_to }))}>
                  Clear payslip fields
                </Button>
              </div>

              {employeeDbId ? (
                <div style={{ marginBottom: 14, padding: 12, border: "1px solid var(--panel-border)", borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 8 }}>Previously generated payslips for Total to Date</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {availablePayslips.map((row) => {
                      const checked = selectedPayslipIds.includes(row.id);
                      const label = `${row.payPeriodFrom ? new Date(row.payPeriodFrom).toISOString().slice(0,10) : new Date(row.createdAt).toISOString().slice(0,10)} → ${row.payPeriodTo ? new Date(row.payPeriodTo).toISOString().slice(0,10) : ""} | Gross €${(Number(row.grossCents ?? 0) / 100).toFixed(2)}`;
                      return (
                        <label key={row.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                          <input type="checkbox" checked={checked} onChange={(e) => setSelectedPayslipIds((prev) => e.target.checked ? [...prev, row.id] : prev.filter((id) => id !== row.id))} />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                    {availablePayslips.length === 0 ? <div style={{ opacity: 0.7, fontSize: 13 }}>No previous payslips found for this employee yet.</div> : null}
                  </div>
                </div>
              ) : null}

              <Grid2>
                {shownPayslipKeys.map((key) => {
                  const value = payslipFields[key];

                  const labelOverrides: Partial<Record<keyof PayslipFields, string>> = {
                    thispay_commissions: "Commissions",
                    thispay_allowances: "Allowances",
                    overtime_15_hours: "Overtime 1.5 Hours",
                    overtime_15_thispay: "Overtime 1.5 This Pay",
                    hours_vlentitled: "Hours V/L Entitled",
                    hours_vlfrom: "Hours V/L From",
                    hours_vlconsumed: "Hours V/L Used",
                    hours_vlremaining: "Hours V/L Remaining",
                  };

                  const label =
                    labelOverrides[key] ??
                    String(key)
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (m) => m.toUpperCase());

                  const isDateField = key === "pay_period_from" || key === "pay_period_to";

                  return (
                    <Field key={key} label={label}>
                      {isDateField ? (
                        <DateInput value={value} onChange={(v) => setPayslipFields((p) => ({ ...p, [key]: v } as PayslipFields))} />
                      ) : (
                        <Input
                          value={value}
                          onChange={(v) => setPayslipFields((p) => ({ ...p, [key]: v } as PayslipFields))}
                          placeholder={key.startsWith("hours_") ? "" : ""}
                        />
                      )}
                    </Field>
                  );
                })}
              </Grid2>

              <div style={{ marginTop: 14, padding: 12, border: "1px solid var(--panel-border)", borderRadius: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 8 }}>Total to Date</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, fontSize: 13 }}>
                  <div>Basic: €{payslipFields.ttd_basicpay || "0.00"}</div>
                  <div>Gross: €{payslipFields.ttd_grosspay || "0.00"}</div>
                  <div>Net: €{payslipFields.ttd_netpay || "0.00"}</div>
                  <div>Vacation Leave: €{payslipFields.ttd_vlpay || "0.00"}</div>
                  <div>Sick Leave: €{payslipFields.ttd_sl_pay || "0.00"}</div>
                  <div>Overtime: €{payslipFields.ttd_overtime_15 || "0.00"}</div>
                </div>
              </div>

              <Divider />

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button onClick={generatePdf} variant="primary">
                  {pdfActionStatus === "generating" ? "Generating payslip PDF..." : pdfActionStatus === "downloading" ? "Downloading payslip PDF..." : "Generate payslip PDF"}
                </Button>
              </div>
            </Panel>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          <Panel>
            <SectionTitle>Results</SectionTitle>
            {!result ? (
              <EmptyState text="Enter a gross wage to see the breakdown." />
            ) : (
              <>
                <StatGrid>
                  <Stat label="Gross" value={`€ ${money(result.grossPerPeriod)}`} />
                  <Stat label="Tax" value={`€ ${money(result.taxPerPeriod)}`} />
                  <Stat label="NI" value={`€ ${money(result.niPerPeriod)}`} />
                  <Stat label="Allowances" value={`€ ${money(result.allowancePerPeriod)}`} />
                  <Stat label="Bonuses" value={`€ ${money(result.bonusPerPeriod)}`} />
                  <Stat label="Net Pay" value={`€ ${money(result.netPerPeriod)}`} highlight />
                </StatGrid>

                <Divider />

                <SectionTitle>Annual summary</SectionTitle>
                <Table>
                  <Row k="Annual gross" v={`€ ${money(result.annual.gross)}`} />
                  <Row k="Annual taxable income" v={`€ ${money(result.annual.taxableIncome)}`} />
                  <Row k="Annual tax" v={`€ ${money(result.annual.tax)}`} />
                  <Row k="Annual NI" v={`€ ${money(result.annual.ni)}`} />
                  <Row k="Annual net" v={`€ ${money(result.annual.net)}`} strong />
                </Table>
              </>
            )}
          </Panel>

          <div style={{ marginTop: 16 }}>
            <Panel>
              <SectionTitle>Payslip preview (live)</SectionTitle>
              {!previewUrl ? (
                <EmptyState text="Fill payslip fields to preview the PDF." />
              ) : (
                <PdfPreview url={previewUrl} />
              )}
            </Panel>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rp-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .rp-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/* ---------- Minimal UI components (kept local to avoid extra dependencies) ---------- */

function Panel({ children }: { children: React.ReactNode }) {
  return <div style={{ borderRadius: 12, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--panel-border)" }}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>{children}</div>;
}

function Divider() {
  return <div style={{ height: 1, background: "var(--divider)", margin: "14px 0" }} />;
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: "100%",
        height: 38,
        padding: "0 12px",
        borderRadius: 10,
        color: disabled ? "var(--muted)" : "var(--text)",
        background: disabled ? "var(--input-bg-disabled)" : "var(--input-bg)",
        border: "1px solid var(--input-border)",
        outline: "none",
      }}
    />
  );
}

function DateInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: "100%",
        height: 38,
        padding: "0 12px",
        borderRadius: 10,
        color: disabled ? "var(--muted)" : "var(--text)",
        background: disabled ? "var(--input-bg-disabled)" : "var(--input-bg)",
        border: "1px solid var(--input-border)",
        outline: "none",
      }}
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", height: 38, padding: "0 12px", borderRadius: 10, color: "var(--text)", background: "var(--input-bg)", border: "1px solid var(--input-border)", outline: "none" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderRadius: 10,
        border: "1px solid var(--input-border)",
        background: disabled ? "var(--input-bg-disabled)" : checked ? "var(--toggle-on-bg)" : "var(--input-bg)",
        color: disabled ? "var(--muted)" : "var(--text)",
        cursor: disabled ? "not-allowed" : "pointer",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: 13 }}>{label}</span>
      <span style={{ opacity: 0.8 }}>{checked ? "On" : "Off"}</span>
    </button>
  );
}

function Button({ children, onClick, variant }: { children: React.ReactNode; onClick: () => void; variant: "primary" | "ghost" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 38,
        padding: "0 14px",
        borderRadius: 10,
        border: variant === "ghost" ? "1px solid var(--btn-ghost-border)" : "1px solid var(--btn-primary-border)",
        background: variant === "ghost" ? "var(--btn-ghost-bg)" : "var(--btn-primary-bg)",
        color: "var(--text)",
        cursor: "pointer",
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ padding: 14, borderRadius: 10, border: "1px dashed var(--dashed-border)", opacity: 0.8 }}>{text}</div>;
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>{children}</div>;
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ borderRadius: 12, padding: 12, border: "1px solid var(--panel-border)", background: highlight ? "var(--stat-highlight-bg)" : "var(--panel-bg)" }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gap: 8 }}>{children}</div>;
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, opacity: strong ? 1 : 0.9 }}>
      <div style={{ fontSize: 13 }}>{k}</div>
      <div style={{ fontSize: 13, fontWeight: strong ? 900 : 700 }}>{v}</div>
    </div>
  );
}

