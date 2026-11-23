"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, MoreHorizontal, Search, ShieldAlert, Mail, Filter } from "lucide-react";
import { useStore } from "@/lib/store";
import { slaOf } from "@/lib/insights";
import { assess } from "@/lib/rules";
import { fmtShort, DEMO_TODAY, daysBetween } from "@/lib/dates";
import type { CaseRecord } from "@/lib/types";
import { Avatar, OutcomePill, PageTitle, Pill, SlaPill, VerdictPill, cn } from "@/components/ui";

type View = "all" | "overdue" | "today";

const isJustSent = (c: CaseRecord) =>
  (c.stage === "challenged" && c.challengeSentAt === DEMO_TODAY) || (c.stage === "escalated" && c.escalationSentAt === DEMO_TODAY);

function CaseCard({ c, acronyms }: { c: CaseRecord; acronyms: string[] }) {
  const s = slaOf(c);
  const a = c.stage === "to_assess" ? assess(c, acronyms) : null;
  const due = s.due;
  return (
    <Link href={`/cases/${c.id}`} className="block rounded-2xl border border-line bg-surface p-4 transition-shadow hover:shadow-[0_4px_18px_-8px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {isJustSent(c) && <Pill tone="info" className="mb-1.5">Just sent</Pill>}
          <div className="text-[15.5px] leading-snug font-medium tracking-tight">{c.app}</div>
          <div className="mt-0.5 truncate font-mono text-[12px] text-muted">{c.func}</div>
        </div>
        {a ? <VerdictPill verdict={a.verdict} /> : c.stage === "closed" ? <OutcomePill c={c} /> : <SlaPill c={c} />}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-1"><ShieldAlert className="size-3.5 text-muted" />{(a ? a.hardStops.length : c.failedRules?.length) ?? 0} rule{((a ? a.hardStops.length : c.failedRules?.length) ?? 0) === 1 ? "" : "s"}</span>
        <span className="text-faint">·</span>
        <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5 text-muted" />{due ? `Due ${fmtShort(due)}` : c.closedAt ? `Closed ${fmtShort(c.closedAt)}` : `W${c.week}`}</span>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
        <Avatar name={c.reviewer.name} size={26} />
        <span className="flex-1 truncate text-[13.5px]">{c.reviewer.name}</span>
        <span className="inline-flex size-7 items-center justify-center rounded-lg border border-line text-muted"><MoreHorizontal className="size-4" /></span>
      </div>
    </Link>
  );
}

function BoardInner() {
  const { state } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const view = (params.get("view") as View) || "all";
  const [q, setQ] = useState("");

  const match = (c: CaseRecord) => {
    const ql = q.toLowerCase();
    if (ql && ![c.id, c.app, c.reviewer.name, c.func].some((x) => x.toLowerCase().includes(ql))) return false;
    if (view === "overdue") return slaOf(c).state === "overdue";
    if (view === "today") return slaOf(c).state === "due_today";
    return true;
  };

  const cols = useMemo(() => {
    const cs = state.cases.filter(match);
    const awaiting = cs.filter((c) => slaOf(c).state === "awaiting_send");
    return [
      { key: "await", title: "Email awaiting approval", color: "#6d4ae8", items: awaiting, hint: "Drafted, not sent yet. Approve in the Outbox and the case moves to Challenged." },
      { key: "chal", title: "Challenged", color: "#2f62f5", items: cs.filter((c) => c.stage === "challenged" && c.challengeSentAt), hint: "Email sent · reviewer has 7 days to respond" },
      { key: "esc", title: "Escalated", color: "#e8890c", items: cs.filter((c) => c.stage === "escalated" && c.escalationSentAt), hint: "Manager · 7 days" },
      { key: "closed", title: "Resolved (last 14 days)", color: "#15803d", items: view === "all" ? cs.filter((c) => c.stage === "closed" && !!c.challengeSentAt && c.closedAt && daysBetween(c.closedAt, DEMO_TODAY) <= 14) : [], hint: "" },
    ].map((col) => ({
      ...col,
      // just-sent cases first, then most urgent deadline
      items: [...col.items].sort((a, b) => Number(isJustSent(b)) - Number(isJustSent(a)) || (slaOf(a).left ?? 99) - (slaOf(b).left ?? 99)),
      overdue: col.items.filter((c) => slaOf(c).state === "overdue").length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.cases, view, q]);

  const views: { k: View; label: string }[] = [
    { k: "all", label: "All cases" },
    { k: "today", label: "Due today" },
    { k: "overdue", label: "Overdue" },
  ];

  return (
    <div>
      <PageTitle title="Challenge Board" sub="Only cases an analyst has challenged, from email approval to resolution. Undecided cases stay in the Assessment Queue." />
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex h-10 w-full max-w-[300px] items-center gap-2 rounded-xl border border-line-strong bg-surface px-3">
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case, app or reviewer…" className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint" />
        </div>
        <div className="flex rounded-xl border border-line-strong bg-surface p-1">
          {views.map((v) => (
            <button key={v.k} onClick={() => router.replace(v.k === "all" ? "/board" : `/board?view=${v.k}`)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px]", view === v.k ? "bg-subtle font-medium" : "text-muted hover:text-ink")}>
              {v.k !== "all" && <Filter className="size-3.5" />}{v.label}
            </button>
          ))}
        </div>
        <Link href="/outbox" className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3.5 text-[13.5px] font-medium hover:bg-subtle">
          <Mail className="size-4 text-violet" /> Outbox <Pill tone="violet">{state.emails.filter((e) => e.status === "draft").length} drafts</Pill>
        </Link>
      </div>

      <div data-tour="board" className="scroll-thin flex gap-4 overflow-x-auto pb-4">
        {cols.map((col) => (
          <div key={col.key} className="flex w-[min(330px,85vw)] shrink-0 flex-col rounded-[22px] border border-line bg-[#efeff1] p-2.5">
            <div className="mb-2.5 flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
              <span className="size-2.5 rounded-full" style={{ background: col.color }} />
              <span className="flex-1 text-[15px] font-medium tracking-tight">{col.title}</span>
              <Pill>{col.items.length} cases</Pill>
              {col.overdue > 0 && <Pill tone="bad">{col.overdue} overdue</Pill>}
            </div>
            <div className="flex max-h-[calc(100vh-290px)] flex-col gap-2.5 overflow-y-auto scroll-thin pr-0.5">
              {col.items.map((c) => <CaseCard key={c.id} c={c} acronyms={state.acronyms} />)}
              {!col.items.length && <p className="px-3 py-6 text-center text-[13px] text-muted">No cases</p>}
            </div>
            {col.hint && <p className="mt-2 px-2 text-[11.5px] text-muted">{col.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BoardPage() {
  return (
    <Suspense fallback={null}>
      <BoardInner />
    </Suspense>
  );
}
