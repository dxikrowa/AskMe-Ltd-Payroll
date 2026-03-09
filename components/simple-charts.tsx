"use client";

import React, { useMemo, useState } from "react";

type Tip = { show: boolean; x: number; y: number; text: string };

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip.show) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: tip.x + 12,
        top: tip.y + 12,
        zIndex: 99999,
        pointerEvents: "none",
        padding: "8px 10px",
        borderRadius: 10,
        background: "var(--panel-bg)",
        border: "1px solid var(--panel-border)",
        color: "var(--text)",
        fontSize: 12,
        fontWeight: 700,
        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
        maxWidth: 260,
        whiteSpace: "pre-wrap",
      }}
    >
      {tip.text}
    </div>
  );
}

export function PieChart({
  size = 160,
  stroke = 22,
  parts,
}: {
  size?: number;
  stroke?: number;
  parts: Array<{ label: string; value: number }>;
}) {
  const total = parts.reduce((a, p) => a + Math.max(0, p.value), 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  // Deterministic palette (no hard-coded theme colors): uses HSL based on index.
  const color = (i: number) => `hsl(${(i * 67) % 360} 70% 55%)`;

  let acc = 0;
  const fmt = useMemo(() => (v: number) => `${Math.round(v)}`, []);
  const [tip, setTip] = useState<Tip>({ show: false, x: 0, y: 0, text: "" });

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <Tooltip tip={tip} />
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {parts.map((p, i) => {
            const v = Math.max(0, p.value);
            const frac = v / total;
            const dash = c * frac;
            const gap = c - dash;
            const el = (
              <circle
                key={p.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color(i)}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-c * acc}
                strokeLinecap="butt"
                onMouseEnter={(e) => {
                  setTip({ show: true, x: e.clientX, y: e.clientY, text: `${p.label}\n${fmt(v)}` });
                }}
                onMouseMove={(e) => setTip((t) => (t.show ? { ...t, x: e.clientX, y: e.clientY } : t))}
                onMouseLeave={() => setTip((t) => ({ ...t, show: false }))}
              >
                <title>{`${p.label}: ${Math.round(v)}`}</title>
              </circle>
            );
            acc += frac;
            return el;
          })}
        </g>
      </svg>

      <div style={{ display: "grid", gap: 8 }}>
        {parts.map((p, i) => (
          <div key={p.label} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: color(i) }} />
            <div style={{ fontSize: 13, opacity: 0.85 }}>{p.label}</div>
            <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800 }}>{Math.round(p.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({
  width = 520,
  height = 160,
  series,
  valueFormatter,
}: {
  width?: number;
  height?: number;
  series: Array<{ label: string; value: number }>;
  valueFormatter?: (v: number) => string;
}) {
  const max = Math.max(1, ...series.map((s) => s.value));
  const pad = 18;
  const barW = Math.max(16, (width - pad * 2) / Math.max(1, series.length) - 10);
  const gap = 10;
  const color = (i: number) => `hsl(${(i * 67) % 360} 70% 55%)`;

  const [tip, setTip] = useState<Tip>({ show: false, x: 0, y: 0, text: "" });

  return (
    <div style={{ position: "relative" }}>
      <Tooltip tip={tip} />
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: "100%" }}>
        {series.map((s, i) => {
        const h = (Math.max(0, s.value) / max) * (height - pad * 2 - 22);
        const x = pad + i * (barW + gap);
        const y = height - pad - 18 - h;
        return (
          <g key={s.label}>
            <rect x={x} y={y} width={barW} height={h} rx={6} ry={6} fill={color(i)} opacity={0.85}>
              <title>{`${s.label}: ${valueFormatter ? valueFormatter(s.value) : String(Math.round(s.value))}`}</title>
            </rect>
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={6}
              ry={6}
              fill="transparent"
              onMouseEnter={(e) => {
                const val = valueFormatter ? valueFormatter(s.value) : String(Math.round(s.value));
                setTip({ show: true, x: e.clientX, y: e.clientY, text: `${s.label}\n${val}` });
              }}
              onMouseMove={(e) => setTip((t) => (t.show ? { ...t, x: e.clientX, y: e.clientY } : t))}
              onMouseLeave={() => setTip((t) => ({ ...t, show: false }))}
            />
            <text x={x + barW / 2} y={height - pad} textAnchor="middle" fontSize="11" fill="currentColor" opacity={0.75}>
              {s.label}
            </text>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="11" fill="currentColor" opacity={0.85}>
              {valueFormatter ? valueFormatter(s.value) : String(Math.round(s.value))}
            </text>
          </g>
        );
        })}
      </svg>
    </div>
  );
}
