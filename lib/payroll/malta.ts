import taxConfig from "./tax_config.json";
import taxVars from "./tax_variables.json";

export type Period = "Annual" | "Monthly" | "Weekly";
export type EmploymentType = "Full_Time" | "Part_Time";

type TaxConfig = Record<string, [number, number | "inf", number, number][]>;

const cfg = taxConfig as unknown as TaxConfig;

const WEEKS_PER_YEAR = 52;
const MONTHS_PER_YEAR = 12;

const WEEKLY_ALLOWANCE = (taxVars as any).WEEKLY_ALLOWANCE ?? 121.16;
const WEEKLY_ALLOWANCE_2 = (taxVars as any).WEEKLY_ALLOWANCE_2 ?? 121.16;
const STATUTORY_BONUS = (taxVars as any).STATUTORY_BONUS ?? 135.10;
const STATUTORY_BONUS_2 = (taxVars as any).STATUTORY_BONUS_2 ?? 135.10;

function toAnnual(gross: number, period: Period) {
  if (period === "Annual") return { annual: gross, divisor: 1 };
  if (period === "Monthly") return { annual: gross * MONTHS_PER_YEAR, divisor: MONTHS_PER_YEAR };
  return { annual: gross * WEEKS_PER_YEAR, divisor: WEEKS_PER_YEAR };
}

function calcProgressiveTax(annualValue: number, status: number) {
  const bands = cfg[String(status)];
  if (!bands) return 0;

  for (const [lower, upper, rate, deduction] of bands) {
    const up = upper === "inf" ? Number.POSITIVE_INFINITY : upper;
    if (annualValue <= up) return Math.max(annualValue * rate - deduction, 0);
  }
  return 0;
}

export function calculateMaltaPayroll(input: {
  grossWage: number;
  period: Period;
  taxStatus: number; // 1-7
  employmentType: EmploymentType;

  includeAllowance1: boolean;
  includeAllowance2: boolean;
  includeBonus1: boolean;
  includeBonus2: boolean;

  includeNI: boolean;
  under17: boolean;
  apprentice: boolean;
  before1962: boolean;
}) {
  const { annual: annualGross, divisor } = toAnnual(input.grossWage, input.period);

  // These allowances/bonuses are treated as one-off amounts for the current pay run
  // (e.g. March allowance, statutory bonus in the relevant month).
  const allowanceThisPeriod =
    (input.includeAllowance1 ? WEEKLY_ALLOWANCE : 0) +
    (input.includeAllowance2 ? WEEKLY_ALLOWANCE_2 : 0);

  const bonusThisPeriod =
    (input.includeBonus1 ? STATUTORY_BONUS : 0) +
    (input.includeBonus2 ? STATUTORY_BONUS_2 : 0);

  // One-off amounts happen once in the year (in the current pay run).
  // For annual comparisons we add them once.
  const taxableIncome = annualGross + allowanceThisPeriod + bonusThisPeriod;

  // TAX
  // We compute:
  // 1) base annual tax on the base wage
  // 2) annual tax on base wage + the one-off amounts
  // Then we charge the incremental tax in the current pay run (not spread across the year).
  const calcAnnualTax = (annual: number) => {
    if (input.employmentType === "Full_Time") return calcProgressiveTax(annual, input.taxStatus);
    // Part-time rule
    if (annual <= 10000) return annual * 0.10;
    return 10000 * 0.10 + calcProgressiveTax(annual, input.taxStatus);
  };

  const taxBaseAnnual = calcAnnualTax(annualGross);
  const taxWithOneOffAnnual = calcAnnualTax(taxableIncome);
  const taxOneOff = Math.max(0, taxWithOneOffAnnual - taxBaseAnnual);
  const taxPerPeriodBase = Math.ceil(taxBaseAnnual / divisor);
  const taxPerPeriod = Math.round((taxPerPeriodBase + taxOneOff) * 100) / 100;

  const taxDue = taxWithOneOffAnnual;

  // NI
  // Same thresholds, but the one-off amounts should affect NI in the current period
  // (not spread across the entire year).
  let niAnnualBase = 0;
  let niAnnualWithOneOff = 0;
  let niPerPeriod = 0;
  if (input.includeNI) {
    const weeksInPeriod = input.period === "Weekly" ? 1 : input.period === "Monthly" ? WEEKS_PER_YEAR / MONTHS_PER_YEAR : WEEKS_PER_YEAR;

    const weeklyEqBase = input.period === "Weekly" ? input.grossWage : input.period === "Monthly" ? (input.grossWage * MONTHS_PER_YEAR) / WEEKS_PER_YEAR : input.grossWage / WEEKS_PER_YEAR;
    const grossWithOneOffThisPeriod = input.grossWage + allowanceThisPeriod + bonusThisPeriod;
    const weeklyEqWith = input.period === "Weekly" ? grossWithOneOffThisPeriod : input.period === "Monthly" ? (grossWithOneOffThisPeriod * MONTHS_PER_YEAR) / WEEKS_PER_YEAR : grossWithOneOffThisPeriod / WEEKS_PER_YEAR;

    const weeklyNI = (weeklyGross: number) => {
      if (input.under17 && weeklyGross <= 229.44) return 6.62;
      if (!input.under17 && weeklyGross <= 229.44) return 22.94;
      if (input.apprentice && input.under17) return Math.min(weeklyGross * 0.10, 4.38);
      if (input.apprentice) return Math.min(weeklyGross * 0.10, 7.94);
      if (input.before1962 && weeklyGross >= 229.45 && weeklyGross <= 490.38) return weeklyGross * 0.10;
      if (input.before1962 && weeklyGross >= 490.39) return 49.04;
      if (!input.before1962 && weeklyGross >= 229.45 && weeklyGross <= 559.30) return weeklyGross * 0.10;
      if (!input.before1962 && weeklyGross >= 559.31) return 55.93;
      return 0;
    };

    const baseWeekly = weeklyNI(weeklyEqBase);
    const withWeekly = weeklyNI(weeklyEqWith);

    // Annual views (for summary)
    niAnnualBase = Math.min(baseWeekly * WEEKS_PER_YEAR, 2908.36);
    niAnnualWithOneOff = Math.min(withWeekly * WEEKS_PER_YEAR, 2908.36);

    // Period due: base portion spread across periods + one-off portion charged this period
    const basePerPeriod = niAnnualBase / divisor;
    const oneOffPeriod = Math.max(0, (withWeekly - baseWeekly) * weeksInPeriod);
    const capPerPeriod = 2908.36 / divisor;
    niPerPeriod = Math.min(basePerPeriod + oneOffPeriod, capPerPeriod);
  }

  const niDue = niAnnualWithOneOff || 0;

  // Net for the current pay run must NOT spread one-off amounts across the year.
  // Compute net directly for the current period.
  const grossWithOneOffThisPeriod = input.grossWage + allowanceThisPeriod + bonusThisPeriod;
  const netPerPeriod = grossWithOneOffThisPeriod - taxPerPeriod - niPerPeriod;

  // Annual net is still useful for summaries (one-off amounts happen once in the year).
  const netAnnual = annualGross - taxDue - niDue + allowanceThisPeriod + bonusThisPeriod;

  return {
    // Base gross for the period (excluding one-off extras)
    grossPerPeriod: input.grossWage,
    // One-off extras for this pay run
    allowancePerPeriod: allowanceThisPeriod,
    bonusPerPeriod: bonusThisPeriod,
    taxPerPeriod,
    niPerPeriod,
    // Net for the current pay run includes one-off extras (not spread across the year).
    netPerPeriod: Math.round(netPerPeriod * 100) / 100,
    annual: { gross: annualGross, taxableIncome, tax: taxDue, ni: niDue, net: netAnnual },
  };
}
