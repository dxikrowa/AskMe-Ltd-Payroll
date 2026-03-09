export function inferSscCategory(params: { basicWeeklyCents: number; under17?: boolean; apprentice?: boolean; before1962?: boolean }) {
  const weekly = (params.basicWeeklyCents ?? 0) / 100;
  if (params.apprentice && params.under17) return "E";
  if (params.apprentice) return "F";
  if (params.under17 && weekly <= 229.44) return "A";
  if (weekly <= 229.44) return "B";
  if (params.before1962) return weekly <= 490.38 ? "C" : "D";
  return weekly <= 559.30 ? "C" : "D";
}
