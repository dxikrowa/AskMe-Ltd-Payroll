import { prisma } from "@/lib/prisma";
import { TextAlignment } from "pdf-lib";

export function centsToEuro(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return (n / 100).toFixed(2);
}

export function centsToEuroInt(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return String(Math.trunc(n / 100));
}

export function centsToNoDot(cents: number): string {
  const n = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const euro = Math.floor(abs / 100);
  const c = String(abs % 100).padStart(2, "0");
  return `${sign}${euro}${c}`;
}

export function splitEuroCents(cents: number): { euro: string; cents: string } {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(cents));
  const euro = Math.floor(abs / 100);
  const c = abs % 100;
  return { euro: `${sign}${euro}`, cents: String(c).padStart(2, "0") };
}

export function toCents(v: any): number {
  const s = (v ?? "").toString().trim();
  if (!s) return 0;
  const n = Number.parseFloat(s.replace(/,/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fillTextFields(form: any, fields: Record<string, any>) {
  for (const [key, val] of Object.entries(fields || {})) {
    try {
      form.getTextField(key).setText((val ?? "").toString());
    } catch { /* ignore */ }
  }
}

export function fillTextFieldsRight(form: any, fields: Record<string, any>) {
  for (const [key, val] of Object.entries(fields || {})) {
    try {
      const tf = form.getTextField(key);
      let s = (val ?? "").toString();
      const maxLen = typeof tf.getMaxLength === "function" ? tf.getMaxLength() : undefined;
      if (typeof maxLen === "number" && maxLen > 0 && s.length < maxLen) s = s.padStart(maxLen, " ");
      tf.setText(s);
      if (typeof tf.setAlignment === "function") tf.setAlignment(TextAlignment.Right);
    } catch { /* ignore */ }
  }
}

export function fillMoneySplit(form: any, opts: { base: string; cents: number; euroField?: string; centsField?: string; altSingleField?: string }) {
  const { base, cents, euroField, centsField, altSingleField } = opts;
  if (euroField && centsField) {
    const sp = splitEuroCents(cents);
    fillTextFields(form, { [euroField]: sp.euro, [centsField]: sp.cents });
    fillTextFieldsRight(form, { [euroField]: sp.euro, [centsField]: sp.cents });
    return;
  }
  const candidates: Array<[string, string]> = [[`${base}_euro`, `${base}_cents`], [`${base}_euros`, `${base}_cents`]];
  for (const [eField, cField] of candidates) {
    try {
      form.getTextField(eField); form.getTextField(cField);
      const sp = splitEuroCents(cents);
      fillTextFields(form, { [eField]: sp.euro, [cField]: sp.cents });
      fillTextFieldsRight(form, { [eField]: sp.euro, [cField]: sp.cents });
      return;
    } catch { /* ignore */ }
  }
  const single = altSingleField ?? base;
  fillTextFields(form, { [single]: centsToEuro(cents) });
}

export async function assertOrgAccess(userId: string, organisationId: string) {
  const member = await prisma.membership.findFirst({ where: { userId, organisationId } });
  if (!member) throw new Error("Forbidden");
  return member;
}

export function yearRange(year: number) { return { start: new Date(Date.UTC(year, 0, 1, 0, 0, 0)), end: new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0)) }; }
export function monthRange(year: number, month: number) { return { start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0)), end: new Date(Date.UTC(year, month, 1, 0, 0, 0)) }; }
export function monthKey(d: Date): string { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; }
export function digitsOnly(s: string): string { return (s ?? "").toString().replace(/\D+/g, ""); }

export function formatDateDDMMYYYY(v: any): string {
  const raw = (v ?? "").toString().trim();
  if (!raw) return "";
  const d = digitsOnly(raw);
  if (d.length === 8) {
    const yyyy = Number(d.slice(0, 4)); const mm = Number(d.slice(4, 6)); const dd = Number(d.slice(6, 8));
    if (yyyy >= 1900 && yyyy <= 2100 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) return `${d.slice(6, 8)}${d.slice(4, 6)}${d.slice(0, 4)}`;
    return d; 
  }
  const parts = raw.split(/[\s/\-.]+/).filter(Boolean);
  if (parts.length >= 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${c.padStart(2, "0")}${b.padStart(2, "0")}${a}`;
    return `${a.padStart(2, "0")}${b.padStart(2, "0")}${c}`;
  }
  return "";
}

export function formatMonthMMYYYY(v: any): string {
  const raw = (v ?? "").toString().trim();
  if (!raw) return "";
  const d = digitsOnly(raw);
  if (d.length === 6) {
    const yyyy = Number(d.slice(0, 4)); const mm = Number(d.slice(4, 6));
    if (yyyy >= 1900 && yyyy <= 2100 && mm >= 1 && mm <= 12) return `${d.slice(4, 6)}${d.slice(0, 4)}`;
    return d;
  }
  const parts = raw.split(/[\s/\-.]+/).filter(Boolean);
  if (parts.length >= 2) {
    const [a, b] = parts;
    if (a.length === 4) return `${b.padStart(2, "0")}${a}`;
    return `${a.padStart(2, "0")}${b}`;
  }
  return "";
}