"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Demo = {
  key: string;
  label: string;
  title: string;
  desc: string;
  img: string;
};

const demos: Demo[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "A clear payroll dashboard",
    desc: "Track pay runs, totals, and recent activity at a glance.",
    img: "/marketing/placeholder-dashboard.svg",
  },
  {
    key: "run",
    label: "Run Payroll",
    title: "Run payroll with confidence",
    desc: "Preview results, generate outputs, and keep history consistent.",
    img: "/marketing/placeholder-dashboard.svg",
  },
  {
    key: "fss",
    label: "FSS Forms",
    title: "FSS forms, ready to export",
    desc: "Generate FS3 / FS5 / FS7 with clean layouts and correct totals.",
    img: "/marketing/placeholder-dashboard.svg",
  },
  {
    key: "leave",
    label: "Leave",
    title: "Leave & absence tracking",
    desc: "Keep leave aligned with payroll periods and reporting.",
    img: "/marketing/placeholder-dashboard.svg",
  },
  {
    key: "timesheets",
    label: "Timesheets",
    title: "Timesheets built for payroll",
    desc: "Capture hours and overtime without manual spreadsheets.",
    img: "/marketing/placeholder-dashboard.svg",
  },
];

export default function DemosTabs() {
  const [active, setActive] = useState(demos[0]!.key);

  const demo = useMemo(() => demos.find((d) => d.key === active) ?? demos[0]!, [active]);

  return (
    <div className="mk-demos">
      <div className="mk-demos__tabs" role="tablist" aria-label="Demos">
        {demos.map((d) => (
          <button
            key={d.key}
            role="tab"
            aria-selected={d.key === active}
            className={d.key === active ? "mk-chip mk-chip--active" : "mk-chip"}
            onClick={() => setActive(d.key)}
            type="button"
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="mk-demos__panel">
        <div className="mk-demos__copy">
          <h3 className="mk-h3">{demo.title}</h3>
          <p className="mk-p">{demo.desc}</p>
        </div>

        <div className="mk-demos__media">
          <div className="mk-mediaFrame">
            <Image
              src={demo.img}
              alt={demo.title}
              width={1200}
              height={720}
              className="mk-mediaFrame__img"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
