// components/header.tsx
"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();

  const displayLetter =
    (session?.user?.name?.trim()?.[0] || session?.user?.email?.trim()?.[0] || "U").toUpperCase();

  return (
    <header
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        color: "var(--text)",
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Dashboard</div>

        <select
          defaultValue="org1"
          style={{
            height: 36,
            padding: "0 12px",
            borderRadius: 10,
            background: "var(--input-bg)",
            border: "1px solid var(--input-border)",
            color: "var(--text)",
            outline: "none",
          }}
        >
          <option value="org1">My Organisation</option>
        </select>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link
          href="/account"
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid var(--btn-ghost-border)",
            background: "var(--btn-ghost-bg)",
            color: "var(--text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              style={{ width: 22, height: 22, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "var(--toggle-on-bg)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {displayLetter}
            </div>
          )}

          <div style={{ fontWeight: 500 }}>My Account</div>
          <div style={{ marginLeft: "auto", opacity: 0.7 }}>›</div>
        </Link>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid var(--btn-ghost-border)",
            background: "var(--btn-ghost-bg)",
            color: "var(--text)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt=""
              style={{ width: 22, height: 22, borderRadius: 999, objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "var(--toggle-on-bg)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {displayLetter}
            </span>
          )}
          Sign out
        </button>
      </div>
    </header>
  );
}
