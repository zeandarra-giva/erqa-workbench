"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, AlertTriangle, Mail, PencilLine, ShieldCheck, Clock, Ban, ArrowUpRight, UserRound } from "lucide-react";
import { useStore } from "@/lib/store";
import { assess, RULES, RULE_BY_ID, STEPS, type Finding } from "@/lib/rules";
import { routeFail, FAIL_REASON_LABEL } from "@/lib/routing";
import { slaOf } from "@/lib/insights";
import { fmtDate } from "@/lib/dates";
import { EXCLUSION_TYPES, type CaseRecord, type ExclusionType } from "@/lib/types";
import { Avatar, Button, Card, CardHeader, Empty, OutcomePill, Pill, SlaPill, VerdictPill, cn } from "@/components/ui";

const FIELD_ROWS: { key: "justRole" | "justProcess" | "justComm"; label: string; field: Finding["field"] }[] = [
  { key: "justRole", label: "Worker's role", field: "Role" },
  { key: "justProcess", label: "Business process", field: "Business Process" },
  { key: "justComm", label: "Reason for low commonality", field: "Low Commonality" },
];

function FindingLine({ f }: { f: Finding }) {
  const Icon = f.category === "hard_stop" ? XCircle : f.category === "negotiable" ? AlertTriangle : CheckCircle2;
  const color = f.category === "hard_stop" ? "text-bad" : f.category === "negotiable" ? "text-warn" : "text-ok";
  return (
    <div className="flex gap-2 text-[13px] leading-snug">
      <Icon className={cn("mt-0.5 size-4 shrink-0", color)} strokeWidth={1.8} />
      <span>
        <span className="font-mono text-[12px] text-muted">{f.rule}</span> <span className="font-medium">{RULE_BY_ID[f.rule]?.title}</span>
        <span className="text-ink-2">: {f.evidence}</span>
        {f.confidence === "medium" && f.category !== "acceptable" && <span className="ml-1 text-[11.5px] text-muted">(medium confidence)</span>}
      </span>
    </div>
  );
}

function Field({ label, value, findings }: { label: string; value: string; findings: Finding[] }) {
  const worst = findings.find((f) => f.category === "hard_stop") ? "hard" : findings.find((f) => f.category === "negotiable") ? "neg" : null;
  return (
    <div className={cn("rounded-xl border p-3.5", worst === "hard" ? "border-[#f3c9cb] bg-[#fffafa]" : worst === "neg" ? "border-[#f5dcae] bg-[#fffcf5]" : "border-line")}>
      <div className="mb-1 text-[11.5px] font-medium tracking-wide text-muted uppercase">{label}</div>
      <div className="text-[14.5px] leading-relaxed">{value || <i className="text-faint">(blank)</i>}</div>
      {findings.length > 0 && <div className="mt-2.5 space-y-1.5 border-t border-dashed border-line pt-2.5">{findings.map((f, i) => <FindingLine key={i} f={f} />)}</div>}
    </div>
  );
}

export default function CasePage() {
  return (
    <Suspense fallback={null}>
      <CaseLoader />
    </Suspense>
  );
}

function CaseLoader() {
  const { id } = useParams<{ id: string }>();
  const { state } = useStore();
  const c = state.cases.find((x) => x.id === id);
  if (!c) return <div className="mx-auto max-w-xl pt-10"><Empty title="Case not found" sub={`No case with id ${id}.`} /></div>;
  return <CaseView key={c.id} c={c} />;
}

function CaseView({ c }: { c: CaseRecord }) {
    const { state, dispatch } = useStore();
    const [revising, setRevising] = useState(false);
    const a = useMemo(() => assess(c, state.acronyms), [c, state.acronyms]);
    const [rules, setRules] = useState<string[]>(Array.from(new Set(a.hardStops.map((h) => h.rule))));
    const [excl, setExcl] = useState<ExclusionType>(EXCLUSION_TYPES[0]);
    const [draft, setDraft] = useState({ justRole: c.justRole, justProcess: c.justProcess, justComm: c.justComm });
    const draftA = useMemo(() => assess({ ...c, ...draft }, state.acronyms), [c, draft, state.acronyms]);
    const sla = slaOf(c);
    const routing = routeFail(c, state.cases);
    const caseEmails = state.emails.filter((e) => e.caseId === c.id);
    const byField = (field: Finding["field"]) => a.findings.filter((f) => f.field === field || (f.field === "All fields" && field === "Role"));

    const stepStatus = (step: number) => {
      const fs = a.findings.filter((f) => f.step === step);
      if (fs.some((f) => f.category === "hard_stop")) return "hard";
      if (fs.some((f) => f.category === "negotiable")) return "neg";
      return "ok";
    };

    return (
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-3 flex items-center gap-1.5 text-[13px] text-muted">
          <Link href="/queue" className="hover:text-ink">Assessment Queue</Link><ChevronRight className="size-3.5" /><span className="text-ink">{c.id}</span>
        </div>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[22px] font-semibold tracking-tight sm:text-[26px]">{c.app}</h1>
              {c.stage === "to_assess" && <VerdictPill verdict={a.verdict} />}
              {c.stage === "closed" ? <OutcomePill c={c} /> : <SlaPill c={c} />}
              <Pill tone="neutral">{{ to_assess: "To assess", challenged: "Challenged", escalated: "Escalated", closed: "Closed" }[c.stage]}</Pill>
            </div>
            <p className="mt-1.5 font-mono text-[13px] text-muted">{c.func} · {c.environment}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-line bg-surface px-4 py-3 text-[13px]">
            <div className="flex items-center gap-2"><Avatar name={c.reviewer.name} size={30} /><div><div className="font-medium">{c.reviewer.name}</div><div className="text-muted">EERS reviewer · {c.managerOrDelegate}</div></div></div>
            <ArrowUpRight className="size-4 rotate-45 text-faint" />
            <div className="flex items-center gap-2"><span className="inline-flex size-[30px] items-center justify-center rounded-full bg-subtle"><UserRound className="size-4 text-muted" /></span><div><div className="font-medium">{c.worker.name}</div><div className="text-muted">Worker</div></div></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
          {/* LEFT */}
          <div className="space-y-4">
            <Card data-tour="case-fields">
              <CardHeader title="Justification" sub={`Submitted in EERS on ${fmtDate(c.reviewDate)} · ${c.reviewType} review`} />
              <div className="space-y-3 px-5 pb-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-line p-3.5"><div className="mb-1 text-[11.5px] font-medium tracking-wide text-muted uppercase">Reason access is needed (dropdown)</div><div className="text-[14.5px]">{c.template}</div></div>
                  <div className="rounded-xl border border-line p-3.5"><div className="mb-1 text-[11.5px] font-medium tracking-wide text-muted uppercase">Frequency of use (dropdown)</div><div className="text-[14.5px]">{c.frequency}</div></div>
                </div>
                {FIELD_ROWS.map((r) => <Field key={r.key} label={r.label} value={c[r.key]} findings={byField(r.field)} />)}
              </div>
            </Card>

            {(c.stage === "challenged" || c.stage === "escalated") && (
              <Card>
                <CardHeader
                  title="Revised justification"
                  sub="Paste what the reviewer re-entered in EERS. The pre-screen re-runs instantly."
                  action={<Button variant="ghost" icon={PencilLine} onClick={() => setRevising(!revising)}>{revising ? "Hide" : "Capture revision"}</Button>}
                />
                {revising && (
                  <div className="space-y-3 px-5 pb-5">
                    {FIELD_ROWS.map((r) => (
                      <label key={r.key} className="block">
                        <span className="mb-1 block text-[12px] font-medium text-muted">{r.label}</span>
                        <textarea value={draft[r.key]} onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value })} rows={2} className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-[14px] outline-none focus:border-accent" />
                      </label>
                    ))}
                    <div className="flex items-center justify-between rounded-xl bg-subtle px-3.5 py-2.5">
                      <span className="flex items-center gap-2 text-[13.5px]">Re-check: <VerdictPill verdict={draftA.verdict} /> {draftA.hardStops.map((h) => <span key={h.rule + h.field} className="rounded-md bg-bad-soft px-1.5 py-0.5 font-mono text-[11.5px] text-bad">{h.rule}</span>)}</span>
                      <Button variant="primary" onClick={() => { dispatch({ type: "revise", id: c.id, ...draft }); setRevising(false); }}>Save revision</Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            <Card>
              <CardHeader title="Access & organisation" />
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 pb-5 text-[13.5px] md:grid-cols-3">
                {[
                  ["Entitlement", c.entitlement],
                  ["App ID", c.appId],
                  ["Sign-off ID", c.signoffId],
                  ["Segment", c.segment],
                  ["Sector", c.sector],
                  ["Country / Region", `${c.country} · ${c.region}`],
                  ["Reviewer's manager", c.reviewerManager.name],
                  ["Analyst", c.analyst],
                  ["Weekly sample", `W${c.week} · ${c.year}`],
                ].map(([k, v]) => (
                  <div key={k}><dt className="text-[12px] text-muted">{k}</dt><dd className="mt-0.5">{v}</dd></div>
                ))}
              </dl>
            </Card>

            <Card data-tour="case-audit">
              <CardHeader title="Audit trail" sub="Every action is logged automatically. This replaces evidence saved by hand to the shared drive." />
              <ol className="relative mx-5 mb-5 border-l border-line pl-5">
                {[...c.audit].reverse().map((e, i) => (
                  <li key={i} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[26px] top-1 size-2.5 rounded-full border-2 border-surface bg-line-strong ring-1 ring-line" />
                    <div className="text-[13.5px]"><span className="font-medium">{e.action}</span>{e.detail && <span className="text-muted"> · {e.detail}</span>}</div>
                    <div className="text-[12px] text-muted">{e.actor} · {e.at.replace("T", " ").slice(0, 16)}</div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <Card data-tour="case-prescreen">
              <CardHeader title={<span className="flex items-center gap-2"><ShieldCheck className="size-4 text-accent" />Pre-screen</span>} sub="ERQA ruleset · suggestion only, the analyst decides" action={<VerdictPill verdict={a.verdict} />} />
              <ol className="px-5 pb-4">
                {STEPS.map((s) => {
                  const st = stepStatus(s.step);
                  return (
                    <li key={s.step} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                      <span className={cn("inline-flex size-6 items-center justify-center rounded-full text-[11.5px] font-semibold", st === "hard" ? "bg-bad-soft text-bad" : st === "neg" ? "bg-subtle text-ink-2" : "bg-ok-soft text-ok")}>{s.step}</span>
                      <span className="flex-1 text-[13.5px]">{s.title}</span>
                      <span className={cn("text-[12px] font-medium", st === "hard" ? "text-bad" : st === "neg" ? "text-warn" : "text-ok")}>{st === "hard" ? "Hard stop" : st === "neg" ? "Judgment" : "OK"}</span>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card data-tour="case-decision">
              <CardHeader title="Decision" sub={sla.due ? `${sla.label} · due ${fmtDate(sla.due)}` : undefined} />
              <div className="space-y-3 px-5 pb-5">
                {c.stage === "to_assess" && (
                  <>
                    <div>
                      <div className="mb-1.5 text-[12px] font-medium text-muted">Rules to cite in the challenge</div>
                      <div className="flex flex-wrap gap-1.5">
                        {RULES.filter((r) => r.category === "hard_stop").map((r) => (
                          <button key={r.id} onClick={() => setRules(rules.includes(r.id) ? rules.filter((x) => x !== r.id) : [...rules, r.id])} className={cn("rounded-lg border px-2 py-1 text-[12px]", rules.includes(r.id) ? "border-bad bg-bad-soft text-bad" : "border-line text-muted hover:bg-subtle")} title={r.condition}>
                            {r.id} {r.title}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button variant="primary" icon={Mail} className="w-full" disabled={!rules.length} onClick={() => dispatch({ type: "challenge", id: c.id, rules })}>Challenge · draft email</Button>
                    <Button variant="success" icon={CheckCircle2} className="w-full" onClick={() => dispatch({ type: "pass", id: c.id })}>Meets requirements · PASS</Button>
                    <div className="flex gap-2">
                      <select value={excl} onChange={(e) => setExcl(e.target.value as ExclusionType)} className="h-9 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-2 text-[13px]">
                        {EXCLUSION_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <Button onClick={() => dispatch({ type: "exclude", id: c.id, exclusionType: excl })}>Exclude</Button>
                    </div>
                    {a.verdict === "hard_stop" && rules.length === 0 && <p className="text-[12px] text-warn">Pre-screen found hard stops. Select at least one rule to challenge.</p>}
                  </>
                )}

                {(c.stage === "challenged" || c.stage === "escalated") && sla.state === "awaiting_send" && (
                  <div className="rounded-xl border border-[#ddd2fb] bg-violet-soft p-3.5 text-[13.5px] text-violet">
                    The {c.stage === "challenged" ? "challenge" : "escalation"} email is waiting for your approval. The 7-day clock starts when it&apos;s sent.
                    <Link href="/outbox" className="mt-2 block font-medium underline">Review in Outbox →</Link>
                  </div>
                )}

                {c.stage === "challenged" && c.challengeSentAt && (
                  <>
                    <p className="text-[13px] text-muted">Challenge sent {fmtDate(c.challengeSentAt)} to {c.reviewer.name} (cc {c.reviewerManager.name}).</p>
                    <Button variant="success" icon={CheckCircle2} className="w-full" onClick={() => dispatch({ type: "pass", id: c.id, note: "Revised justification meets requirements" })}>Revised justification passes · PASS</Button>
                    <Button variant="danger" icon={Ban} className="w-full" onClick={() => dispatch({ type: "fail", id: c.id, reason: "revoked" })}>Access revoked · FAIL</Button>
                    <Button variant={sla.state === "overdue" ? "primary" : "secondary"} icon={ArrowUpRight} className="w-full" onClick={() => dispatch({ type: "escalate", id: c.id })}>No action / still insufficient · Escalate</Button>
                    {sla.state === "overdue" && <p className="text-[12px] text-bad">Response window has passed. Escalation is due.</p>}
                  </>
                )}

                {c.stage === "escalated" && c.escalationSentAt && (
                  <>
                    <p className="text-[13px] text-muted">Escalated {fmtDate(c.escalationSentAt)} to {c.reviewerManager.name}.</p>
                    <Button variant="success" icon={CheckCircle2} className="w-full" onClick={() => dispatch({ type: "pass", id: c.id, note: "Revised justification after escalation" })}>Revised justification passes · PASS</Button>
                    <Button variant="danger" icon={Ban} className="w-full" onClick={() => dispatch({ type: "fail", id: c.id, reason: "revoked" })}>Access revoked · FAIL</Button>
                    <Button variant="danger" icon={Clock} className="w-full" onClick={() => dispatch({ type: "fail", id: c.id, reason: "no_action" })}>No action · FAIL</Button>
                    <Button variant="danger" icon={XCircle} className="w-full" onClick={() => dispatch({ type: "fail", id: c.id, reason: "insufficient" })}>Still insufficient · FAIL</Button>
                  </>
                )}

                {c.stage === "closed" && (
                  <div className="space-y-2 text-[13.5px]">
                    <div className="flex items-center justify-between"><span className="text-muted">Outcome</span><OutcomePill c={c} /></div>
                    {c.failReason && <div className="flex items-center justify-between"><span className="text-muted">Fail reason</span><span>{FAIL_REASON_LABEL[c.failReason]}</span></div>}
                    {c.exclusionType && <div className="flex items-center justify-between"><span className="text-muted">Exclusion type</span><span>{c.exclusionType}</span></div>}
                    <div className="flex items-center justify-between"><span className="text-muted">Closed</span><span>{fmtDate(c.closedAt)}</span></div>
                  </div>
                )}
              </div>
            </Card>

            {routing && (
              <Card>
                <CardHeader title="Phase 3 routing" sub="Applied automatically from the process map rules" />
                <div className="space-y-2 px-5 pb-5 text-[13.5px]">
                  <div className="flex justify-between"><span className="text-muted">Reviewer fails · 12 months</span><span className="tabular font-medium">{routing.fails12m}{routing.repeat && " · 3× rule met"}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Monthly LMS remedial training</span>{routing.training ? <Pill tone="violet">Included</Pill> : <span className="text-faint">—</span>}</div>
                  <div className="flex justify-between"><span className="text-muted">Weekly HR report</span>{routing.hr ? <Pill tone="bad">Included</Pill> : <span className="text-faint">—</span>}</div>
                  <p className="rounded-lg bg-subtle px-3 py-2 text-[12.5px] text-ink-2">{routing.rule}</p>
                  {routing.needsConfirmation && <p className="text-[12px] text-warn">⚠ {routing.needsConfirmation}</p>}
                </div>
              </Card>
            )}

            <Card>
              <CardHeader title="Emails" />
              <div className="px-3 pb-3">
                {caseEmails.map((e) => (
                  <Link key={e.id} href="/outbox" className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-subtle">
                    <Mail className="size-4 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{e.subject}</span>
                    <Pill tone={e.status === "draft" ? "violet" : "neutral"}>{e.status === "draft" ? "Draft" : "Sent"}</Pill>
                  </Link>
                ))}
                {!caseEmails.length && <p className="px-2 py-2 text-[13px] text-muted">No emails yet.</p>}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
}
