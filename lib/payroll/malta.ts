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
}) {
  const { annual: annualGross, divisor } = toAnnual(input.grossWage, input.period);

  const allowanceThisPeriod =
    (input.includeAllowance1 ? WEEKLY_ALLOWANCE : 0) +
    (input.includeAllowance2 ? WEEKLY_ALLOWANCE_2 : 0);

  const bonusThisPeriod =
    (input.includeBonus1 ? STATUTORY_BONUS : 0) +
    (input.includeBonus2 ? STATUTORY_BONUS_2 : 0);

  const taxableIncome = annualGross + allowanceThisPeriod + bonusThisPeriod;

  const calcAnnualTax = (annual: number) => {
    if (input.employmentType === "Full_Time") return calcProgressiveTax(annual, input.taxStatus);
    if (annual <= 10000) return annual * 0.10;
    return 10000 * 0.10 + calcProgressiveTax(annual, input.taxStatus);
  };

  const taxBaseAnnual = calcAnnualTax(annualGross);
  const taxWithOneOffAnnual = calcAnnualTax(taxableIncome);
  const taxOneOff = Math.max(0, taxWithOneOffAnnual - taxBaseAnnual);
  const taxPerPeriodBase = Math.ceil(taxBaseAnnual / divisor);
  
  // Round tax strictly to the nearest whole number
  const taxPerPeriod = Math.round(taxPerPeriodBase + taxOneOff);
  const taxDue = Math.round(taxWithOneOffAnnual);

  let niAnnualBase = 0;
  let niPerPeriod = 0;

  // National Insurance calculation EXCLUDES bonuses and allowances
  if (input.includeNI) {
    const weeklyEqBase = input.period === "Weekly" ? input.grossWage : input.period === "Monthly" ? (input.grossWage * MONTHS_PER_YEAR) / WEEKS_PER_YEAR : input.grossWage / WEEKS_PER_YEAR;

    const weeklyNI = (weeklyGross: number) => {
      // PART TIME FIX: Part time workers pay a flat 10% of their gross, capped to the maximums.
      if (input.employmentType === "Part_Time") {
        if (input.before1962) return Math.min(weeklyGross * 0.10, 49.04);
        return Math.min(weeklyGross * 0.10, 55.93);
      }

      // FULL TIME RULES
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

    niAnnualBase = Math.min(baseWeekly * WEEKS_PER_YEAR, 2908.36);
    niPerPeriod = niAnnualBase / divisor;
  }

  const niDue = niAnnualBase || 0;

  const grossWithOneOffThisPeriod = input.grossWage + allowanceThisPeriod + bonusThisPeriod;
  const netPerPeriod = grossWithOneOffThisPeriod - taxPerPeriod - niPerPeriod;

  const netAnnual = annualGross - taxDue - niDue + allowanceThisPeriod + bonusThisPeriod;

  return {
    grossPerPeriod: input.grossWage,
    allowancePerPeriod: allowanceThisPeriod,
    bonusPerPeriod: bonusThisPeriod,
    taxPerPeriod,
    niPerPeriod: Math.round(niPerPeriod * 100) / 100,
    netPerPeriod: Math.round(netPerPeriod * 100) / 100,
    annual: { gross: annualGross, taxableIncome, tax: taxDue, ni: niDue, net: netAnnual },
  };
}