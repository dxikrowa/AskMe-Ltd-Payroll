"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function MarketingHeader({
  isAuthed,
}: {
  isAuthed: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = useMemo(() => {
    return scrolled ? "mk-header mk-header--scrolled" : "mk-header";
  }, [scrolled]);

  const textClass = scrolled ? "mk-header__inner mk-header__inner--light" : "mk-header__inner";

  return (
    <header className={headerClass}>
      <div className={textClass}>
        <Link href="/" className="mk-brand" aria-label="Home">
          <Image
            src={scrolled ? "/logos/askme-lion-dark.png" : "/logos/askme-lion-light.png"}
            alt="AskMe Limited Payroll"
            width={38}
            height={38}
            priority
          />
          <div className="mk-brand__text">
            <div className="mk-brand__name">ASKME LIMITED</div>
            <div className="mk-brand__sub">PAYROLL</div>
          </div>
        </Link>

        <nav className="mk-nav" aria-label="Primary">
          <button className="mk-navlink" onClick={() => scrollToId("overview")}>Overview</button>
          <button className="mk-navlink" onClick={() => scrollToId("features")}>Features</button>
          <button className="mk-navlink" onClick={() => scrollToId("demos")}>Demos</button>
          <button className="mk-navlink" onClick={() => scrollToId("pricing")}>Pricing</button>
          <button className="mk-navlink" onClick={() => scrollToId("faq")}>FAQ</button>
          <button className="mk-navlink" onClick={() => scrollToId("contact")}>Contact</button>
        </nav>

        <div className="mk-cta">
          <Link className={scrolled ? "mk-btn mk-btn--ghost mk-btn--ghost-light" : "mk-btn mk-btn--ghost"} href={isAuthed ? "/dashboard" : "/login"}>
            Dashboard
          </Link>
          <Link className={scrolled ? "mk-btn mk-btn--primary mk-btn--primary-light" : "mk-btn mk-btn--primary"} href={isAuthed ? "/account" : "/login"}>
            My Account
          </Link>
        </div>
      </div>
    </header>
  );
}
