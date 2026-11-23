"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, Sparkles, SquareKanban, ListChecks, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { computeInsights } from "@/lib/insights";
import { isoWeekStart, addDays, fmtShort } from "@/lib/dates";
import { RULE_BY_ID } from "@/lib/rules";
import { Avatar, Button, Card, CardHeader, Dot, KpiCard, PageTitle, Pill } from "@/components/ui";

const pct = (n: number) => `${n.toFixed(1)}%`;

export default function Overview() {
  const { state } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const ins = useMemo(() => computeInsights(state.cases), [state.cases]);
  const wk = ins.lastWeek;
  const monday = isoWeekStart(2026, wk);
  const maxWeek = Math.max(...ins.weekly.map((w) => w.total), 1);
  const failDelta = ins.failRate - ins.failRatePrior;
  const chalDelta = ins.challengeRate - ins.challengeRatePrior;
  const newThisWeek = state.cases.filter((c) => c.week === wk).length;

  const insights: { tone: "bad" | "warn" | "info" | "ok"; text: string; href?: string }[] = [];
  if (ins.overdue) insights.push({ tone: "bad", text: `${ins.overdue} challenge/escalation response${ins.overdue > 1 ? "s are" : " is"} overdue. Escalate or close today to stay within policy.`, href: "/board?view=overdue" });
  if (ins.topRules[0]) insights.push({ tone: "info", text: `"${ins.topRules[0].title}" (${ins.topRules[0].id}) drives ${ins.topRules[0].share.toFixed(0)}% of challenges. A targeted manager reminder could cut volume at the source.` });
  if (ins.repeat[0]) insights.push({ tone: "warn", text: `${ins.repeat.length} reviewer${ins.repeat.length > 1 ? "s have" : " has"} 2+ fails in 12 months. ${ins.repeat.filter((r) => r.fails >= 3).length} already meet the 3× HR rule.`, href: "#repeat" });
  if (ins.hotspots[0]) insights.push({ tone: "warn", text: `${ins.hotspots[0].app} has the highest fail rate (${ins.hotspots[0].failRate.toFixed(0)}% of ${ins.hotspots[0].total} closed cases).` });
  insights.push({ tone: failDelta <= 0 ? "ok" : "bad", text: `Fail rate is ${pct(ins.failRate)} over the last 8 weeks vs ${pct(ins.failRatePrior)} before, shown next to a challenge rate of ${pct(ins.challengeRate)} so a quality gain isn't confused with lighter QA.` });

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle
        title="Overview"
        sub={<>Week {wk} · {fmtShort(monday)} – {fmtShort(addDays(monday, 6))}, 2026 · {newThisWeek} cases sampled by MSaaS</>}
        action={
          <div className="flex gap-2">
            <Link href="/queue"><Button icon={ListChecks}>Assess queue</Button></Link>
            <Link href="/board"><Button variant="primary" icon={SquareKanban}>Challenge board</Button></Link>
          </div>
        }
      />

      <div data-tour="kpis" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Cases to assess" value={ins.toAssess} delta={`+${newThisWeek} this week`} deltaTone="info" sub={<><b className="text-ink">{ins.challenged + ins.escalated}</b> in challenge loop</>} href="/queue" />
        <KpiCard label="Responses at risk" value={ins.overdue + ins.dueSoon} delta={`${ins.overdue} overdue`} deltaTone={ins.overdue ? "bad" : "ok"} sub={<><b className="text-ink">{ins.dueSoon}</b> due within 2 days</>} href="/board" />
        <KpiCard label="Challenge rate (8 wks)" value={pct(ins.challengeRate)} delta={`${chalDelta >= 0 ? "+" : ""}${chalDelta.toFixed(1)} pts`} deltaTone="neutral" sub={<><b className="text-ink">{pct(ins.challengeRatePrior)}</b> prior 8 weeks</>} />
        <KpiCard label="Fail rate (8 wks)" value={pct(ins.failRate)} delta={`${failDelta >= 0 ? "+" : ""}${failDelta.toFixed(1)} pts`} deltaTone={failDelta <= 0 ? "ok" : "bad"} sub={<><b className="text-ink">{pct(ins.failRatePrior)}</b> prior 8 weeks</>} href="/reports" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/queue?q=${encodeURIComponent(q)}&stage=all`);
          }}
          className="flex h-10 w-full max-w-[320px] items-center gap-2 rounded-xl border border-line-strong bg-surface px-3"
        >
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case, reviewer or app…" className="w-full bg-transparent text-[14px] outline-none placeholder:text-faint" />
        </form>
        <div className="ml-auto flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 py-2 text-[13.5px] text-ink-2">
          <Sparkles className="size-4 text-violet" /> Insights refresh automatically from case data
        </div>
      </div>

      {/* Pipeline strip */}
      <div data-tour="pipeline" className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "To assess", n: ins.toAssess, color: "#3f3f46", href: "/queue" },
          { label: "Challenged", n: ins.challenged, color: "#2f62f5", href: "/board" },
          { label: "Escalated", n: ins.escalated, color: "#e8890c", href: "/board" },
          { label: "Fails (all time, synthetic)", n: ins.totalFails, color: "#c2262e", href: "/reports" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="group flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 hover:border-line-strong">
            <span className="flex items-center gap-2 text-[14px]"><Dot color={s.color} />{s.label}</span>
            <span className="flex items-center gap-2"><span className="tabular text-[18px] font-semibold">{s.n}</span><ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card data-tour="weekly" className="xl:col-span-2">
          <CardHeader
            title="Weekly outcomes"
            sub="Cases per weekly sample, by result"
            action={
              <div className="flex gap-3 text-[12.5px] text-muted">
                <span className="flex items-center gap-1.5"><Dot color="#22a05b" />Pass</span>
                <span className="flex items-center gap-1.5"><Dot color="#d9454c" />Fail</span>
                <span className="flex items-center gap-1.5"><Dot color="#b8b8c0" />Exclusion</span>
                <span className="flex items-center gap-1.5"><Dot color="#9db5ff" />Open</span>
              </div>
            }
          />
          <div className="flex h-[230px] items-end gap-2 px-5 pb-2">
            {ins.weekly.map((w) => (
              <div key={w.week} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="tabular text-[11px] text-muted opacity-0 transition-opacity group-hover:opacity-100">{w.total}</span>
                <div className="flex w-full max-w-[38px] flex-col-reverse overflow-hidden rounded-lg" style={{ height: `${(w.total / maxWeek) * 180}px` }} title={`W${w.week}: ${w.pass} pass · ${w.fail} fail · ${w.exclusion} excl · ${w.open} open`}>
                  <div style={{ flex: w.pass, background: "#22a05b" }} />
                  <div style={{ flex: w.fail, background: "#d9454c" }} />
                  <div style={{ flex: w.exclusion, background: "#b8b8c0" }} />
                  <div style={{ flex: w.open, background: "#9db5ff" }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-line px-5 py-2.5">
            {ins.weekly.map((w) => <span key={w.week} className="tabular flex-1 text-center text-[11px] text-muted">W{w.week}</span>)}
          </div>
        </Card>

        <Card data-tour="insights">
          <CardHeader title={<span className="flex items-center gap-2"><Sparkles className="size-4 text-violet" />Insights</span>} sub="Generated from the case data. Rule-based, no AI." />
          <ul className="space-y-2.5 px-5 pb-5">
            {insights.map((i, k) => (
              <li key={k} className="flex gap-2.5 text-[13.5px] leading-snug">
                <span className="mt-1.5"><Dot color={{ bad: "#c2262e", warn: "#e8890c", info: "#2f62f5", ok: "#15803d" }[i.tone]} /></span>
                <span className="text-ink-2">
                  {i.text} {i.href && <Link href={i.href} className="font-medium text-accent">View →</Link>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card data-tour="why">
          <CardHeader title="Why justifications get challenged" sub="Ruleset hard stops on challenged cases" />
          <div className="space-y-3 px-5 pb-5">
            {ins.topRules.slice(0, 7).map((r) => (
              <div key={r.id}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span><span className="font-mono text-[12px] text-muted">{r.id}</span> · {r.title}</span>
                  <span className="tabular text-muted">{r.n}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-subtle">
                  <div className="h-full rounded-full" style={{ width: `${r.share}%`, background: RULE_BY_ID[r.id]?.category === "hard_stop" ? "#d9454c" : "#e8a33c" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Application hotspots" sub="Fail rate on closed cases" />
          <div className="px-2 pb-3">
            {ins.hotspots.slice(0, 6).map((h) => (
              <div key={h.app} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-subtle">
                <div>
                  <div className="text-[14px] font-medium">{h.app}</div>
                  <div className="text-[12.5px] text-muted">{h.total} closed · {h.challenged} challenged</div>
                </div>
                {h.failRate >= 20 ? <Pill tone="bad">{h.failRate.toFixed(0)}% fail</Pill> : h.failRate >= 10 ? <span className="tabular text-[12.5px] text-muted">{h.failRate.toFixed(0)}% fail</span> : <Pill tone="ok">{h.failRate.toFixed(0)}% fail</Pill>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div id="repeat" />
          <CardHeader title="Repeat reviewers" sub="2+ fails in the last 12 months" />
          <div className="px-2 pb-3">
            {ins.repeat.slice(0, 6).map((r) => (
              <div key={r.reviewer.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-subtle">
                <Avatar name={r.reviewer.name} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium">{r.reviewer.name}</div>
                  <div className="text-[12.5px] text-muted">{r.segment} · {r.cases} sampled</div>
                </div>
                {r.fails >= 3 ? <Pill tone="bad">{r.fails} fails · HR rule</Pill> : <span className="tabular text-[12.5px] text-muted">{r.fails} fails</span>}
              </div>
            ))}
            {!ins.repeat.length && <p className="px-3 py-4 text-[13px] text-muted">No repeat reviewers.</p>}
          </div>
          <div className="mx-5 mb-5 grid grid-cols-3 gap-2 rounded-xl bg-subtle p-3 text-center">
            <div><div className="tabular text-[17px] font-semibold">{ins.failReasons.no_action}</div><div className="text-[11.5px] text-muted">No action</div></div>
            <div><div className="tabular text-[17px] font-semibold">{ins.failReasons.insufficient}</div><div className="text-[11.5px] text-muted">Insufficient</div></div>
            <div><div className="tabular text-[17px] font-semibold">{ins.failReasons.revoked}</div><div className="text-[11.5px] text-muted">Revoked</div></div>
          </div>
        </Card>
      </div>
      <p className="mt-6 text-center text-[12px] text-faint">Avg. days from challenge to fixed justification: {ins.avgResponse.toFixed(1)} · All figures from synthetic data</p>
    </div>
  );
}
