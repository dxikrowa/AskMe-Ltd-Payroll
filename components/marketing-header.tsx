import Image from "next/image";

"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function MarketingHeader() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const signedIn = status === "authenticated";

  return <header style={{ position:"sticky", top:0, zIndex:50, background:"rgba(255,255,255,0.92)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e5e7eb" }}>
    <div style={{ maxWidth:1200, margin:"0 auto", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
      <Link href="/" style={{ display:"flex", flexDirection:"column", textDecoration:"none", color:"#0f172a" }}>
        <Image src="/askmeltdbluelionpayroll.png" alt="AskMe Logo" width={32} height={32} style={{ objectFit: "contain", marginBottom: -4 }} /> <span style={{ fontWeight:900, fontSize:18 }}>AskMe Payroll</span>
        <span style={{ fontSize:12, color:"#64748b" }}>Payroll SaaS for Malta</span>
      </Link>
      <nav style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <a href="#features" style={navLink}>Features</a>
        <a href="#demos" style={navLink}>Demo</a>
        <a href="#pricing" style={navLink}>Pricing</a>
        <a href="#contact" style={navLink}>Contact</a>
        {signedIn ? <>
            <Link href="/dashboard" style={primaryBtn}>Dashboard</Link>
            <div style={{ position:"relative" }}>
              <button style={ghostBtn} onClick={() => setOpen((v) => !v)}>My Account</button>
              {open && <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", background:"white", border:"1px solid #e5e7eb", borderRadius:12, minWidth:180, boxShadow:"0 12px 32px rgba(0,0,0,0.08)", overflow:"hidden" }}>
                <Link href="/account" style={dropItem} onClick={() => setOpen(false)}>My account</Link>
                <Link href="/dashboard" style={dropItem} onClick={() => setOpen(false)}>Dashboard</Link>
                <button style={{ ...dropItem, width:"100%", textAlign:"left", background:"white", border:0, cursor:"pointer" }} onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
              </div>}
            </div>
          </> : <>
            <Link href="/login" style={ghostBtn}>Sign in</Link>
            <Link href="/register" style={primaryBtn}>Start now</Link>
          </>}
      </nav>
    </div>
  </header>;
}

const navLink = { color: "#374151", textDecoration: "none", fontSize: 14, fontWeight: 600 } as const;
const ghostBtn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", color: "#111827", textDecoration: "none", fontWeight: 700, fontSize: 14 } as const;
const primaryBtn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #8a6a18", background: "#8a6a18", color: "white", textDecoration: "none", fontWeight: 700, fontSize: 14 } as const;
const dropItem = { display:"block", padding:"10px 12px", color:"#111827", textDecoration:"none", fontSize:14, borderBottom:"1px solid #f3f4f6" } as const;
