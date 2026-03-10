"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCompany, updateCompany, deleteCompany,
  createEmployee, updateEmployee, deleteEmployee,
} from "./actions";

type Org = any; type Emp = any;
type PayFrequency = "WEEKLY" | "MONTHLY" | "ANNUAL";
type EmploymentType = "FULL_TIME" | "PART_TIME";

type CompanyForm = {
  name: string; address1: string; address2: string; addressHouseNo: string; addressStreet: string;
  addressLocality: string; addressPostcode: string; vatNumber: string; phone: string; phone2: string;
  peNumber: string; itRegistrationNumber: string; jobsplusRegistrationNumber: string;
  payrollManagerFullName: string; payrollManagerPosition: string;
};

type EmployeeForm = {
  firstName: string; lastName: string; designation: string; email: string; phone: string;
  idNumber: string; spouseIdNumber: string; ssnNumber: string; addressHouseNo: string;
  addressStreet: string; addressLocality: string; addressPostcode: string; baseWage: string;
  payFrequency: PayFrequency; taxStatus: number; employmentStartDate: string; normalWeeklyHours: string;
  under17: boolean; before1962: boolean; isStudent: boolean; employmentType: EmploymentType; hourlyWage: string;
};

const emptyCompanyForm = (): CompanyForm => ({
  name: "", address1: "", address2: "", addressHouseNo: "", addressStreet: "", addressLocality: "",
  addressPostcode: "", vatNumber: "", phone: "", phone2: "", peNumber: "", itRegistrationNumber: "",
  jobsplusRegistrationNumber: "", payrollManagerFullName: "", payrollManagerPosition: "",
});

const emptyEmployeeForm = (): EmployeeForm => ({
  firstName: "", lastName: "", designation: "", email: "", phone: "", idNumber: "", spouseIdNumber: "",
  ssnNumber: "", addressHouseNo: "", addressStreet: "", addressLocality: "", addressPostcode: "",
  baseWage: "", payFrequency: "MONTHLY", taxStatus: 1, employmentStartDate: new Date().toISOString().slice(0, 10),
  normalWeeklyHours: "40", under17: false, before1962: false, isStudent: false, employmentType: "FULL_TIME", hourlyWage: "",
});

function taxStatusLabel(v: any): string {
  const n = Number(v);
  switch (n) { case 1: return "Individual"; case 2: return "Married"; case 3: return "Parent"; case 4: return "Married and 1 Child"; case 5: return "Married and 2+ Children"; case 6: return "Parent and 1 Child"; case 7: return "Parent and 2+ Children"; default: return "—"; }
}

export default function OrganisationsClient({ organisations }: { organisations: Org[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(organisations[0]?.id ?? null);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return organisations;
    return organisations.filter((o) => (`${o.name ?? ""} ${o.vatNumber ?? ""} ${o.phone ?? ""} ${o.peNumber ?? ""}`.toLowerCase()).includes(q));
  }, [organisations, search]);

  const selectedOrg = useMemo(() => filteredOrgs.find((o) => o.id === selectedOrgId) ?? filteredOrgs[0] ?? null, [filteredOrgs, selectedOrgId]);
  const employeesAll: Emp[] = selectedOrg?.employees ?? [];

  const employees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employeesAll;
    return employeesAll.filter((e) => (`${e.firstName ?? ""} ${e.lastName ?? ""} ${e.email ?? ""} ${e.phone ?? ""} ${e.designation ?? ""} ${e.idNumber ?? ""}`.toLowerCase()).includes(q));
  }, [employeesAll, employeeSearch]);

  const selectedEmp = employeesAll.find((e) => e.id === selectedEmpId) ?? employeesAll[0] ?? null;

  const [companyModal, setCompanyModal] = useState<{ mode: "add" | "edit"; open: boolean }>({ mode: "add", open: false });
  const [employeeModal, setEmployeeModal] = useState<{ mode: "add" | "edit"; open: boolean }>({ mode: "add", open: false });
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [employeeForm, setEmployeeForm] = useState<EmployeeForm>(emptyEmployeeForm);

  useEffect(() => { setEmployeeSearch(""); setSelectedEmpId(null); }, [selectedOrgId]);

  function openAddCompany() { setCompanyForm(emptyCompanyForm()); setCompanyModal({ mode: "add", open: true }); }
  function openEditCompany() {
    if (!selectedOrg) return;
    setCompanyForm({ ...selectedOrg, address1: selectedOrg.address1 ?? "", address2: selectedOrg.address2 ?? "", addressHouseNo: selectedOrg.addressHouseNo ?? "", addressStreet: selectedOrg.addressStreet ?? "", addressLocality: selectedOrg.addressLocality ?? "", addressPostcode: selectedOrg.addressPostcode ?? "", vatNumber: selectedOrg.vatNumber ?? "", phone: selectedOrg.phone ?? "", phone2: selectedOrg.phone2 ?? "", peNumber: selectedOrg.peNumber ?? "", itRegistrationNumber: selectedOrg.itRegistrationNumber ?? "", jobsplusRegistrationNumber: selectedOrg.jobsplusRegistrationNumber ?? "", payrollManagerFullName: selectedOrg.payrollManagerFullName ?? "", payrollManagerPosition: selectedOrg.payrollManagerPosition ?? "" });
    setCompanyModal({ mode: "edit", open: true });
  }

  function openAddEmployee() { if (!selectedOrg) return; setEmployeeForm(emptyEmployeeForm()); setEmployeeModal({ mode: "add", open: true }); }
  function openEditEmployee() {
    if (!selectedEmp) return;
    setEmployeeForm({ ...selectedEmp, designation: selectedEmp.designation ?? "", email: selectedEmp.email ?? "", phone: selectedEmp.phone ?? "", idNumber: selectedEmp.idNumber ?? "", spouseIdNumber: selectedEmp.spouseIdNumber ?? "", ssnNumber: selectedEmp.ssnNumber ?? "", addressHouseNo: selectedEmp.addressHouseNo ?? "", addressStreet: selectedEmp.addressStreet ?? "", addressLocality: selectedEmp.addressLocality ?? "", addressPostcode: selectedEmp.addressPostcode ?? "", baseWage: ((selectedEmp.baseWage ?? 0) / 100).toFixed(2), payFrequency: selectedEmp.payFrequency ?? "MONTHLY", taxStatus: selectedEmp.taxStatus ?? 1, employmentStartDate: (selectedEmp.employmentStartDate ? new Date(selectedEmp.employmentStartDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10)), normalWeeklyHours: String(selectedEmp.normalWeeklyHours ?? 40), under17: !!selectedEmp.under17, before1962: !!selectedEmp.before1962, isStudent: !!selectedEmp.isStudent, employmentType: (selectedEmp.employmentType ?? "FULL_TIME") as EmploymentType, hourlyWage: selectedEmp.hourlyWage ? ((selectedEmp.hourlyWage ?? 0) / 100).toFixed(2) : "" });
    setEmployeeModal({ mode: "edit", open: true });
  }

  async function onSaveCompany() {
    if (!companyForm.name.trim()) return alert("Company name is required.");
    startTransition(async () => {
      try {
        if (companyModal.mode === "add") { const res = await createCompany(companyForm); setCompanyModal({ ...companyModal, open: false }); router.refresh(); if (res?.id) setSelectedOrgId(res.id); }
        else { if (!selectedOrg) return; await updateCompany({ id: selectedOrg.id, ...companyForm }); setCompanyModal({ ...companyModal, open: false }); router.refresh(); }
      } catch (e: any) { alert(e?.message ?? "Failed to save company"); }
    });
  }

  async function onDeleteCompany() {
    if (!selectedOrg) return;
    if (!confirm(`Delete company "${selectedOrg.name}"? This will delete its employees too.`)) return;
    startTransition(async () => { await deleteCompany({ id: selectedOrg.id }); setSelectedOrgId(null); setSelectedEmpId(null); router.refresh(); });
  }

  async function onSaveEmployee() {
    if (!selectedOrg) return;
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) return alert("Employee first name and last name are required.");
    startTransition(async () => {
      try {
        if (employeeModal.mode === "add") { const res = await createEmployee({ organisationId: selectedOrg.id, ...employeeForm, taxStatus: Number(employeeForm.taxStatus) }); setEmployeeModal({ ...employeeModal, open: false }); router.refresh(); if (res?.id) setSelectedEmpId(res.id); }
        else { if (!selectedEmp) return; await updateEmployee({ id: selectedEmp.id, organisationId: selectedOrg.id, ...employeeForm, taxStatus: Number(employeeForm.taxStatus) }); setEmployeeModal({ ...employeeModal, open: false }); router.refresh(); }
      } catch (e: any) { alert(e?.message ?? "Failed to save employee"); }
    });
  }

  async function onDeleteEmployee() {
    if (!selectedEmp) return;
    if (!confirm(`Delete employee "${selectedEmp.firstName} ${selectedEmp.lastName}"?`)) return;
    startTransition(async () => { await deleteEmployee({ id: selectedEmp.id }); setSelectedEmpId(null); router.refresh(); });
  }

  function importToCalculator() { if (!selectedEmp) return; router.push(`/payroll/run?employeeId=${selectedEmp.id}`); }

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ flex: 1, minWidth: 820 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Search</div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} placeholder="Search company, VAT, phone, PE..." />
        </div>

        <div style={tableWrap}>
          <div style={tableHeader}>
            <div style={{ ...th, flex: 2 }}>Company</div>
            <div style={{ ...th, flex: 1 }}>VAT</div>
            <div style={{ ...th, flex: 1.2 }}>Phone</div>
            <div style={{ ...th, flex: 1 }}>PE</div>
          </div>
          <div style={tableBody}>
            {filteredOrgs.map((o) => {
              const active = selectedOrg?.id === o.id;
              return (
                <button key={o.id} type="button" onClick={() => { setSelectedOrgId(o.id); setSelectedEmpId(null); }} style={{ ...tr, background: active ? "rgba(59,130,246,0.18)" : "transparent", borderColor: active ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.06)" }}>
                  <div style={{ ...td, flex: 2 }}>{o.name ?? "—"}</div>
                  <div style={{ ...td, flex: 1 }}>{o.vatNumber ?? "—"}</div>
                  <div style={{ ...td, flex: 1.2 }}>{o.phone ?? "—"}</div>
                  <div style={{ ...td, flex: 1 }}>{o.peNumber ?? "—"}</div>
                </button>
              );
            })}
            {filteredOrgs.length === 0 ? <div style={{ padding: 12, opacity: 0.7 }}>No companies match your search.</div> : null}
          </div>
        </div>

        {selectedOrg ? (
          <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
            <div style={panel}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={sectionTitle}>Company details</div>
                <button style={btnSmall} onClick={() => setShowCompanyDetails((v) => !v)}>{showCompanyDetails ? "Hide" : "Show"}</button>
              </div>
              {showCompanyDetails ? (
                <div style={grid2}>
                  <Field k="Company">{selectedOrg.name ?? "—"}</Field><Field k="VAT">{selectedOrg.vatNumber ?? "—"}</Field><Field k="Phone">{selectedOrg.phone ?? "—"}</Field><Field k="Phone 2">{selectedOrg.phone2 ?? "—"}</Field><Field k="PE">{selectedOrg.peNumber ?? "—"}</Field>
                  <Field k="Address" clampLines={2}>{[selectedOrg.addressHouseNo, selectedOrg.addressStreet, `${selectedOrg.addressLocality ?? ""}${selectedOrg.addressPostcode ? `, ${selectedOrg.addressPostcode}` : ""}`.trim()].filter(Boolean).join("\n") || [selectedOrg.address1, selectedOrg.address2, selectedOrg.city, selectedOrg.postcode].filter(Boolean).join("\n") || "—"}</Field>
                  <Field k="Payroll manager">{selectedOrg.payrollManagerFullName ? <>{selectedOrg.payrollManagerFullName}{selectedOrg.payrollManagerPosition ? `\n${selectedOrg.payrollManagerPosition}` : ""}</> : "—"}</Field>
                </div>
              ) : <div style={{ opacity: 0.7, fontSize: 13 }}>Company details hidden.</div>}
            </div>

            <div style={{ ...panel, flex: 1 }}>
              <div style={sectionTitle}>Employees</div>
              <input value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} placeholder="Search employees…" style={{ ...inputStyle, marginBottom: 10 }} />
              {employees.length === 0 ? <div style={{ opacity: 0.7 }}>No employees for this company.</div> : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {employees.map((e) => {
                    const active = selectedEmp?.id === e.id;
                    return (
                      <button key={e.id} type="button" onClick={() => setSelectedEmpId(e.id)} style={{ ...empRow, background: active ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)", borderColor: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.06)" }}>
                        <div style={{ fontWeight: 800 }}>{e.firstName} {e.lastName}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{e.designation ?? "—"} · {e.email ?? "—"} · {e.phone ?? "—"}</div>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedEmp ? (
                <div style={{ marginTop: 12 }}>
                  <div style={sectionTitle}>Employee details</div>
                  <div style={grid2}>
                    <Field k="Name">{selectedEmp.firstName} {selectedEmp.lastName}</Field>
                    <Field k="Position">{selectedEmp.designation ?? "—"}</Field>
                    <Field k="ID Number">{selectedEmp.idNumber ?? "—"}</Field>
                    <Field k="SSN Number">{selectedEmp.ssnNumber ?? "—"}</Field>
                    <Field k="Employment Type">{selectedEmp.employmentType === "PART_TIME" ? "Part-time" : "Full-time"}</Field>
                    <Field k="Hourly Wage">{selectedEmp.hourlyWage ? `€ ${(Number(selectedEmp.hourlyWage) / 100).toFixed(2)}` : "—"}</Field>
                    <Field k="Gross Wage">{selectedEmp.employmentType === "PART_TIME" ? "— (Timesheets)" : `€ ${(((selectedEmp.baseWage ?? 0) / 100) as number).toFixed(2)}`}</Field>
                    <Field k="Tax Status">{taxStatusLabel(selectedEmp.taxStatus)}</Field>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div style={rightCol}>
        <button style={btn} disabled={isPending} onClick={openAddCompany}>Add Company</button>
        <button style={btn} disabled={isPending || !selectedOrg} onClick={openEditCompany}>Edit Company</button>
        <button style={btn} disabled={isPending || !selectedOrg} onClick={onDeleteCompany}>Delete Company</button>
        <div style={{ height: 14 }} />
        <button style={btn} disabled={isPending || !selectedOrg} onClick={openAddEmployee}>Add Employee</button>
        <button style={btn} disabled={isPending || !selectedEmp} onClick={openEditEmployee}>Edit Employee</button>
        <button style={btn} disabled={isPending || !selectedEmp} onClick={onDeleteEmployee}>Delete Employee</button>
        <div style={{ height: 14 }} />
        <button style={btn} disabled={isPending || !selectedEmp} onClick={importToCalculator}>Run Payroll</button>
      </div>

      {companyModal.open ? (
        <Modal title={companyModal.mode === "add" ? "Add Company" : "Edit Company"} onClose={() => setCompanyModal({ ...companyModal, open: false })} onSave={onSaveCompany} disabled={isPending}>
          <FormGrid>
            <LabeledInput label="Company Name" value={companyForm.name} onChange={(v) => setCompanyForm((s) => ({ ...s, name: v }))} />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>FSS address (recommended)</div>
            <LabeledInput label="House No." value={companyForm.addressHouseNo} onChange={(v) => setCompanyForm((s) => ({ ...s, addressHouseNo: v }))} />
            <LabeledInput label="Street" value={companyForm.addressStreet} onChange={(v) => setCompanyForm((s) => ({ ...s, addressStreet: v }))} />
            <LabeledInput label="Locality" value={companyForm.addressLocality} onChange={(v) => setCompanyForm((s) => ({ ...s, addressLocality: v }))} />
            <LabeledInput label="Postcode" value={companyForm.addressPostcode} onChange={(v) => setCompanyForm((s) => ({ ...s, addressPostcode: v }))} />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Payer information (used in FSS forms)</div>
            <LabeledInput label="Payroll manager full name" value={companyForm.payrollManagerFullName} onChange={(v) => setCompanyForm((s) => ({ ...s, payrollManagerFullName: v }))} />
            <LabeledInput label="Payroll manager position" value={companyForm.payrollManagerPosition} onChange={(v) => setCompanyForm((s) => ({ ...s, payrollManagerPosition: v }))} />
            <LabeledInput label="VAT Number" value={companyForm.vatNumber} onChange={(v) => setCompanyForm((s) => ({ ...s, vatNumber: v }))} />
            <LabeledInput label="Phone Number" value={companyForm.phone} onChange={(v) => setCompanyForm((s) => ({ ...s, phone: v }))} />
            <LabeledInput label="PE Number" value={companyForm.peNumber} onChange={(v) => setCompanyForm((s) => ({ ...s, peNumber: v }))} />
            <LabeledInput label="IT registration number" value={companyForm.itRegistrationNumber} onChange={(v) => setCompanyForm((s) => ({ ...s, itRegistrationNumber: v }))} />
            <LabeledInput label="Jobsplus registration number" value={companyForm.jobsplusRegistrationNumber} onChange={(v) => setCompanyForm((s) => ({ ...s, jobsplusRegistrationNumber: v }))} />
          </FormGrid>
        </Modal>
      ) : null}

      {employeeModal.open ? (
        <Modal title={employeeModal.mode === "add" ? "Add Employee" : "Edit Employee"} onClose={() => setEmployeeModal({ ...employeeModal, open: false })} onSave={onSaveEmployee} disabled={isPending}>
          <FormGrid>
            <LabeledInput label="First Name" value={employeeForm.firstName} onChange={(v) => setEmployeeForm((s) => ({ ...s, firstName: v }))} />
            <LabeledInput label="Last Name" value={employeeForm.lastName} onChange={(v) => setEmployeeForm((s) => ({ ...s, lastName: v }))} />
            <LabeledInput label="Position" value={employeeForm.designation} onChange={(v) => setEmployeeForm((s) => ({ ...s, designation: v }))} />
            <LabeledInput label="Email" value={employeeForm.email} onChange={(v) => setEmployeeForm((s) => ({ ...s, email: v }))} />
            <LabeledInput label="Phone Number" value={employeeForm.phone} onChange={(v) => setEmployeeForm((s) => ({ ...s, phone: v }))} />
            <LabeledInput label="ID Number" value={employeeForm.idNumber} onChange={(v) => setEmployeeForm((s) => ({ ...s, idNumber: v }))} />
            <LabeledInput label="SSN Number" value={employeeForm.ssnNumber} onChange={(v) => setEmployeeForm((s) => ({ ...s, ssnNumber: v }))} />

            <label style={{ display: "block" }}>
              <div style={labelStyle}>Employment Start Date</div>
              <input type="date" value={employeeForm.employmentStartDate} onChange={(e) => setEmployeeForm((s) => ({ ...s, employmentStartDate: e.target.value }))} style={inputStyle} />
            </label>

            <label style={{ display: "block" }}>
              <div style={labelStyle}>Employment Type</div>
              <select value={employeeForm.employmentType} onChange={(e) => {
                const isPt = e.target.value === "PART_TIME";
                setEmployeeForm((s) => ({ ...s, employmentType: e.target.value as EmploymentType, hourlyWage: isPt ? s.hourlyWage : "", baseWage: isPt ? "0" : s.baseWage, normalWeeklyHours: isPt ? "0" : s.normalWeeklyHours }));
              }} style={inputStyle}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
              </select>
            </label>

            {employeeForm.employmentType === "PART_TIME" ? (
              <LabeledInput label="Hourly Wage" value={employeeForm.hourlyWage} onChange={(v) => setEmployeeForm((s) => ({ ...s, hourlyWage: v }))} />
            ) : null}

            <LabeledInput disabled={employeeForm.employmentType === "PART_TIME"} label="Normal Weekly Hours (used for part-time pro-rata leave)" value={employeeForm.normalWeeklyHours} onChange={(v) => setEmployeeForm((s) => ({ ...s, normalWeeklyHours: v }))} />
            <LabeledInput disabled={employeeForm.employmentType === "PART_TIME"} label="Gross Wage" value={employeeForm.baseWage} onChange={(v) => setEmployeeForm((s) => ({ ...s, baseWage: v }))} />

            <label style={{ display: "block" }}>
              <div style={labelStyle}>Gross Wage Period</div>
              <select value={employeeForm.payFrequency} onChange={(e) => setEmployeeForm((s) => ({ ...s, payFrequency: e.target.value as PayFrequency }))} style={inputStyle}>
                <option value="ANNUAL">Annual</option><option value="MONTHLY">Monthly</option><option value="WEEKLY">Weekly</option>
              </select>
            </label>

            <label style={{ display: "block" }}>
              <div style={labelStyle}>Select Tax Status</div>
              <select value={String(employeeForm.taxStatus)} onChange={(e) => setEmployeeForm((s) => ({ ...s, taxStatus: Number(e.target.value) }))} style={inputStyle}>
                <option value="1">Individual</option><option value="2">Married</option><option value="3">Parent</option><option value="4">Married with 1 Child</option><option value="5">Married with 2+ Chuldren</option><option value="6">Parent with 1 Child</option><option value="7">Parent with 2+ Children</option>
              </select>
            </label>
          </FormGrid>
        </Modal>
      ) : null}
    </div>
  );
}

function Field({ k, children, clampLines }: { k: string; children: React.ReactNode; clampLines?: number }) {
  return (
    <div style={{ padding: 10, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{k}</div>
      <div style={{ marginTop: 4, fontWeight: 800, whiteSpace: "pre-line", wordBreak: "break-word", lineHeight: 1.25, ...(clampLines ? { display: "-webkit-box", WebkitLineClamp: clampLines, WebkitBoxOrient: "vertical", overflow: "hidden" } : null) }}>{children}</div>
    </div>
  );
}

function Modal({ title, children, onClose, onSave, disabled }: { title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; disabled?: boolean; }) {
  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div><button style={xBtn} onClick={onClose}>✕</button></div>
        <div style={modalBody}>{children}</div>
        <div style={modalFooter}><button style={btnSmall} onClick={onSave} disabled={disabled}>Save</button><button style={btnSmall} onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gap: 10 }}>{children}</div>; }

function LabeledInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean; }) {
  return (
    <label style={{ display: "block" }}>
      <div style={labelStyle}>{label}</div>
      <input disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, opacity: disabled ? 0.4 : 1 }} />
    </label>
  );
}

const panel: React.CSSProperties = { borderRadius: 12, padding: 16, background: "var(--panel-bg)", border: "1px solid var(--panel-border)" };
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 10 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const inputStyle: React.CSSProperties = { width: "100%", height: 36, padding: "0 10px", borderRadius: 8, color: "var(--text)", background: "var(--input-bg)", border: "1px solid var(--input-border)", outline: "none" };
const labelStyle: React.CSSProperties = { fontSize: 12, opacity: 0.7, marginBottom: 6 };
const tableWrap: React.CSSProperties = { borderRadius: 12, border: "1px solid var(--panel-border)", background: "var(--panel-bg)", overflow: "hidden" };
const tableHeader: React.CSSProperties = { display: "flex", borderBottom: "1px solid var(--divider)", background: "var(--panel-bg)" };
const tableBody: React.CSSProperties = { maxHeight: 340, overflow: "auto" };
const th: React.CSSProperties = { padding: "10px 12px", fontSize: 12, fontWeight: 800, opacity: 0.9, textAlign: "left", color: "var(--text)" };
const tr: React.CSSProperties = { width: "100%", display: "flex", padding: 0, border: "1px solid var(--panel-border)", borderLeft: "none", borderRight: "none", cursor: "pointer", background: "transparent", color: "var(--text)" };
const td: React.CSSProperties = { padding: "10px 12px", textAlign: "left" };
const empRow: React.CSSProperties = { padding: 12, borderRadius: 12, border: "1px solid var(--panel-border)", textAlign: "left", cursor: "pointer", color: "var(--text)" };
const rightCol: React.CSSProperties = { width: 180, padding: 10, borderRadius: 12, border: "1px solid var(--panel-border)", background: "var(--panel-bg)", height: "fit-content", position: "sticky", top: 76, display: "flex", flexDirection: "column", gap: 8 };
const btn: React.CSSProperties = { height: 38, borderRadius: 10, border: "1px solid var(--btn-ghost-border)", background: "var(--btn-ghost-bg)", color: "var(--text)", cursor: "pointer", fontWeight: 800 };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "grid", placeItems: "center", zIndex: 9999 };
const modal: React.CSSProperties = { width: 520, maxWidth: "calc(100vw - 24px)", borderRadius: 12, padding: 16, background: "#0b0f14", border: "1px solid rgba(255,255,255,0.10)", maxHeight: "calc(100vh - 80px)", display: "flex", flexDirection: "column", gap: 12 };
const modalBody: React.CSSProperties = { overflow: "auto", paddingRight: 2 };
const modalFooter: React.CSSProperties = { display: "flex", justifyContent: "center", gap: 10, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.08)" };
const btnSmall: React.CSSProperties = { height: 36, padding: "0 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "#e5e7eb", cursor: "pointer", fontWeight: 800 };
const xBtn: React.CSSProperties = { height: 30, width: 30, borderRadius: 8, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)", color: "#e5e7eb", cursor: "pointer" };