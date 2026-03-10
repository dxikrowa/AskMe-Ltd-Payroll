"use client";

import Link from "next/link";
import Image from "next/image";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect } from "react";

export default function MarketingHeader() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const signedIn = status === "authenticated";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header style={{ 
      position: "sticky", top: 0, zIndex: 50, 
      background: scrolled ? "rgba(11, 18, 32, 0.85)" : "transparent", 
      backdropFilter: scrolled ? "blur(12px)" : "none", 
      borderBottom: scrolled ? "1px solid var(--panel-border)" : "1px solid transparent",
      transition: "all 0.3s ease" 
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "var(--text)" }}>
          <Image src="/askmeltdlionpayroll.png" alt="AskMe Logo" width={84} height={84} style={{ objectFit: "contain" }} />
          <div>
            
          </div>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <a href="#features" style={navLink}>Features</a>
          <a href="#demos" style={navLink}>Demo</a>
          <a href="#pricing" style={navLink}>Pricing</a>
          <a href="#contact" style={navLink}>Contact</a>
          {signedIn ? <>
              <Link href="/dashboard" style={primaryBtn}>Dashboard</Link>
              <div style={{ position: "relative" }}>
                <button style={ghostBtn} onClick={() => setOpen((v) => !v)}>My Account</button>
                {open && <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 12, minWidth: 180, boxShadow: "0 12px 32px rgba(0,0,0,0.4)", overflow: "hidden" }}>
                  <Link href="/account" style={dropItem} onClick={() => setOpen(false)}>My account</Link>
                  <Link href="/dashboard" style={dropItem} onClick={() => setOpen(false)}>Dashboard</Link>
                  <button style={{ ...dropItem, width: "100%", textAlign: "left", background: "transparent", border: 0, cursor: "pointer" }} onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>
                </div>}
              </div>
            </> : <>
              <Link href="/login" style={ghostBtn}>Sign in</Link>
              <Link href="/register" style={primaryBtn}>Start Free Trial</Link>
            </>}
        </nav>
      </div>
    </header>
  );
}

const navLink = { color: "var(--muted)", textDecoration: "none", fontSize: 14, fontWeight: 600, transition: "color 0.2s" } as const;
const ghostBtn = { padding: "10px 16px", borderRadius: 10, border: "1px solid var(--panel-border)", background: "transparent", color: "var(--text)", textDecoration: "none", fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "background 0.2s" } as const;
const primaryBtn = { padding: "10px 16px", borderRadius: 10, border: "none", background: "#38bdf8", color: "#0b1220", textDecoration: "none", fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "transform 0.2s" } as const;
const dropItem = { display: "block", padding: "12px 16px", color: "var(--text)", textDecoration: "none", fontSize: 14, borderBottom: "1px solid var(--panel-border)", transition: "background 0.2s" } as const;