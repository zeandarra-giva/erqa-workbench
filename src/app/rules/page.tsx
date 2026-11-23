"use client";

import { useMemo, useState } from "react";
import { Plus, X, FlaskConical, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { RULES, STEPS, DEFAULT_ACRONYMS, assess } from "@/lib/rules";
import { backtest } from "@/lib/insights";
import { Button, Card, CardHeader, KpiCard, PageTitle, Pill, VerdictPill, cn } from "@/components/ui";

const CAT = { hard_stop: { label: "Hard stop", tone: "bad" }, negotiable: { label: "Negotiable", tone: "warn" }, acceptable: { label: "Acceptable", tone: "ok" } } as const;
const AUTO = { high: { label: "Automated · high confidence", tone: "ok" }, medium: { label: "Automated · medium confidence", tone: "info" }, human: { label: "Analyst judgment", tone: "neutral" } } as const;

export default function RulesPage() {
  const { state, dispatch } = useStore();
  const [acr, setAcr] = useState("");
  const [tryText, setTryText] = useState({ justRole: "SSU", justProcess: "Needed for daily work", justComm: "Small team" });
  const bt = useMemo(() => backtest(state.cases, state.acronyms), [state.cases, state.acronyms]);
  const tryA = useMemo(() => assess(tryText, state.acronyms), [tryText, state.acronyms]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle title="Ruleset & Back-test" sub="The ERQA challenge ruleset as transparent checks. Every flag shows which rule fired and why, so it can be explained in an audit." />

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#f3d9a7] bg-warn-soft px-4 py-3 text-[13px] text-warn">
        <Info className="mt-0.5 size-4 shrink-0" />
        <span>Source: the &quot;Rule Set&quot; document (pages 4–9 seen; it appears to be exported from a Stylus chat). Its official status still needs to be confirmed with ERQA. Pages 1–3 have not been reviewed.</span>
      </div>

      <div data-tour="rules-backtest" className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Agreement with past decisions" value={`${bt.agreement.toFixed(0)}%`} sub={<>{bt.n} historical cases (synthetic)</>} />
        <KpiCard label="Challenges caught (recall)" value={`${bt.recall.toFixed(0)}%`} sub={<><b className="text-ink">{bt.tp}</b> of {bt.tp + bt.fn} analyst challenges flagged</>} />
        <KpiCard label="Flag precision" value={`${bt.precision.toFixed(0)}%`} sub={<><b className="text-ink">{bt.fp}</b> flags the analyst didn&apos;t challenge</>} />
        <KpiCard label="Left to judgment" value={bt.review} sub="Negotiable cases, by design" />
      </div>
      <p className="mt-2 mb-5 flex items-center gap-1.5 text-[12px] text-muted"><FlaskConical className="size-3.5" /> On real data, this back-test would use the historical <code className="font-mono">Challenge</code> column, and should only include cases closed after the ruleset took effect.</p>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader title="Decision matrix" sub="Checked in order: Step 0 → 4" />
          {STEPS.map((s) => (
            <div key={s.step} className="border-t border-line">
              <div className="bg-subtle/60 px-5 py-2 text-[12px] font-medium tracking-wide text-muted uppercase">Step {s.step} · {s.title}</div>
              {RULES.filter((r) => r.step === s.step).map((r) => (
                <div key={r.id} className="grid grid-cols-[48px_1fr] gap-3 border-t border-line px-5 py-3 first:border-0 md:grid-cols-[48px_1fr_150px_210px]">
                  <span className="font-mono text-[13px] font-medium text-muted">{r.id}</span>
                  <div>
                    <div className="text-[14px] font-medium">{r.title}</div>
                    <div className="mt-0.5 text-[13px] text-ink-2">{r.condition}</div>
                    <div className="mt-0.5 text-[12.5px] text-muted">{r.reason}</div>
                  </div>
                  <div className="col-start-2 md:col-start-auto">{CAT[r.category].tone === "warn" ? <span className="text-[12.5px] font-medium text-muted">{CAT[r.category].label}</span> : <Pill tone={CAT[r.category].tone}>{CAT[r.category].label}</Pill>}</div>
                  <div className="col-start-2 md:col-start-auto"><Pill tone={AUTO[r.automation].tone}>{AUTO[r.automation].label}</Pill></div>
                </div>
              ))}
            </div>
          ))}
        </Card>

        <div className="space-y-4">
          <Card data-tour="rules-try">
            <CardHeader title="Try it" sub="Type a justification and watch the checks run" action={<VerdictPill verdict={tryA.verdict} />} />
            <div className="space-y-2.5 px-5 pb-4">
              {(["justRole", "justProcess", "justComm"] as const).map((k) => (
                <label key={k} className="block">
                  <span className="mb-1 block text-[12px] font-medium text-muted">{{ justRole: "Worker's role", justProcess: "Business process", justComm: "Reason for low commonality" }[k]}</span>
                  <textarea rows={2} value={tryText[k]} onChange={(e) => setTryText({ ...tryText, [k]: e.target.value })} className="w-full rounded-xl border border-line-strong px-3 py-2 text-[13.5px] outline-none focus:border-accent" />
                </label>
              ))}
              <div className="space-y-1.5 border-t border-dashed border-line pt-3">
                {tryA.findings.map((f, i) => (
                  <div key={i} className="flex gap-2 text-[12.5px]">
                    <span className={cn("rounded-md px-1.5 py-0.5 font-mono", f.category === "hard_stop" ? "bg-bad-soft text-bad" : f.category === "negotiable" ? "bg-subtle text-ink-2" : "bg-ok-soft text-ok")}>{f.rule}</span>
                    <span className="text-ink-2">{f.evidence}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Standard acronyms" sub="Policy B: accepted without explanation" action={<Button variant="ghost" onClick={() => dispatch({ type: "setAcronyms", acronyms: DEFAULT_ACRONYMS })}>Reset</Button>} />
            <div className="flex flex-wrap gap-1.5 px-5">
              {state.acronyms.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 rounded-lg border border-line bg-subtle px-2 py-1 font-mono text-[12px]">
                  {a}
                  <button aria-label={`Remove ${a}`} onClick={() => dispatch({ type: "setAcronyms", acronyms: state.acronyms.filter((x) => x !== a) })}><X className="size-3 text-muted" /></button>
                </span>
              ))}
            </div>
            <form
              className="flex gap-2 px-5 pt-3 pb-5"
              onSubmit={(e) => {
                e.preventDefault();
                const v = acr.trim().toUpperCase();
                if (v && !state.acronyms.includes(v)) dispatch({ type: "setAcronyms", acronyms: [...state.acronyms, v] });
                setAcr("");
              }}
            >
              <input value={acr} onChange={(e) => setAcr(e.target.value)} placeholder="Add acronym, e.g. VCG" className="h-9 flex-1 rounded-xl border border-line-strong px-3 text-[13px] outline-none focus:border-accent" />
              <Button icon={Plus} type="submit">Add</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
