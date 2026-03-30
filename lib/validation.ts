/**
 * lib/validation.ts
 *
 * Centralised Zod schemas + sanitisation helpers.
 * Install:  npm install zod
 *
 * All user-supplied strings pass through sanitizeText() before being
 * persisted – this strips HTML/script tags and trims whitespace, preventing
 * stored-XSS even if output encoding is accidentally skipped.
 */

import { z } from "zod";

// ─── Sanitisation primitives ─────────────────────────────────────────────────

/** Strip HTML tags and encode the five dangerous HTML entities. */
export function sanitizeText(value: string): string {
  return value
    .trim()
    .replace(/<[^>]*>/g, "")       // strip HTML tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitise a string but preserve safe punctuation that business names or
 * addresses legitimately contain (commas, hyphens, apostrophes, slashes, etc.)
 * while still blocking script injection.
 */
export function sanitizeBusinessText(value: string): string {
  return value
    .trim()
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "");
}

// ─── Reusable field schemas ───────────────────────────────────────────────────

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Invalid email address")
  .transform((v) => v.toLowerCase().trim());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const nameSchema = z
  .string()
  .max(100, "Name is too long")
  .optional()
  .transform((v) => (v ? sanitizeText(v) : undefined));

export const totpTokenSchema = z
  .string()
  .length(6, "Token must be 6 digits")
  .regex(/^\d{6}$/, "Token must only contain digits");

// ─── Registration ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Organisations / Employees ───────────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(1, "Company name is required").max(200).transform(sanitizeBusinessText),
  vatNumber: z.string().max(50).optional().transform((v) => v ? sanitizeText(v) : undefined),
  phone: z.string().max(30).optional().transform((v) => v ? sanitizeText(v) : undefined),
  phone2: z.string().max(30).optional().transform((v) => v ? sanitizeText(v) : undefined),
  peNumber: z.string().max(50).optional().transform((v) => v ? sanitizeText(v) : undefined),
  address1: z.string().max(200).optional().transform((v) => v ? sanitizeBusinessText(v) : undefined),
  address2: z.string().max(200).optional().transform((v) => v ? sanitizeBusinessText(v) : undefined),
  addressHouseNo: z.string().max(20).optional().transform((v) => v ? sanitizeText(v) : undefined),
  addressStreet: z.string().max(100).optional().transform((v) => v ? sanitizeBusinessText(v) : undefined),
  addressLocality: z.string().max(100).optional().transform((v) => v ? sanitizeText(v) : undefined),
  addressPostcode: z.string().max(20).optional().transform((v) => v ? sanitizeText(v) : undefined),
  itRegistrationNumber: z.string().max(50).optional().transform((v) => v ? sanitizeText(v) : undefined),
  jobsplusRegistrationNumber: z.string().max(50).optional().transform((v) => v ? sanitizeText(v) : undefined),
  payrollManagerFullName: z.string().max(200).optional().transform((v) => v ? sanitizeText(v) : undefined),
  payrollManagerPosition: z.string().max(100).optional().transform((v) => v ? sanitizeText(v) : undefined),
});

export const createEmployeeSchema = z.object({
  organisationId: z.string().uuid("Invalid organisation ID"),
  firstName: z.string().min(1).max(100).transform(sanitizeText),
  lastName: z.string().min(1).max(100).transform(sanitizeText),
  email: emailSchema.optional(),
  phone: z.string().max(30).optional().transform((v) => v ? sanitizeText(v) : undefined),
  designation: z.string().max(200).optional().transform((v) => v ? sanitizeText(v) : undefined),
  idNumber: z.string().max(50).optional().transform((v) => v ? sanitizeText(v) : undefined),
  ssnNumber: z.string().max(50).optional().transform((v) => v ? sanitizeText(v) : undefined),
  taxStatus: z.number().int().min(1).max(7).optional(),
  baseWageCents: z.number().int().min(0).optional(),
  normalWeeklyHours: z.number().min(0).max(168).optional(),
  payFrequency: z.enum(["WEEKLY", "MONTHLY", "ANNUAL"]).optional(),
  employmentType: z.enum(["Full_Time", "Part_Time"]).optional(),
  includeNI: z.boolean().optional(),
  under17: z.boolean().optional(),
  apprentice: z.boolean().optional(),
  before1962: z.boolean().optional(),
  includeAllowance1: z.boolean().optional(),
  includeAllowance2: z.boolean().optional(),
  includeBonus1: z.boolean().optional(),
  includeBonus2: z.boolean().optional(),
});

// ─── Payslip fields ───────────────────────────────────────────────────────────

export const payslipFieldsSchema = z.object({
  employee_name: z.string().max(200).transform(sanitizeText),
  employee_id: z.string().max(50).transform(sanitizeText),
  employee_designation: z.string().max(200).transform(sanitizeText),
  employer_name: z.string().max(200).transform(sanitizeBusinessText),
  employer_address: z.string().max(300).transform(sanitizeBusinessText),
  pe_number: z.string().max(50).transform(sanitizeText),
  ssn_number: z.string().max(50).transform(sanitizeText),
  pay_period_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional().default(""),
  pay_period_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").optional().default(""),
  overtime_up_to: z.string().max(20).transform(sanitizeText),
  overtime_15_hours: z.string().max(20).transform(sanitizeText),
  overtime_15_thispay: z.string().max(20).transform(sanitizeText),
  basicpay_hours: z.string().max(20).transform(sanitizeText),
  basicpay_thispay: z.string().max(20).transform(sanitizeText),
  vl_pay_hours: z.string().max(20).transform(sanitizeText),
  vl_pay_thispay: z.string().max(20).transform(sanitizeText),
  thispay_march_supplement: z.string().max(20).transform(sanitizeText),
  thispay_june_bonus: z.string().max(20).transform(sanitizeText),
  thispay_september_supplement: z.string().max(20).transform(sanitizeText),
  thispay_december_bonus: z.string().max(20).transform(sanitizeText),
  thispay_allowances: z.string().max(20).transform(sanitizeText),
  thispay_commissions: z.string().max(20).transform(sanitizeText),
  thispay_grosspay: z.string().max(20).transform(sanitizeText),
  thispay_ni: z.string().max(20).transform(sanitizeText),
  thispay_tax: z.string().max(20).transform(sanitizeText),
  thispay_netpay: z.string().max(20).transform(sanitizeText),
  hours_vlentitled: z.string().max(20).transform(sanitizeText),
  hours_vlfrom: z.string().max(20).transform(sanitizeText),
  hours_vlconsumed: z.string().max(20).transform(sanitizeText),
  hours_vlremaining: z.string().max(20).transform(sanitizeText),
  ttd_basicpay: z.string().max(20).transform(sanitizeText),
  ttd_grosspay: z.string().max(20).transform(sanitizeText),
  ttd_netpay: z.string().max(20).transform(sanitizeText),
  ttd_vlpay: z.string().max(20).transform(sanitizeText),
  ttd_tax: z.string().max(20).transform(sanitizeText),
  ttd_ni: z.string().max(20).transform(sanitizeText),
}).partial();

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format Zod validation errors into a single readable string. */
export function formatZodError(err: z.ZodError): string {
  const issues = (err as any).issues ?? (err as any).errors ?? [];
  return issues.map((e: any) => `${(e.path ?? []).join(".")}: ${e.message}`).join("; ");
}