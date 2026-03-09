"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

async function requireUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login");

  return user;
}

export async function createCompany(data: {
  name: string;
  vatNumber?: string;
  phone?: string;
  phone2?: string;
  peNumber?: string;
  address1?: string;
  address2?: string;
  addressHouseNo?: string;
  addressStreet?: string;
  addressLocality?: string;
  addressPostcode?: string;
  payrollManagerFullName?: string;
  payrollManagerPosition?: string;
  itRegistrationNumber?: string;
  jobsplusRegistrationNumber?: string;
}) {
  const user = await requireUser();

  // Keep legacy address1/address2 for compatibility (payslip templates, older UI),
  // but prefer the separated address fields.
  const legacyAddress1 =
    [data.addressHouseNo, data.addressStreet, data.addressLocality, data.addressPostcode]
      .map((x) => (x ?? "").toString().trim())
      .filter(Boolean)
      .join(", ") ||
    (data.address1 ?? "").toString().trim();

  const org = await prisma.organisation.create({
    data: {
      name: data.name.trim(),
      vatNumber: data.vatNumber?.trim() || null,
      phone: data.phone?.trim() || null,
      phone2: data.phone2?.trim() || null,
      peNumber: data.peNumber?.trim() || null,
      address1: legacyAddress1 || null,
      address2: data.address2?.trim() || null,
      addressHouseNo: data.addressHouseNo?.trim() || null,
      addressStreet: data.addressStreet?.trim() || null,
      addressLocality: data.addressLocality?.trim() || null,
      addressPostcode: data.addressPostcode?.trim() || null,
      payrollManagerFullName: data.payrollManagerFullName?.trim() || null,
      payrollManagerPosition: data.payrollManagerPosition?.trim() || null,
      itRegistrationNumber: data.itRegistrationNumber?.trim() || null,
      jobsplusRegistrationNumber: data.jobsplusRegistrationNumber?.trim() || null,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
  });

  return { id: org.id };
}

export async function updateCompany(data: {
  id: string;
  name: string;
  vatNumber?: string;
  phone?: string;
  phone2?: string;
  peNumber?: string;
  address1?: string;
  address2?: string;
  addressHouseNo?: string;
  addressStreet?: string;
  addressLocality?: string;
  addressPostcode?: string;
  payrollManagerFullName?: string;
  payrollManagerPosition?: string;
  itRegistrationNumber?: string;
  jobsplusRegistrationNumber?: string;
}) {
  await requireUser();

  const legacyAddress1 =
    [data.addressHouseNo, data.addressStreet, data.addressLocality, data.addressPostcode]
      .map((x) => (x ?? "").toString().trim())
      .filter(Boolean)
      .join(", ") ||
    (data.address1 ?? "").toString().trim();

  await prisma.organisation.update({
    where: { id: data.id },
    data: {
      name: data.name.trim(),
      vatNumber: data.vatNumber?.trim() || null,
      phone: data.phone?.trim() || null,
      phone2: data.phone2?.trim() || null,
      peNumber: data.peNumber?.trim() || null,
      address1: legacyAddress1 || null,
      address2: data.address2?.trim() || null,
      addressHouseNo: data.addressHouseNo?.trim() || null,
      addressStreet: data.addressStreet?.trim() || null,
      addressLocality: data.addressLocality?.trim() || null,
      addressPostcode: data.addressPostcode?.trim() || null,
      payrollManagerFullName: data.payrollManagerFullName?.trim() || null,
      payrollManagerPosition: data.payrollManagerPosition?.trim() || null,
      itRegistrationNumber: data.itRegistrationNumber?.trim() || null,
      jobsplusRegistrationNumber: data.jobsplusRegistrationNumber?.trim() || null,
    },
  });

  return { ok: true };
}

export async function deleteCompany(data: { id: string }) {
  await requireUser();
  await prisma.organisation.delete({ where: { id: data.id } });
  return { ok: true };
}

export async function createEmployee(data: {
  organisationId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  spouseIdNumber?: string;
  ssnNumber?: string;
  addressHouseNo?: string;
  addressStreet?: string;
  addressLocality?: string;
  addressPostcode?: string;
  baseWage?: string; // euros
  payFrequency?: "WEEKLY" | "MONTHLY" | "ANNUAL";
  taxStatus?: number;
  employmentStartDate?: string; // YYYY-MM-DD
  normalWeeklyHours?: string;
  under17?: boolean;
  before1962?: boolean;
  isStudent?: boolean;
  employmentType?: "FULL_TIME" | "PART_TIME";
  hourlyWage?: string;
}) {
  await requireUser();

  const baseWageCents = Math.round(Number(data.baseWage || 0) * 100);
  const hourlyWageCents = data.hourlyWage ? Math.round(Number(data.hourlyWage || 0) * 100) : null;

  const emp = await prisma.employee.create({
    data: {
      organisationId: data.organisationId,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      designation: data.designation?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      idNumber: data.idNumber?.trim() || null,
      spouseIdNumber: data.spouseIdNumber?.trim() || null,
      ssnNumber: data.ssnNumber?.trim() || null,
      addressHouseNo: data.addressHouseNo?.trim() || null,
      addressStreet: data.addressStreet?.trim() || null,
      addressLocality: data.addressLocality?.trim() || null,
      addressPostcode: data.addressPostcode?.trim() || null,
      baseWage: Number.isFinite(baseWageCents) ? baseWageCents : 0,
      payFrequency: data.payFrequency ?? "MONTHLY",
      taxStatus: data.taxStatus ?? 1,
      employmentStartDate: data.employmentStartDate ? new Date(data.employmentStartDate) : undefined,
      normalWeeklyHours: data.normalWeeklyHours ? Number(data.normalWeeklyHours) : undefined,
      under17: data.under17 ?? false,
      before1962: data.before1962 ?? false,
      isStudent: data.isStudent ?? false,
      employmentType: data.employmentType ?? "FULL_TIME",
      hourlyWage: hourlyWageCents,
    },
  });

  return { id: emp.id };
}

export async function updateEmployee(data: {
  id: string;
  organisationId: string;
  firstName: string;
  lastName: string;
  designation?: string;
  email?: string;
  phone?: string;
  idNumber?: string;
  spouseIdNumber?: string;
  ssnNumber?: string;
  addressHouseNo?: string;
  addressStreet?: string;
  addressLocality?: string;
  addressPostcode?: string;
  baseWage?: string; // euros
  payFrequency?: "WEEKLY" | "MONTHLY" | "ANNUAL";
  taxStatus?: number;
  employmentStartDate?: string; // YYYY-MM-DD
  normalWeeklyHours?: string;
  under17?: boolean;
  before1962?: boolean;
  isStudent?: boolean;
  employmentType?: "FULL_TIME" | "PART_TIME";
  hourlyWage?: string;
}) {
  await requireUser();
  const baseWageCents = Math.round(Number(data.baseWage || 0) * 100);
  const hourlyWageCents = data.hourlyWage ? Math.round(Number(data.hourlyWage || 0) * 100) : null;

  await prisma.employee.update({
    where: { id: data.id },
    data: {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      designation: data.designation?.trim() || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      idNumber: data.idNumber?.trim() || null,
      spouseIdNumber: data.spouseIdNumber?.trim() || null,
      ssnNumber: data.ssnNumber?.trim() || null,
      addressHouseNo: data.addressHouseNo?.trim() || null,
      addressStreet: data.addressStreet?.trim() || null,
      addressLocality: data.addressLocality?.trim() || null,
      addressPostcode: data.addressPostcode?.trim() || null,
      baseWage: Number.isFinite(baseWageCents) ? baseWageCents : 0,
      payFrequency: data.payFrequency ?? "MONTHLY",
      taxStatus: data.taxStatus ?? 1,
      employmentStartDate: data.employmentStartDate ? new Date(data.employmentStartDate) : undefined,
      normalWeeklyHours: data.normalWeeklyHours ? Number(data.normalWeeklyHours) : undefined,
      under17: data.under17 ?? false,
      before1962: data.before1962 ?? false,
      isStudent: data.isStudent ?? false,
      employmentType: data.employmentType ?? "FULL_TIME",
      hourlyWage: hourlyWageCents,
    },
  });

  return { ok: true };
}

export async function deleteEmployee(data: { id: string }) {
  await requireUser();
  await prisma.employee.delete({ where: { id: data.id } });
  return { ok: true };
}
