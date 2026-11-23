"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Wand2, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { assess } from "@/lib/rules";
import { Avatar, Button, Card, Empty, OutcomePill, PageTitle, Pill, SlaPill, VerdictPill, cn } from "@/components/ui";

type VerdictFilter = "all" | "hard_stop" | "review" | "clear";

function QueueInner() {
  const { state, dispatch } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const verdict = (params.get("verdict") as VerdictFilter) || "all";
  const stage = params.get("stage") || "to_assess";
  const newWeek = Number(params.get("new")) || null;
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [flash, setFlash] = useState<string | null>(null);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    p.set(k, v);
    router.replace(`/queue?${p.toString()}`);
  };

  const rows = useMemo(() => {
    const ql = q.toLowerCase();
    return state.cases
      .filter((c) => (stage === "all" ? true : c.stage === stage))
      .map((c) => ({ c, a: assess(c, state.acronyms) }))
      .filter(({ a }) => verdict === "all" || a.verdict === verdict)
      .filter(({ c }) => !ql || [c.id, c.reviewer.name, c.worker.name, c.app, c.func, c.segment].some((s) => s.toLowerCase().includes(ql)))
      .sort((x, y) => Number(y.c.week === newWeek) - Number(x.c.week === newWeek) || y.c.week - x.c.week || ["hard_stop", "review", "clear"].indexOf(x.a.verdict) - ["hard_stop", "review", "clear"].indexOf(y.a.verdict));
  }, [state.cases, state.acronyms, stage, verdict, q, newWeek]);

  const counts = useMemo(() => {
    const base = state.cases.filter((c) => (stage === "all" ? true : c.stage === stage)).map((c) => assess(c, state.acronyms).verdict);
    return { all: base.length, hard_stop: base.filter((v) => v === "hard_stop").length, review: base.filter((v) => v === "review").length, clear: base.filter((v) => v === "clear").length };
  }, [state.cases, state.acronyms, stage]);

  const selectable = rows.filter(({ c }) => c.stage === "to_assess");
  const selected = selectable.filter(({ c }) => sel.has(c.id));
  const toChallenge = selected.filter(({ a }) => a.verdict === "hard_stop");
  const toPass = selected.filter(({ a }) => a.verdict === "clear");
  const skipped = selected.filter(({ a }) => a.verdict === "review");

  const apply = () => {
    toChallenge.forEach(({ c, a }) => dispatch({ type: "challenge", id: c.id, rules: Array.from(new Set(a.hardStops.map((h) => h.rule))) }));
    toPass.forEach(({ c }) => dispatch({ type: "pass", id: c.id, note: "Pre-screen clear – confirmed by analyst (bulk)" }));
    setFlash(`${toChallenge.length} challenge email${toChallenge.length === 1 ? "" : "s"} drafted in the Outbox · ${toPass.length} closed as PASS · ${skipped.length} left for judgment`);
    setSel(new Set());
  };

  const tabs: { k: VerdictFilter; label: string }[] = [
    { k: "all", label: "All" },
    { k: "hard_stop", label: "Hard stop" },
    { k: "review", label: "Needs judgment" },
    { k: "clear", label: "Looks clear" },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle
        title="Assessment Queue"
        sub="Every sampled justification is pre-screened against the ERQA ruleset. You decide; the system explains why."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="flex h-10 w-full max-w-[300px] items-center gap-2 rounded-xl border border-line-strong bg-surface px-3">
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case, reviewer, app…" className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint" />
        </div>
        <div data-tour="queue-tabs" className="scroll-thin flex max-w-full overflow-x-auto rounded-xl border border-line-strong bg-surface p-1">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setParam("verdict", t.k)} className={cn("rounded-lg px-3 py-1.5 text-[13px]", verdict === t.k ? "bg-subtle font-medium text-ink" : "text-muted hover:text-ink")}>
              {t.label} <span className="tabular ml-1 text-faint">{counts[t.k]}</span>
            </button>
          ))}
        </div>
        <select value={stage} onChange={(e) => setParam("stage", e.target.value)} className="h-10 rounded-xl border border-line-strong bg-surface px-3 text-[13.5px]">
          <option value="to_assess">To assess</option>
          <option value="challenged">Challenged</option>
          <option value="escalated">Escalated</option>
          <option value="closed">Closed</option>
          <option value="all">All stages</option>
        </select>
        <div data-tour="queue-apply" className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {selected.length > 0 && (
            <span className="text-[13px] text-muted">
              {selected.length} selected: <b className="text-bad">{toChallenge.length}</b> challenge · <b className="text-ok">{toPass.length}</b> pass · {skipped.length} skip
            </span>
          )}
          <Button variant="primary" icon={Wand2} disabled={!selected.length} onClick={apply}>Apply suggestions</Button>
        </div>
      </div>

      {newWeek && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#c9d6ff] bg-info-soft px-4 py-2.5 text-[13.5px] text-info">
          <span><b>{state.cases.filter((c) => c.week === newWeek && c.stage === "to_assess").length} new cases</b> from the week {newWeek} intake are ready to assess. They&apos;re pre-screened and shown at the top.</span>
          <button onClick={() => { const p = new URLSearchParams(params.toString()); p.delete("new"); router.replace(`/queue?${p.toString()}`); }} className="font-medium">Dismiss</button>
        </div>
      )}

      {flash && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[#c9d6ff] bg-info-soft px-4 py-2.5 text-[13.5px] text-info">
          {flash}
          <span className="flex gap-3"><Link href="/outbox" className="font-medium underline">Open Outbox</Link><button onClick={() => setFlash(null)}>Dismiss</button></span>
        </div>
      )}

      <Card data-tour="queue-table" className="overflow-hidden">
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[980px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={selectable.length > 0 && selectable.every(({ c }) => sel.has(c.id))}
                    onChange={(e) => setSel(e.target.checked ? new Set(selectable.map(({ c }) => c.id)) : new Set())}
                  />
                </th>
                <th className="px-3 py-3 font-medium">Case</th>
                <th className="px-3 py-3 font-medium">Access</th>
                <th className="px-3 py-3 font-medium">Reviewer</th>
                <th className="px-3 py-3 font-medium">Pre-screen</th>
                <th className="px-3 py-3 font-medium">Rules triggered</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, a }) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-subtle/60">
                  <td className="px-4 py-3">
                    {c.stage === "to_assess" && (
                      <input type="checkbox" aria-label={`Select ${c.id}`} checked={sel.has(c.id)} onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(c.id); else n.delete(c.id); setSel(n); }} />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/cases/${c.id}`} className="font-medium hover:text-accent">{c.id}</Link>
                    {c.week === newWeek && <Pill tone="info" className="ml-2">New</Pill>}
                    <div className="text-[12px] text-muted">W{c.week} · {c.reviewType}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-medium">{c.app}</div>
                    <div className="font-mono text-[11.5px] text-muted">{c.func}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2"><Avatar name={c.reviewer.name} size={24} /><span>{c.reviewer.name}</span></div>
                    <div className="mt-0.5 pl-8 text-[12px] text-muted">{c.segment}</div>
                  </td>
                  <td className="px-3 py-3"><VerdictPill verdict={a.verdict} /></td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {a.hardStops.map((f, i) => (
                        <span key={i} title={f.evidence} className={cn("rounded-md px-1.5 py-0.5 font-mono text-[11.5px]", f.category === "hard_stop" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn")}>{f.rule}</span>
                      ))}
                      {!a.hardStops.length && a.negotiables.length > 0 && <span className="text-[12px] text-muted">Analyst judgment</span>}
                      {!a.hardStops.length && !a.negotiables.length && <span className="text-[12px] text-faint">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    {c.stage === "closed" ? <OutcomePill c={c} /> : c.stage === "to_assess" ? <Pill>To assess</Pill> : <SlaPill c={c} />}
                  </td>
                  <td className="pr-4"><Link href={`/cases/${c.id}`} aria-label={`Open ${c.id}`}><ChevronRight className="size-4 text-faint" /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <div className="p-6"><Empty title="Nothing here" sub="No cases match these filters." /></div>}
      </Card>
    </div>
  );
}

export default function QueuePage() {
  return (
    <Suspense fallback={null}>
      <QueueInner />
    </Suspense>
  );
}
