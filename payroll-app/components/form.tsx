"use client";
import type { ReactNode } from "react";
import { input, grid2 } from "@/components/styles";

export function Grid({ children }: { children: ReactNode }) {
  return <div style={grid2}>{children}</div>;
}

export function Input({
  label,
  defaultValue,
}: {
  label: string;
  defaultValue?: string;
}) {
  return (
    <label>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <input defaultValue={defaultValue} style={input} />
    </label>
  );
}