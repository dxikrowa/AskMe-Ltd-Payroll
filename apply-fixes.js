// apply-fixes.js
const fs = require('fs');
const { execSync } = require('child_process');

// 1. Marketing Header Logo Fix
let mHeader = fs.readFileSync('components/marketing-header.tsx', 'utf8');
mHeader = mHeader.replace(
  /<span style={{ fontWeight:900, fontSize:18 }}>AskMe Payroll<\/span>/g,
  `<Image src="/askmeltdbluelionpayroll.png" alt="AskMe Logo" width={32} height={32} style={{ objectFit: "contain", marginBottom: -4 }} /> <span style={{ fontWeight:900, fontSize:18 }}>AskMe Payroll</span>`
);
if (!mHeader.includes('import Image from "next/image"')) {
  mHeader = 'import Image from "next/image";\n' + mHeader;
}
fs.writeFileSync('components/marketing-header.tsx', mHeader);

// 2. Favicon Replacement
if (fs.existsSync('public/askmeltdbluelionpayroll.png')) {
  fs.copyFileSync('public/askmeltdbluelionpayroll.png', 'app/icon.png');
  fs.copyFileSync('public/askmeltdbluelionpayroll.png', 'app/favicon.ico');
}

// 3. FSS Checkbox Fix
let libFss = fs.readFileSync('lib/fss.ts', 'utf8');
libFss = libFss.replace(/export function fillCheckboxes[\s\S]*?\}\n\}/, `export function fillCheckboxes(form: any, checks: Record<string, boolean>) {
  for (const [key, val] of Object.entries(checks || {})) {
    try {
      const field = form.getField(key);
      if (!field) continue;
      if (field.constructor.name.includes("CheckBox")) {
        if (val) field.check(); else field.uncheck();
      } else {
        if (val) {
          const onVal = field.acroField.getOnValue?.();
          field.acroField.setValue(onVal ?? "Yes");
        } else { field.acroField.setValue("Off"); }
      }
    } catch { }
  }
}`);
fs.writeFileSync('lib/fss.ts', libFss);

// 4. FS7 Preview Fixes (Checkboxes & Part-time logic)
let fs7Preview = fs.readFileSync('app/api/fss/fs7/preview/route.ts', 'utf8');
fs7Preview = fs7Preview.replace(/const gross = baseGross \+ overtime;/, `const gross = baseGross + overtime;\n  const ftGrossBase = sum((m) => Math.max(0, (m.ftGrossCents || m.grossCents) - (m.ftOvertimeCents || m.overtimeCents || 0)));\n  const ptGrossBase = sum((m) => Math.max(0, (m.ptGrossCents || 0) - (m.ptOvertimeCents || 0)));\n  const ftTax = sum((m) => m.ftTaxCents || m.taxCents);\n  const ptTax = sum((m) => m.ptTaxCents || 0);`);
fs7Preview = fs7Preview.replace(/gross_emoluments_fulltime: centsToEuroInt\(baseGross\),/g, 'gross_emoluments_fulltime: centsToEuroInt(ftGrossBase),\n    gross_emoluments_parttime: centsToEuroInt(ptGrossBase),');
fs7Preview = fs7Preview.replace(/tax_deductions_fulltime: centsToEuroInt\(tax\),/g, 'tax_deductions_fulltime: centsToEuroInt(ftTax),\n    tax_deductions_parttime: centsToEuroInt(ptTax),');
fs7Preview = fs7Preview.replace(/paid_childcare_yes:[^\n]+/g, `paid_childcare_yes: String(body.childcare?.answer ?? "").toLowerCase() === "yes",\n    paid_childcare_no: String(body.childcare?.answer ?? "").toLowerCase() === "no",\n    shareoptions_yes: String(body.shareOptions?.answer ?? "").toLowerCase() === "yes",\n    shareoptions_no: String(body.shareOptions?.answer ?? "").toLowerCase() === "no",\n    "Check Box1": String(body.childcare?.answer ?? "").toLowerCase() === "yes",\n    "Check Box2": String(body.childcare?.answer ?? "").toLowerCase() === "no",\n    "Check Box3": String(body.shareOptions?.answer ?? "").toLowerCase() === "yes",\n    "Check Box4": String(body.shareOptions?.answer ?? "").toLowerCase() === "no",`);
fs.writeFileSync('app/api/fss/fs7/preview/route.ts', fs7Preview);

// 5. FS5 Preview Fixes (Part-Time logic)
let fs5Preview = fs.readFileSync('app/api/fss/fs5/preview/route.ts', 'utf8');
fs5Preview = fs5Preview.replace(/const gross = payslips.reduce[^\n]+/g, `let ftGross = 0, ptGross = 0, ftTax = 0, ptTax = 0, ftOvertime = 0, ptOvertime = 0;\n  const ftPayees = new Set<string>(); const ptPayees = new Set<string>();\n  for (const p of payslips) {\n    const isPT = p.employee?.employmentType === "PART_TIME";\n    if (isPT) { ptGross+=p.grossCents; ptTax+=p.taxCents; ptOvertime+=(p.overtimeCents||0); ptPayees.add(p.employeeId); }\n    else { ftGross+=p.grossCents; ftTax+=p.taxCents; ftOvertime+=(p.overtimeCents||0); ftPayees.add(p.employeeId); }\n  }\n  const gross = ftGross + ptGross; const tax = ftTax + ptTax; const overtimeCents = ftOvertime + ptOvertime; const payees = ftPayees.size + ptPayees.size;\n  const ftGrossBase = Math.max(0, ftGross - ftOvertime); const ptGrossBase = Math.max(0, ptGross - ptOvertime);`);
fs5Preview = fs5Preview.replace(/no_of_payees_fulltime: String\(payees\),/g, `no_of_payees_fulltime: String(ftPayees.size || ""), no_of_payees_parttime: String(ptPayees.size || ""),`);
fs5Preview = fs5Preview.replace(/gross_emoluments_fulltime: centsToEuroInt\(grossExcludingOvertime\),/g, `gross_emoluments_fulltime: centsToEuroInt(ftGrossBase),\n    gross_emoluments_parttime: centsToEuroInt(ptGrossBase),`);
fs5Preview = fs5Preview.replace(/tax_deductions_fulltime: centsToEuroInt\(tax\),/g, `tax_deductions_fulltime: centsToEuroInt(ftTax),\n    tax_deductions_parttime: centsToEuroInt(ptTax),`);
fs.writeFileSync('app/api/fss/fs5/preview/route.ts', fs5Preview);

// 6. FS5 Generate Fixes
let fs5Gen = fs.readFileSync('app/api/fss/fs5/generate/route.ts', 'utf8');
fs5Gen = fs5Gen.replace(/const gross = payslips.reduce[^\n]+/g, `let ftGross = 0, ptGross = 0, ftTax = 0, ptTax = 0, ftOvertime = 0, ptOvertime = 0;\n  const ftPayees = new Set<string>(); const ptPayees = new Set<string>();\n  for (const p of payslips) {\n    const isPT = p.employee?.employmentType === "PART_TIME";\n    if (isPT) { ptGross+=p.grossCents; ptTax+=p.taxCents; ptOvertime+=(p.overtimeCents||0); ptPayees.add(p.employeeId); }\n    else { ftGross+=p.grossCents; ftTax+=p.taxCents; ftOvertime+=(p.overtimeCents||0); ftPayees.add(p.employeeId); }\n  }\n  const gross = ftGross + ptGross; const tax = ftTax + ptTax; const overtimeCents = ftOvertime + ptOvertime; const payees = ftPayees.size + ptPayees.size;`);
fs5Gen = fs5Gen.replace(/grossCents: gross,/g, `grossCents: gross, ftGrossCents: ftGross, ptGrossCents: ptGross, taxCents: tax, ftTaxCents: ftTax, ptTaxCents: ptTax, ftOvertimeCents: ftOvertime, ptOvertimeCents: ptOvertime,`);
fs.writeFileSync('app/api/fss/fs5/generate/route.ts', fs5Gen);

// 7. FS3 Preview Fixes
let fs3Preview = fs.readFileSync('app/api/fss/fs3/preview/route.ts', 'utf8');
fs3Preview = fs3Preview.replace(/gross_emoluments_fulltime: centsToEuroInt\(grossExcludingOvertime\),/g, `gross_emoluments_fulltime: employee.employmentType === "PART_TIME" ? "0" : centsToEuroInt(grossExcludingOvertime),\n    gross_emoluments_parttime: employee.employmentType === "PART_TIME" ? centsToEuroInt(grossExcludingOvertime) : "0",`);
fs3Preview = fs3Preview.replace(/tax_deductions_fulltime: centsToEuroInt\(tax\),/g, `tax_deductions_fulltime: employee.employmentType === "PART_TIME" ? "0" : centsToEuroInt(tax),\n    tax_deductions_parttime: employee.employmentType === "PART_TIME" ? centsToEuroInt(tax) : "0",`);
fs.writeFileSync('app/api/fss/fs3/preview/route.ts', fs3Preview);

// 8. Add Hourly Wage display on Run Payroll
let runPg = fs.readFileSync('app/(dashboard)/payroll/run/page.tsx', 'utf8');
runPg = runPg.replace(/<Field label="Gross wage">\n\s*<Input value={form.grossWage}[^\n]+\/>\n\s*<\/Field>/, `<Field label="Gross wage">\n                <Input value={form.grossWage} onChange={(v) => setForm((s) => ({ ...s, grossWage: v }))} placeholder="Gross Wage" />\n              </Field>\n              {form.employmentType === "Part_Time" && employeeForLeave?.hourlyWageCents ? (\n                <div style={{ fontSize: 13, color: "var(--text)", opacity: 0.8, gridColumn: "1 / -1", padding: "8px 12px", background: "var(--toggle-on-bg)", borderRadius: 8 }}>\n                  Hourly Wage configured: <strong>€{(employeeForLeave.hourlyWageCents / 100).toFixed(2)}</strong>/hr\n                </div>\n              ) : null}`);
fs.writeFileSync('app/(dashboard)/payroll/run/page.tsx', runPg);

// 9. Create ZIP file
console.log('Changes applied locally. Generating ZIP archive...');
try {
  execSync('npx -y bestzip askme-payroll-updated.zip * .*');
  console.log('✅ ZIP file "askme-payroll-updated.zip" generated successfully!');
} catch (e) {
  console.error("Failed to generate ZIP via bestzip. Please zip the directory manually.", e.message);
}