"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";


type NavItem = { label: string; href: string; icon: string; locked?: boolean };

const management: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "▦" },
  { label: "Organisations", href: "/organisations", icon: "🏢" },
  { label: "Payroll History", href: "/payroll/history", icon: "🕘" },
  { label: "FSS Forms", href: "/forms/ess", icon: "🗂" },
  { label: "Run Payroll", href: "/payroll/run", icon: "▶" },
  { label: "Tax Forms", href: "#", icon: "🧾", locked: true },
  { label: "Leave Management", href: "/leave", icon: "⤴" },
  { label: "Vacation Leave", href: "/leave/vacation", icon: "🏖" },
  { label: "Sick Leave", href: "/leave/sick", icon: "🤒" },
  { label: "Timesheets", href: "/timesheets", icon: "⏱" },
];

const settings: NavItem[] = [
  { label: "Tax Settings", href: "/settings/tax", icon: "⚙" },
  { label: "Other Settings", href: "/settings/general", icon: "⚙" },
];

const help: NavItem[] = [
  { label: "Support", href: "/support", icon: "💬" },
  { label: "User Guide", href: "#", icon: "📘", locked: true },
  { label: "Billing", href: "/billing", icon: "💳" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div style={{ height: "100vh", position: "sticky", top: 0, overflowY: "auto", display: "flex", flexDirection: "column", padding: 16, gap: 12, color: "var(--text)", background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}>
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 8px 14px", borderBottom: "1px solid var(--sidebar-border)", textDecoration: "none", color: "var(--text)" }}>
        
        
      </Link>

      <NavSection title="Management">{management.map((item) => <NavButton key={item.label} item={item} active={isActive(pathname, item.href)} />)}</NavSection>
      <NavSection title="Settings">{settings.map((item) => <NavButton key={item.label} item={item} active={isActive(pathname, item.href)} />)}</NavSection>
      <NavSection title="Help">{help.map((item) => <NavButton key={item.label} item={item} active={isActive(pathname, item.href)} />)}</NavSection>
      <div style={{ flex: 1 }} />
    </div>
  );
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ marginTop: 8 }}><div style={{ fontSize: 12, opacity: 0.6, margin: "10px 6px" }}>{title}</div><div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div></div>;
}

function NavButton({ item, active }: { item: NavItem; active: boolean }) {
  if (item.locked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px", borderRadius: 12, color: "var(--muted)", opacity: 0.6, cursor: "not-allowed", border: "1px solid transparent" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 18, display: "inline-block", opacity: 0.9 }}>{item.icon}</span>
          <span style={{ fontSize: 14 }}>{item.label}</span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(255,255,255,0.1)", padding: "2px 6px", borderRadius: 6, textTransform: "uppercase" }}>Soon</span>
      </div>
    );
  }

  return (
    <Link href={item.href} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", borderRadius: 12, textDecoration: "none", color: active ? "var(--text)" : "var(--muted)", background: active ? "var(--sidebar-active-bg)" : "transparent", border: active ? "1px solid var(--sidebar-active-border)" : "1px solid transparent", transition: "all 0.2s ease" }}>
      <span style={{ width: 18, display: "inline-block", opacity: 0.9 }}>{item.icon}</span>
      <span style={{ fontSize: 14 }}>{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "#") return false;
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/leave") return pathname === "/leave" || (pathname.startsWith("/leave/") && !pathname.startsWith("/leave/vacation") && !pathname.startsWith("/leave/sick"));
  return pathname === href || pathname.startsWith(href + "/");
}