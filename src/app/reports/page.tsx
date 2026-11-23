"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, Users, GraduationCap, Route } from "lucide-react";
import { useStore } from "@/lib/store";
import { routeFail, FAIL_REASON_LABEL } from "@/lib/routing";
import { isoWeekOf, fmtDate } from "@/lib/dates";
import type { CaseRecord } from "@/lib/types";
import { Avatar, Button, Card, CardHeader, Empty, KpiCard, PageTitle, Pill, cn } from "@/components/ui";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const HEAD = ["Case", "Reviewer", "Reviewer ID", "Segment", "App", "Function", "Fail reason", "Fails 12m", "Closed", "Routing rule"];

export default function ReportsPage() {
  const { state } = useStore();
  const fails = useMemo(
    () => state.cases.filter((c) => c.outcome === "fail" && c.closedAt).map((c) => ({ c, r: routeFail(c, state.cases)! })).sort((a, b) => b.c.closedAt!.localeCompare(a.c.closedAt!)),
    [state.cases],
  );
  const weeks = Array.from(new Set(fails.map(({ c }) => isoWeekOf(c.closedAt!).week))).sort((a, b) => b - a);
  const months = Array.from(new Set(fails.map(({ c }) => c.closedAt!.slice(0, 7)))).sort().reverse();
  const [week, setWeek] = useState<number>(weeks[0] ?? 48);
  const [month, setMonth] = useState<string>(months[0] ?? "2026-11");

  const hrRows = fails.filter(({ c, r }) => r.hr && isoWeekOf(c.closedAt!).week === week);
  const lmsRows = fails.filter(({ c, r }) => r.training && c.closedAt!.startsWith(month));
  const row = ({ c, r }: { c: CaseRecord; r: NonNullable<ReturnType<typeof routeFail>> }) => [c.id, c.reviewer.name, c.reviewer.id, c.segment, c.app, c.func, FAIL_REASON_LABEL[c.failReason!], r.fails12m, c.closedAt!, r.rule];
  const monthLabel = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle title="HR & Training Reports" sub="Phase 3 routing is applied automatically to every FAIL: no action → training + HR · 3rd fail in 12 months → HR · otherwise → remedial training." />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Fails routed (all time)" value={fails.length} sub={<>{fails.filter((f) => f.r.needsConfirmation).length} revoked-access fails pending routing confirmation</>} />
        <KpiCard label={`HR report · week ${week}`} value={hrRows.length} delta="weekly" deltaTone="bad" sub="Accountability Framework" />
        <KpiCard label={`LMS training · ${monthLabel(month)}`} value={lmsRows.length} delta="monthly" deltaTone="violet" sub="Remedial training enrolment" />
      </div>

      <div data-tour="reports-cards" className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ReportCard
          icon={<Users className="size-4 text-bad" />}
          title="Weekly HR report"
          sub="Fails due to no action, plus repeat (3×) offenders"
          picker={<select value={week} onChange={(e) => setWeek(+e.target.value)} className="h-9 rounded-xl border border-line-strong bg-surface px-2 text-[13px]">{weeks.map((w) => <option key={w} value={w}>Week {w}</option>)}</select>}
          rows={hrRows}
          onExport={() => downloadCsv(`ERQA_HR_report_W${week}.csv`, [HEAD, ...hrRows.map(row)])}
        />
        <ReportCard
          icon={<GraduationCap className="size-4 text-violet" />}
          title="Monthly LMS training report"
          sub="Reviewers to enrol in remedial training"
          picker={<select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-xl border border-line-strong bg-surface px-2 text-[13px]">{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select>}
          rows={lmsRows}
          onExport={() => downloadCsv(`ERQA_LMS_training_${month}.csv`, [HEAD, ...lmsRows.map(row)])}
        />
      </div>

      <Card data-tour="reports-log" className="mt-4">
        <CardHeader title={<span className="flex items-center gap-2"><Route className="size-4 text-accent" />Routing log</span>} sub="Every routing decision with the rule that triggered it, for audit" action={<Button icon={Download} onClick={() => downloadCsv("ERQA_routing_log.csv", [HEAD, ...fails.map(row)])}>Export</Button>} />
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead><tr className="border-y border-line text-[12px] text-muted"><th className="px-5 py-2.5 font-medium">Case</th><th className="px-3 font-medium">Reviewer</th><th className="px-3 font-medium">Fail reason</th><th className="px-3 font-medium">Fails 12m</th><th className="px-3 font-medium">Training</th><th className="px-3 font-medium">HR</th><th className="px-3 font-medium">Rule applied</th><th className="px-3 font-medium">Closed</th></tr></thead>
            <tbody>
              {fails.slice(0, 40).map(({ c, r }) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-2.5"><Link href={`/cases/${c.id}`} className="font-medium hover:text-accent">{c.id}</Link></td>
                  <td className="px-3">{c.reviewer.name}</td>
                  <td className="px-3">{FAIL_REASON_LABEL[c.failReason!]}</td>
                  <td className={cn("tabular px-3", r.repeat && "font-semibold text-bad")}>{r.fails12m}</td>
                  <td className="px-3">{r.training ? <Pill tone="violet">Yes</Pill> : "—"}</td>
                  <td className="px-3">{r.hr ? <Pill tone="bad">Yes</Pill> : "—"}</td>
                  <td className="px-3 text-muted">{r.rule}{r.needsConfirmation && " ⚠"}</td>
                  <td className="px-3 text-muted">{fmtDate(c.closedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function ReportCard({ icon, title, sub, picker, rows, onExport }: { icon: React.ReactNode; title: string; sub: string; picker: React.ReactNode; rows: { c: CaseRecord; r: NonNullable<ReturnType<typeof routeFail>> }[]; onExport: () => void }) {
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2">{icon}{title}</span>} sub={sub} action={<div className="flex gap-2">{picker}<Button icon={Download} disabled={!rows.length} onClick={onExport}>CSV</Button></div>} />
      <div className="px-3 pb-3">
        {rows.map(({ c, r }) => (
          <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-subtle">
            <Avatar name={c.reviewer.name} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium">{c.reviewer.name}</div>
              <div className="truncate text-[12.5px] text-muted">{c.id} · {c.app} · {FAIL_REASON_LABEL[c.failReason!]}</div>
            </div>
            {r.repeat && <Pill tone="bad">{r.fails12m}× in 12 mo</Pill>}
          </Link>
        ))}
        {!rows.length && <div className="p-3"><Empty title="No cases for this period" /></div>}
      </div>
    </Card>
  );
}
