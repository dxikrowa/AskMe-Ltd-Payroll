// components/ui/styles.ts
import type { CSSProperties } from "react";

export const panel: CSSProperties = {
  marginTop: 14,
  borderRadius: 12,
  padding: 16,
  background: "var(--panel-bg)",
  border: "1px solid var(--panel-border)",
};

export const sectionTitle: CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  opacity: 0.7,
  marginBottom: 10,
};

export const row: CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 12,
  borderRadius: 12,
  background: "var(--panel-bg)",
  border: "1px solid var(--panel-border)",
};

export const input: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  color: "var(--text)",
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
  outline: "none",
};

export const primaryBtn: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  background: "var(--btn-primary-bg)",
  color: "var(--btn-primary-text)",
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};

export const ghostBtn: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  background: "var(--btn-ghost-bg)",
  border: "1px solid var(--btn-ghost-border)",
  color: "var(--text)",
  cursor: "pointer",
};

export const dangerBtn: CSSProperties = {
  height: 38,
  padding: "0 12px",
  borderRadius: 10,
  background: "var(--btn-danger-bg)",
  color: "var(--btn-danger-text)",
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};

export const grid2: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};
