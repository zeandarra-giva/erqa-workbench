"use client";

import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { CaseRecord } from "@/lib/types";
import { slaOf } from "@/lib/insights";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cn("rounded-2xl border border-line bg-surface", className)}>{children}</div>;
}

export function CardHeader({ title, sub, action }: { title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "ok" | "warn" | "bad" | "info" | "neutral" | "violet" | "dark";
const toneCls: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  violet: "bg-violet-soft text-violet",
  neutral: "bg-subtle text-ink-2",
  dark: "bg-ink text-white",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium", toneCls[tone], className)}>{children}</span>;
}

export function Dot({ color }: { color: string }) {
  return <span className="inline-block size-2 shrink-0 rounded-full" style={{ background: color }} />;
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
const btnCls: Record<BtnVariant, string> = {
  primary: "bg-ink text-white hover:bg-ink-2 border-ink",
  secondary: "bg-surface text-ink border-line-strong hover:bg-subtle",
  ghost: "bg-transparent text-ink-2 border-transparent hover:bg-subtle",
  danger: "bg-surface text-bad border-[#f3c9cb] hover:bg-bad-soft",
  success: "bg-surface text-ok border-[#bfe8cf] hover:bg-ok-soft",
};

export function Button({ variant = "secondary", icon: Icon, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: LucideIcon }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        btnCls[variant],
        className,
      )}
    >
      {Icon && <Icon className="size-4" strokeWidth={1.8} />}
      {children}
    </button>
  );
}

const avatarColors = ["#e9d5ff", "#bfdbfe", "#fde68a", "#bbf7d0", "#fecdd3", "#c7d2fe", "#fed7aa", "#a5f3fc"];
export function Avatar({ name, size = 26 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const color = avatarColors[(name.charCodeAt(0) + name.length) % avatarColors.length];
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink-2" style={{ width: size, height: size, background: color, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

export function IconCircle({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-surface">
      <Icon className="size-5 text-ink-2" strokeWidth={1.7} />
    </span>
  );
}

export function KpiCard({ label, value, delta, deltaTone = "ok", sub, href }: { label: string; value: ReactNode; delta?: string; deltaTone?: Tone; sub?: ReactNode; href?: string }) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-start justify-between">
        <span className="text-[13.5px] text-muted">{label}</span>
        {href && (
          <Link href={href} className="inline-flex size-7 items-center justify-center rounded-lg border border-line text-ink-2 hover:bg-subtle" aria-label={`Open ${label}`}>
            <ArrowUpRight className="size-4" strokeWidth={1.8} />
          </Link>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span className="tabular text-[28px] leading-none font-semibold tracking-tight sm:text-[32px]">{value}</span>
        {delta && <Pill tone={deltaTone}>{delta}</Pill>}
      </div>
      {sub && <div className="mt-2.5 text-[13px] text-muted">{sub}</div>}
    </Card>
  );
}

export function VerdictPill({ verdict }: { verdict: "hard_stop" | "review" | "clear" }) {
  if (verdict === "hard_stop") return <Pill tone="bad">Hard stop</Pill>;
  if (verdict === "review") return null; // no yellow status pill
  return <Pill tone="ok">Looks clear</Pill>;
}

export function OutcomePill({ c }: { c: CaseRecord }) {
  if (c.outcome === "pass") return <Pill tone="ok">Pass</Pill>;
  if (c.outcome === "fail") return <Pill tone="bad">Fail</Pill>;
  if (c.outcome === "exclusion") return <Pill tone="neutral">Exclusion</Pill>;
  return null;
}

export function SlaPill({ c }: { c: CaseRecord }) {
  const s = slaOf(c);
  if (s.state === "none" || s.state === "due_today" || s.state === "due_soon") return null; // no yellow status pill
  const tone: Tone = s.state === "overdue" ? "bad" : s.state === "awaiting_send" ? "violet" : "ok";
  return <Pill tone={tone}>{s.state === "on_track" ? "On track" : s.label}</Pill>;
}

export function StageLabel({ c }: { c: CaseRecord }) {
  const map = { to_assess: "To assess", challenged: "Challenged", escalated: "Escalated", closed: "Closed" } as const;
  return <span>{map[c.stage]}</span>;
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <p className="text-[14px] font-medium">{title}</p>
      {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
    </div>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
