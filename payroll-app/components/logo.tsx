/**
 * components/logo.tsx
 *
 * Reusable Logo component.
 * 
 * Usage:
 *   <Logo variant="light"  size="md" />   // white lion on navy bg – for sidebar/header
 *   <Logo variant="dark"   size="md" />   // navy lion on white bg – for landing page
 *   <Logo variant="auto"   size="lg" />   // switches based on CSS theme variable
 *
 * Image files expected in /public:
 *   /askmeltdlionpayroll.png      (dark navy background, white lion — Image 1)
 *   /askmeltdbluelionpayroll.png  (white background, navy lion   — Image 2)
 *
 * Copy the uploaded logo files to your /public directory:
 *   cp askmeltdlionpayroll.png     public/
 *   cp askmeltdbluelionpayroll.png public/
 */

import Image from "next/image";

type LogoVariant = "light" | "dark" | "icon-only";
type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LogoProps {
  /** "light" = white lion (for dark backgrounds), "dark" = navy lion (for light backgrounds) */
  variant?: LogoVariant;
  size?: LogoSize;
  /** Hide the text, show only the lion icon */
  iconOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SIZE_MAP: Record<LogoSize, { height: number; width: number }> = {
  xs: { height: 28,  width: 112 },
  sm: { height: 36,  width: 144 },
  md: { height: 48,  width: 192 },
  lg: { height: 64,  width: 256 },
  xl: { height: 88,  width: 352 },
};

const ICON_SIZE_MAP: Record<LogoSize, { height: number; width: number }> = {
  xs: { height: 28, width: 22 },
  sm: { height: 36, width: 29 },
  md: { height: 48, width: 38 },
  lg: { height: 64, width: 51 },
  xl: { height: 88, width: 70 },
};

export default function Logo({
  variant = "light",
  size = "md",
  iconOnly = false,
  className,
  style,
}: LogoProps) {
  const src =
    variant === "dark"
      ? "/askmeltdbluelionpayroll.png"
      : "/askmeltdlionpayroll.png";

  const dims = iconOnly ? ICON_SIZE_MAP[size] : SIZE_MAP[size];

  return (
    <Image
      src={src}
      alt="AskMe Limited Payroll"
      width={dims.width}
      height={dims.height}
      priority
      className={className}
      style={{
        objectFit: "contain",
        objectPosition: iconOnly ? "left center" : "center",
        ...style,
      }}
    />
  );
}

/**
 * Sidebar / Header Logo – always uses the light variant (white lion)
 * since those areas are on a dark background.
 */
export function SidebarLogo() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--sidebar-border)",
      }}
    >
      <Logo variant="light" size="sm" />
    </div>
  );
}

/**
 * Compact icon-only version for collapsed sidebars.
 */
export function SidebarLogoCompact() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 0",
      }}
    >
      <Logo variant="light" size="sm" iconOnly />
    </div>
  );
}
