"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import {
  LayoutGrid, FileInput, ListChecks, SquareKanban, Send, FileBarChart, ShieldCheck, RotateCcw, CalendarDays, ChevronsUpDown, type LucideIcon,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { slaOf } from "@/lib/insights";
import { assess } from "@/lib/rules";
import { fmtDate, DEMO_TODAY } from "@/lib/dates";
import { CURRENT_ANALYST } from "@/lib/seed";
import { Avatar, IconCircle, cn } from "./ui";
import { DemoTour } from "./tour";

interface NavItem { href: string; label: string; icon: LucideIcon; badge?: number }

const TITLES: { match: (p: string) => boolean; title: string; icon: LucideIcon }[] = [
  { match: (p) => p === "/", title: "Overview", icon: LayoutGrid },
  { match: (p) => p.startsWith("/intake"), title: "Weekly Intake", icon: FileInput },
  { match: (p) => p.startsWith("/queue"), title: "Assessment Queue", icon: ListChecks },
  { match: (p) => p.startsWith("/board"), title: "Challenge Board", icon: SquareKanban },
  { match: (p) => p.startsWith("/cases"), title: "Case", icon: ListChecks },
  { match: (p) => p.startsWith("/outbox"), title: "Outbox", icon: Send },
  { match: (p) => p.startsWith("/reports"), title: "HR & Training Reports", icon: FileBarChart },
  { match: (p) => p.startsWith("/rules"), title: "Ruleset & Back-test", icon: ShieldCheck },
];

function Logo() {
  return (
    <span className="inline-flex size-10 items-center justify-center rounded-full bg-ink">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
        <path d="M8.5 12l2.3 2.3 4.7-4.8" />
      </svg>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  // usePathname() must sit inside Suspense for dynamic routes to prerender (Next 16).
  return (
    <Suspense fallback={<div className="min-h-screen bg-canvas" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, dispatch } = useStore();
  const toAssess = state.cases.filter((c) => c.stage === "to_assess").length;
  const drafts = state.emails.filter((e) => e.status === "draft").length;
  const open = state.cases.filter((c) => c.stage === "challenged" || c.stage === "escalated");
  const overdue = open.filter((c) => slaOf(c).state === "overdue").length;
  const dueToday = open.filter((c) => slaOf(c).state === "due_today").length;
  const hardStops = state.cases.filter((c) => c.stage === "to_assess" && assess(c, state.acronyms).verdict === "hard_stop").length;

  const main: NavItem[] = [
    { href: "/", label: "Overview", icon: LayoutGrid },
    { href: "/intake", label: "Weekly Intake", icon: FileInput },
    { href: "/queue", label: "Assessment Queue", icon: ListChecks, badge: toAssess },
    { href: "/board", label: "Challenge Board", icon: SquareKanban },
    { href: "/outbox", label: "Outbox", icon: Send, badge: drafts },
    { href: "/reports", label: "HR & Training Reports", icon: FileBarChart },
  ];
  const gov: NavItem[] = [{ href: "/rules", label: "Ruleset & Back-test", icon: ShieldCheck }];
  const views = [
    { href: "/board?view=overdue", label: "Overdue responses", color: "#c2262e", n: overdue },
    { href: "/board?view=today", label: "Due today", color: "#e8890c", n: dueToday },
    { href: "/queue?verdict=hard_stop", label: "Hard stops to assess", color: "#6d4ae8", n: hardStops },
  ];

  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href.split("?")[0]));
  const t = TITLES.find((x) => x.match(pathname)) ?? TITLES[0];

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] transition-colors",
        active(item.href) ? "bg-subtle font-medium text-ink" : "text-ink-2 hover:bg-subtle/70",
      )}
    >
      {active(item.href) && <span className="absolute -left-5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-accent" />}
      <item.icon className={cn("size-[18px]", active(item.href) ? "text-accent" : "text-ink-2")} strokeWidth={1.7} />
      <span className="flex-1">{item.label}</span>
      {!!item.badge && <span className="tabular rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium text-ink-2 ring-1 ring-line">{item.badge}</span>}
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-3 border-b border-line px-6 py-5">
          <Logo />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold tracking-tight">ERQA Workbench</div>
            <div className="truncate text-[12.5px] text-muted">Entitlements Governance</div>
          </div>
          <span className="inline-flex size-7 items-center justify-center rounded-lg border border-line text-muted">
            <ChevronsUpDown className="size-3.5" />
          </span>
        </div>
        <nav data-tour="sidebar" className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-2 px-3 text-[11.5px] font-medium tracking-wider text-faint">WORKFLOW</div>
          <div className="space-y-0.5">{main.map((i) => <NavLink key={i.href} item={i} />)}</div>
          <div className="mt-6 mb-2 px-3 text-[11.5px] font-medium tracking-wider text-faint">GOVERNANCE</div>
          <div className="space-y-0.5">{gov.map((i) => <NavLink key={i.href} item={i} />)}</div>
          <div className="mt-6 mb-2 px-3 text-[11.5px] font-medium tracking-wider text-faint">SAVED VIEWS</div>
          <div className="space-y-0.5">
            {views.map((v) => (
              <Link key={v.href} href={v.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] text-ink-2 hover:bg-subtle/70">
                <span className="size-2 rounded-full" style={{ background: v.color }} />
                <span className="flex-1">{v.label}</span>
                <span className="tabular text-[12.5px] text-muted">{v.n}</span>
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t border-line px-5 py-4">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.confirm("Reset all demo data to the original synthetic dataset?")) dispatch({ type: "reset" });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-muted hover:bg-subtle"
          >
            <RotateCcw className="size-4" /> Reset demo data
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b sm:gap-4 border-line bg-surface/90 px-5 py-3.5 backdrop-blur lg:px-8">
          <IconCircle icon={t.icon} />
          <span className="truncate text-[16px] font-medium tracking-tight sm:text-[17px]">{t.title}</span>
          <div className="ml-auto flex items-center gap-2.5">
            
            <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[12.5px] text-ink-2 md:inline-flex">
              <CalendarDays className="size-3.5" /> {fmtDate(DEMO_TODAY)}
            </span>
            <span className="flex items-center gap-2 rounded-full border border-line py-1 pr-3 pl-1">
              <Avatar name={CURRENT_ANALYST} size={26} />
              <span className="hidden text-[13px] font-medium md:inline">{CURRENT_ANALYST}</span>
            </span>
          </div>
        </header>
        {/* mobile nav */}
        <nav className="scroll-thin flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 lg:hidden">
          {[...main, ...gov].map((i) => (
            <Link key={i.href} href={i.href} className={cn("flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]", active(i.href) ? "bg-subtle font-medium" : "text-ink-2")}>
              <i.icon className="size-4" strokeWidth={1.7} /> {i.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-7">{children}</main>
        <DemoTour />
      </div>
    </div>
  );
}
