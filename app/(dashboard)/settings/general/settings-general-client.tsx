"use client";

import { useTheme, type ThemeId } from "@/lib/theme";
import { panel, sectionTitle, input } from "@/components/styles";

export default function SettingsGeneralClient() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Other Settings</div>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>Personalize the look & feel of the dashboard.</div>

      <div style={panel}>
        <div style={sectionTitle}>Theme</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Choose theme</div>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)} style={input as any}>
              <option value="dark">Dark (default)</option>
              <option value="modern">Modern</option>
              <option value="brand">Brand (marketing match)</option>
            </select>
          </label>

          <div style={{ opacity: 0.75, fontSize: 13 }}>
            Tip: this is saved on this device (localStorage).
          </div>
        </div>
      </div>
    </div>
  );
}
