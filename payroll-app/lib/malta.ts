// lib/malta.ts

// NOTE: The Maternity Leave Fund (a.k.a. Work-Life Balance Fund) is paid only by the employer.
// This implementation uses the published Class 1 SSC/MLF rates (2025 table) as a practical default.
// If you need year-specific tables, add a new table per year.

export const MONTHLY_AVG_HOURS_FULLTIME = 173.33; // 40h/week * 52 / 12

export function parseDateISO(d: string | undefined | null): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Convert monthly gross (cents) to basic weekly wage (EUR).
function monthlyGrossToWeeklyEUR(monthlyGrossCents: number): number {
  const monthly = (monthlyGrossCents ?? 0) / 100;
  return (monthly * 12) / 52;
}

// Convert weekly MLF to monthly MLF using average weeks per month.
function weeklyToMonthlyEUR(weekly: number): number {
  return weekly * (52 / 12);
}


export type MaternityFundOptions = {
  // employee flags
  under18?: boolean;
  before1962?: boolean;
  isStudent?: boolean;
};

/**
 * Compute employer Maternity Leave Fund (MLF) contribution in cents for a month.
 * The table is based on "Social Security Contributions (Class 1) 2025 – Employed Persons".
 * Notes:
 * - MLF is paid only by the employer.
 * - Rates are based on Basic Weekly Wage (which excludes allowances/bonuses/overtime).
 */
export function computeMaternityFundMonthlyCents(monthlyBaseCents: number, opts: MaternityFundOptions = {}): number {
  const weeklyWage = monthlyGrossToWeeklyEUR(monthlyBaseCents);

  const under18 = !!opts.under18;
  const before1962 = !!opts.before1962;
  const isStudent = !!opts.isStudent;

  // Student special caps exist in the table; we cap the weekly MLF when the employee is marked as a student.
  const studentWeeklyMax = under18 ? 0.13 : 0.24;

  let weeklyMLF = 0;

  // Category A/B (weekly <= 221.78)
  if (weeklyWage <= 221.78) {
    weeklyMLF = under18 ? 0.20 : 0.67;
  } else {
    // Higher wages
    if (before1962) {
      // Persons born up to 31 Dec 1961
      if (weeklyWage < 451.92) weeklyMLF = weeklyWage * 0.003; // 0.3%
      else weeklyMLF = 1.36;
    } else {
      // Persons born from 1 Jan 1962 onwards
      if (weeklyWage < 544.29) weeklyMLF = weeklyWage * 0.003; // 0.3%
      else weeklyMLF = 1.63;
    }
  }

  if (isStudent) weeklyMLF = Math.min(weeklyMLF, studentWeeklyMax);

  const monthly = weeklyToMonthlyEUR(weeklyMLF);
  return Math.round(monthly * 100);
}


export function formatTitleCase(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
