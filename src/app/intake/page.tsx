"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Database, Wand2, X, Upload, History, FileInput, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store";
import { generateRawDrop, runIntake, type IntakeResult, type RawRow } from "@/lib/intake";
import { ANALYSTS } from "@/lib/seed";
import { assess } from "@/lib/rules";
import { fmtDate, isoWeekStart } from "@/lib/dates";
import { Button, Card, CardHeader, PageTitle, Pill, VerdictPill, cn } from "@/components/ui";

const ISSUE_TONE = { duplicate: "bad", placeholder: "neutral", country: "info", date: "neutral", html: "violet", missing: "neutral" } as const;
const KNOWN_COUNTRIES = ["United States", "Mexico", "India", "United Kingdom", "Brazil", "Singapore", "Poland", "Philippines"];

export default function IntakePage() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const nextWeek = Math.max(...state.imports.map((i) => i.week)) + 1;
  const [raw, setRaw] = useState<RawRow[] | null>(null);
  const [result, setResult] = useState<IntakeResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useMemo(() => [...state.imports].sort((a, b) => b.week - a.week), [state.imports]);
  const last = history[0];
  const current = !raw ? 1 : !result ? 2 : 3;
  const cleanedById = useMemo(() => new Map((result?.cases ?? []).map((c) => [c.signoffId, c])), [result]);

  const load = () => { setRaw(generateRawDrop(state.cases, nextWeek)); setResult(null); };
  const process = () => raw && setResult(runIntake(raw, nextWeek, state.cases, ANALYSTS));
  const cancel = () => { setRaw(null); setResult(null); };
  const commit = () => {
    if (!result) return;
    dispatch({ type: "import", run: result.run, cases: result.cases });
    setRaw(null);
    setResult(null);
    router.push(`/queue?new=${result.run.week}&stage=to_assess&verdict=all`);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle
        title="Weekly Intake"
        sub="The MSaaS weekly sample is cleaned and loaded automatically, with no MS Access or manual upload."
        action={
          <div className="flex flex-wrap gap-2">
            <Button icon={History} onClick={() => setHistoryOpen(true)}>Import history</Button>
            <Button data-tour="intake-import" variant="primary" icon={Upload} disabled={!!raw} onClick={load}>Import weekly sample</Button>
          </div>
        }
      />

      {/* Step indicator */}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px]">
        {[
          { k: 1, label: "Import" },
          { k: 2, label: "Clean & validate" },
          { k: 3, label: "Create cases" },
        ].map((s, i) => (
          <span key={s.k} className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1", s.k < current ? "border-ink bg-ink text-white" : s.k === current ? "border-accent bg-accent-soft text-accent" : "border-line-strong bg-surface text-muted")}>
              <span className="tabular font-semibold">{s.k}</span>{s.label}
            </span>
            {i < 2 && <span className="h-px w-5 bg-line-strong" />}
          </span>
        ))}
      </div>

      {/* Validation summary (full width, above the table) */}
      {result && (
        <Card className="mb-4">
          <CardHeader title="Validation report" sub={`${result.run.rawRows} rows in → ${result.run.casesCreated} clean cases, each pre-screened`} />
          <div className="grid grid-cols-2 gap-2 px-5 pb-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Duplicates removed", result.run.duplicatesRemoved],
              ["Placeholders cleaned", result.run.placeholdersCleaned],
              ["Countries normalised", result.run.countriesNormalized],
              ["Dates parsed", result.run.datesParsed],
              ["HTML stripped", result.run.htmlStripped],
              ["Cases created", result.run.casesCreated],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-xl bg-subtle px-3 py-2.5">
                <div className="tabular text-[20px] font-semibold">{v}</div>
                <div className="truncate text-[12px] text-muted">{k}</div>
              </div>
            ))}
          </div>
          <details className="group border-t border-line">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-[13.5px] font-medium">
              <ChevronDown className="size-4 text-muted transition-transform group-open:rotate-180" />
              {result.issues.length} fixes and flags, row by row
            </summary>
            <div className="scroll-thin grid max-h-[260px] grid-cols-1 gap-x-6 overflow-y-auto px-5 pb-4 md:grid-cols-2">
              {result.issues.map((i, k) => (
                <div key={k} className="flex min-w-0 items-start gap-2 py-1.5 text-[12.5px]">
                  <Pill tone={ISSUE_TONE[i.type]} className="w-[84px] justify-center">{i.type}</Pill>
                  <span className="min-w-0 text-ink-2">Row {i.row}: {i.detail}</span>
                </div>
              ))}
            </div>
          </details>
        </Card>
      )}

      <Card data-tour="intake-drop" className="min-w-0 overflow-hidden">
        <CardHeader
          title={raw ? `Raw extract · week ${nextWeek}` : "Next weekly drop"}
          sub={
            raw
              ? result
                ? "Cleaned. Green cells show the corrected value; review, then create the cases."
                : `${raw.length} rows as received (synthetic). Highlighted cells need cleaning.`
              : `Week ${nextWeek} sample expected ${fmtDate(isoWeekStart(2026, nextWeek))}.`
          }
          action={
            raw && (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" icon={X} onClick={cancel}>Cancel</Button>
                {!result ? (
                  <Button variant="primary" icon={Wand2} onClick={process}>Clean & validate</Button>
                ) : (
                  <Button variant="primary" icon={Database} onClick={commit}>Create {result.cases.length} cases</Button>
                )}
              </div>
            )
          }
        />
        {raw && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line bg-subtle/50 px-5 py-2.5 text-[12.5px] text-ink-2">
            <span className="font-medium text-muted">Legend</span>
            {!result ? (
              <span className="flex items-center gap-2"><span className="inline-block h-3.5 w-6 rounded bg-[#fff4e5] ring-1 ring-[#f5dcae]" />Needs cleaning (wrong format, placeholder or empty)</span>
            ) : (
              <>
                <span className="flex items-center gap-2"><span className="inline-block h-3.5 w-6 rounded bg-ok-soft ring-1 ring-[#bfe8cf]" />Fixed: new value shown, original crossed out below</span>
                <span className="flex items-center gap-2"><span className="inline-block h-3.5 w-6 rounded bg-subtle ring-1 ring-line-strong" />Missing in source, can&apos;t be fixed (flagged to data owner)</span>
              </>
            )}
            <span className="flex items-center gap-2"><span className="inline-block h-3.5 w-6 rounded bg-bad-soft ring-1 ring-[#f3c9cb]" /><span className="line-through decoration-bad/60">Duplicate row</span> (removed)</span>
            <span className="flex items-center gap-2"><span className="text-muted">Pre-screen:</span><VerdictPill verdict="hard_stop" /><VerdictPill verdict="clear" /><span className="text-muted">Judgment = analyst decides</span></span>
          </div>
        )}
        {raw ? (
          <div className="scroll-thin max-h-[560px] overflow-auto border-t border-line">
            <table className="w-full min-w-[1080px] text-left text-[12.5px]">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="border-b border-line text-muted">
                  {["Signoff ID", "EERS Reviewer", "App Name", "SOA Country", "Date of EERS Review", "Review Type", "IAM Revocation", "Entitlement", "Pre-screen"].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {raw.map((r, i) => {
                  const dup = raw.findIndex((x) => x["Signoff ID"] === r["Signoff ID"]) !== i;
                  const bad = (k: string) => {
                    const v = r[k] ?? "";
                    if (k === "SOA Country") return !KNOWN_COUNTRIES.includes(v);
                    if (k === "Date of EERS Review") return !/^\d{4}-\d{2}-\d{2}$/.test(v);
                    if (k === "Entitlement") return /<[^>]+>/.test(v);
                    return v === "- Select -" || v === "";
                  };
                  const c = result && !dup ? cleanedById.get(r["Signoff ID"]) : undefined;
                  // value after cleaning (only for fixable fields)
                  const after = (k: string): string | null => {
                    if (!c) return null;
                    if (k === "SOA Country") return c.country;
                    if (k === "Date of EERS Review") return fmtDate(c.reviewDate);
                    if (k === "IAM Revocation") return "(blank)";
                    if (k === "Entitlement") return c.entitlement;
                    return null; // Review Type: cannot be invented
                  };
                  const cell = (k: string, extra = "") => {
                    const raw0 = r[k] ?? "";
                    const isBad = bad(k);
                    if (dup || !isBad) return <td key={k} className={cn("px-3 py-2.5", extra)}>{raw0 || <i>empty</i>}</td>;
                    if (!result) return <td key={k} className={cn("bg-[#fff4e5] px-3 py-2.5 text-[#9a4a06]", extra)}>{raw0 || <i>empty</i>}</td>;
                    const fixedVal = after(k);
                    if (fixedVal === null)
                      return <td key={k} className={cn("bg-subtle px-3 py-2.5 text-muted", extra)}><i>missing</i><div className="text-[11px]">flagged</div></td>;
                    return (
                      <td key={k} className={cn("bg-ok-soft/60 px-3 py-2.5 text-ok", extra)} title={`Was: ${raw0 || "empty"}`}>
                        <div className="font-medium">{fixedVal}</div>
                        <div className="truncate text-[11px] text-muted line-through">{raw0 || "empty"}</div>
                      </td>
                    );
                  };
                  const v = assess({ justRole: r.JUST_ROLE, justProcess: r.JUST_PROCESS, justComm: r.JUST_COMM }, state.acronyms).verdict;
                  return (
                    <tr key={i} className={cn("border-b border-line last:border-0", dup && "bg-bad-soft/50 text-muted line-through decoration-bad/50")}>
                      <td className="px-3 py-2.5 font-mono whitespace-nowrap">{r["Signoff ID"]}{dup && <Pill tone="bad" className="ml-1.5 no-underline">duplicate</Pill>}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r["EERS Reviewer"]}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{r["App Name"]}</td>
                      {["SOA Country", "Date of EERS Review", "Review Type", "IAM Revocation"].map((k) => cell(k, "whitespace-nowrap"))}
                      {cell("Entitlement", "max-w-[260px] truncate")}
                      <td className="px-3 py-2.5 whitespace-nowrap">{v === "review" ? <span className="text-[12px] text-muted">Judgment</span> : <VerdictPill verdict={v} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 border-t border-line px-6 py-14 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-subtle"><FileInput className="size-6 text-muted" /></span>
            <p className="text-[15px] font-medium">Waiting for the next MSaaS extract</p>
            <p className="max-w-md text-[13px] text-muted">In production the drop is picked up automatically. Here you can import a realistic, messy synthetic extract to see the pipeline clean it.</p>
            <Button variant="primary" icon={Upload} onClick={load} className="mt-1">Import weekly sample</Button>
            {last && <p className="text-[12.5px] text-muted">Last import: week {last.week} · {last.casesCreated} cases · {fmtDate(last.at)}</p>}
          </div>
        )}
      </Card>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} history={history} />
    </div>
  );
}

function HistoryDrawer({ open, onClose, history }: { open: boolean; onClose: () => void; history: ReturnType<typeof useStore>["state"]["imports"] }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[rgba(18,18,24,0.35)]" onClick={onClose} />
      <aside className="absolute top-0 right-0 flex h-full w-full max-w-[440px] flex-col border-l border-line bg-surface shadow-2xl" role="dialog" aria-label="Import history">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold">Import history</h2>
            <p className="text-[12.5px] text-muted">Every weekly run is logged for audit</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-subtle" aria-label="Close"><X className="size-5" /></button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto p-3">
          {history.map((h) => (
            <div key={h.id} className="rounded-xl px-3 py-3 hover:bg-subtle">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-subtle"><FileText className="size-4 text-muted" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium">Week {h.week} sample</div>
                  <div className="text-[12px] text-muted">{fmtDate(h.at)}</div>
                </div>
                <Pill tone="ok">{h.casesCreated} cases</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-12 text-[12px] text-muted">
                <span>{h.rawRows} rows in</span><span>{h.duplicatesRemoved} duplicates</span><span>{h.countriesNormalized} countries fixed</span><span>{h.htmlStripped} HTML stripped</span>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
