"use client";

import { useEffect, useMemo, useState } from "react";
import { panel, sectionTitle, input as inputBase, primaryBtn, ghostBtn, dangerBtn } from "@/components/styles";

type Band = [number, number | "inf", number, number];
type TaxConfig = Record<string, Band[]>;

type Vars = {
  WEEKLY_ALLOWANCE: number;
  WEEKLY_ALLOWANCE_2: number;
  STATUTORY_BONUS: number;
  STATUTORY_BONUS_2: number;
};

function num(v: any): number {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function TaxSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({});
  const [vars, setVars] = useState<Vars>({
    WEEKLY_ALLOWANCE: 121.16,
    WEEKLY_ALLOWANCE_2: 121.16,
    STATUTORY_BONUS: 135.1,
    STATUTORY_BONUS_2: 135.1,
  });

  // Hide the large configuration panels by default to save screen space.
  const [showBands, setShowBands] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/settings/tax", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setTaxConfig(d?.taxConfig ?? {});
        setVars((prev) => ({ ...prev, ...(d?.variables ?? {}) }));
      })
      .catch((e) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const statuses = useMemo(() => {
    const keys = Object.keys(taxConfig ?? {}).sort((a, b) => Number(a) - Number(b));
    return keys.length ? keys : ["1", "2", "3", "4", "5", "6", "7"];
  }, [taxConfig]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taxConfig, variables: vars }),
      });
      if (!res.ok) {
        setError((await res.json())?.error ?? "Failed to save");
        return;
      }
      alert("Saved. (If you are running in production, the server may need a restart for changes to apply.)");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    if (!confirm("Reset tax bands + allowance/bonus values to defaults?")) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings/tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (!res.ok) {
        setError((await res.json())?.error ?? "Failed to reset");
        return;
      }
      const d = await fetch("/api/settings/tax", { cache: "no-store" }).then((r) => r.json());
      setTaxConfig(d?.taxConfig ?? {});
      setVars((prev) => ({ ...prev, ...(d?.variables ?? {}) }));
    } finally {
      setSaving(false);
    }
  }

  function updateBand(status: string, idx: number, patch: Partial<{ lower: number; upper: number | "inf"; rate: number; deduction: number }>) {
    setTaxConfig((prev) => {
      const next = { ...(prev ?? {}) } as TaxConfig;
      const bands = [...(next[status] ?? [])];
      const cur = bands[idx] ?? [0, "inf", 0, 0];
      const lower = "lower" in patch ? (patch.lower as number) : cur[0];
      const upper = "upper" in patch ? (patch.upper as any) : cur[1];
      const rate = "rate" in patch ? (patch.rate as number) : cur[2];
      const deduction = "deduction" in patch ? (patch.deduction as number) : cur[3];
      bands[idx] = [lower, upper, rate, deduction];
      next[status] = bands;
      return next;
    });
  }

  function addBand(status: string) {
    setTaxConfig((prev) => {
      const next = { ...(prev ?? {}) } as TaxConfig;
      const bands = [...(next[status] ?? [])];
      bands.push([0, "inf", 0, 0]);
      next[status] = bands;
      return next;
    });
  }

  function removeBand(status: string, idx: number) {
    setTaxConfig((prev) => {
      const next = { ...(prev ?? {}) } as TaxConfig;
      const bands = [...(next[status] ?? [])];
      bands.splice(idx, 1);
      next[status] = bands;
      return next;
    });
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Tax Settings</div>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>
        Edit tax bands and the statutory allowance/bonus values used by the payroll calculator.
      </div>

      {error ? <div style={{ ...panel, borderColor: "rgba(255,0,0,0.25)" }}>{error}</div> : null}

      <div style={{ display: "grid", gap: 14 }}>
        <div style={panel}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={sectionTitle}>Tax bands & statutory values</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Hide/show the large configuration section.</div>
            </div>
            <button style={ghostBtn} onClick={() => setShowBands((s) => !s)}>
              {showBands ? "Hide" : "Show"}
            </button>
          </div>

          {showBands ? (
            <div style={{ marginTop: 12, display: "grid", gap: 14 }}>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Allowances & Bonuses</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                  <label>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Weekly allowance 1</div>
                    <input style={inputBase} value={String(vars.WEEKLY_ALLOWANCE)} onChange={(e) => setVars((s) => ({ ...s, WEEKLY_ALLOWANCE: num(e.target.value) }))} />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Weekly allowance 2</div>
                    <input style={inputBase} value={String(vars.WEEKLY_ALLOWANCE_2)} onChange={(e) => setVars((s) => ({ ...s, WEEKLY_ALLOWANCE_2: num(e.target.value) }))} />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Statutory bonus 1</div>
                    <input style={inputBase} value={String(vars.STATUTORY_BONUS)} onChange={(e) => setVars((s) => ({ ...s, STATUTORY_BONUS: num(e.target.value) }))} />
                  </label>
                  <label>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Statutory bonus 2</div>
                    <input style={inputBase} value={String(vars.STATUTORY_BONUS_2)} onChange={(e) => setVars((s) => ({ ...s, STATUTORY_BONUS_2: num(e.target.value) }))} />
                  </label>
                </div>
              </div>

              <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 10 }}>Tax bands</div>
                {loading ? (
                  <div style={{ opacity: 0.7 }}>Loading…</div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {statuses.map((status) => (
                      <div key={status} style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 12 }}>
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>Status {status}</div>
                        <div style={{ display: "grid", gap: 8 }}>
                          {(taxConfig[status] ?? []).map((b, idx) => (
                            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
                              <label>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Lower</div>
                                <input style={inputBase} value={String(b[0])} onChange={(e) => updateBand(status, idx, { lower: num(e.target.value) })} />
                              </label>
                              <label>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Upper</div>
                                <input
                                  style={inputBase}
                                  value={String(b[1])}
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    updateBand(status, idx, { upper: v === "inf" ? "inf" : num(v) });
                                  }}
                                  placeholder="inf"
                                />
                              </label>
                              <label>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Rate</div>
                                <input style={inputBase} value={String(b[2])} onChange={(e) => updateBand(status, idx, { rate: num(e.target.value) })} />
                              </label>
                              <label>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>Deduction</div>
                                <input style={inputBase} value={String(b[3])} onChange={(e) => updateBand(status, idx, { deduction: num(e.target.value) })} />
                              </label>
                              <button style={dangerBtn} onClick={() => removeBand(status, idx)}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button style={ghostBtn} onClick={() => addBand(status)}>
                            Add band
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={primaryBtn} onClick={save} disabled={saving || loading}>
            Save
          </button>
          <button style={ghostBtn} onClick={reset} disabled={saving}>
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
