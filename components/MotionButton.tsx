"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Variant = "primary" | "soft" | "outline" | "danger" | "ghost";
type Size = "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "shine bg-[#0b4f43] text-white shadow-md shadow-[#0b4f43]/20 hover:bg-[#083d34] hover:shadow-lg hover:shadow-[#0b4f43]/25",
  soft: "bg-[#def3f1] text-[#0b4f43] hover:bg-[#cdebe8] hover:shadow-md hover:shadow-[#0b4f43]/10",
  outline: "border border-[#d5dde0] bg-white text-[#1b2733] hover:border-[#0b4f43] hover:text-[#0b4f43]",
  danger: "bg-[#fdecea] text-[#a3341f] hover:bg-[#fadbd6] hover:shadow-md hover:shadow-[#a3341f]/10",
  ghost: "text-[#5f6b76] hover:bg-[#eef1f3] hover:text-[#1b2733]",
};

const sizes: Record<Size, string> = {
  md: "gap-2 px-4 py-2.5 text-sm",
  lg: "gap-2.5 px-6 py-3.5 text-base",
};

interface Props {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
}

/**
 * Pill button with motion: lifts on hover, presses in on click, nudges its
 * icon, and draws a ripple from the pointer. Primary buttons also get a light
 * sweep. All motion is disabled for users who prefer reduced motion.
 */
export function MotionButton({ variant = "soft", size = "md", icon, href, type = "button", disabled, onClick, className = "", title, children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);

  function addRipple(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || disabled) return;
    const rect = el.getBoundingClientRect();
    const d = Math.max(rect.width, rect.height);
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: e.clientX - rect.left - d / 2, y: e.clientY - rect.top - d / 2, size: d }]);
    setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 650);
  }

  const classes = `group relative isolate inline-flex select-none items-center justify-center overflow-hidden rounded-full font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-[.96] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0b4f43]/25 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {ripples.map((r) => (
        <span key={r.id} className="ripple" style={{ left: r.x, top: r.y, width: r.size, height: r.size }} />
      ))}
      {icon && <span className="inline-flex transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-6">{icon}</span>}
      {children && <span>{children}</span>}
    </>
  );

  if (href && !disabled) {
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} className={classes} onPointerDown={addRipple} onClick={onClick} title={title} aria-label={rest["aria-label"]}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} disabled={disabled} className={classes} onPointerDown={addRipple} onClick={onClick} title={title} aria-label={rest["aria-label"]}>
      {content}
    </button>
  );
}
