import { redirect } from "next/navigation";

// Backwards-compatible route.
// The UI has been moved to /payroll/run and renamed to "Run Payroll".
type SalaryCalculatorSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export default async function SalaryCalculatorRedirect({
  searchParams,
}: {
  searchParams?: SalaryCalculatorSearchParams;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const employeeId =
    typeof resolvedSearchParams.employeeId === "string"
      ? resolvedSearchParams.employeeId
      : undefined;

  redirect(
    employeeId
      ? `/payroll/run?employeeId=${encodeURIComponent(employeeId)}`
      : "/payroll/run"
  );
}