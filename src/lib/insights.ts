import type { CaseRecord } from "./types";
import { assess, RULE_BY_ID } from "./rules";
import { daysBetween, daysLeft, DEMO_TODAY } from "./dates";
import { reviewerFails12m } from "./routing";

export type SlaState = "awaiting_send" | "on_track" | "due_soon" | "due_today" | "overdue" | "none";

export function slaOf(c: CaseRecord): { state: SlaState; due?: string; left?: number; label: string } {
  const due = c.stage === "escalated" ? c.escalationDue : c.stage === "challenged" ? c.challengeDue : undefined;
  if (c.stage === "challenged" && !c.challengeSentAt) return { state: "awaiting_send", label: "Email awaiting approval" };
  if (c.stage === "escalated" && !c.escalationSentAt) return { state: "awaiting_send", label: "Escalation awaiting approval" };
  if (!due) return { state: "none", label: "" };
  const left = daysLeft(due);
  if (left < 0) return { state: "overdue", due, left, label: `${-left}d overdue` };
  if (left === 0) return { state: "due_today", due, left, label: "Due today" };
  if (left <= 2) return { state: "due_soon", due, left, label: `${left}d left` };
  return { state: "on_track", due, left, label: `${left}d left` };
}

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);

export function computeInsights(cases: CaseRecord[]) {
  const open = cases.filter((c) => c.stage !== "closed");
  const closed = cases.filter((c) => c.stage === "closed");
  const weeks = Array.from(new Set(cases.map((c) => c.week))).sort((a, b) => a - b);
  const lastWeek = weeks[weeks.length - 1];

  const weekly = weeks.map((w) => {
    const wc = cases.filter((c) => c.week === w);
    return {
      week: w,
      total: wc.length,
      pass: wc.filter((c) => c.outcome === "pass").length,
      fail: wc.filter((c) => c.outcome === "fail").length,
      exclusion: wc.filter((c) => c.outcome === "exclusion").length,
      open: wc.filter((c) => c.stage !== "closed").length,
      challenged: wc.filter((c) => c.challengeSentAt || c.historicalChallenge).length,
    };
  });

  const window = (from: number, to: number) => cases.filter((c) => c.week >= from && c.week <= to && c.stage === "closed");
  const recent = window(lastWeek - 7, lastWeek);
  const prior = window(lastWeek - 15, lastWeek - 8);
  const failRate = pct(recent.filter((c) => c.outcome === "fail").length, recent.length);
  const failRatePrior = pct(prior.filter((c) => c.outcome === "fail").length, prior.length);

  const chal = (list: CaseRecord[]) => pct(list.filter((c) => c.challengeSentAt).length, list.length);
  const challengeRate = chal(cases.filter((c) => c.week >= lastWeek - 7 && c.stage !== "to_assess"));
  const challengeRatePrior = chal(cases.filter((c) => c.week >= lastWeek - 15 && c.week < lastWeek - 7));

  const sla = open.map(slaOf);
  const overdue = sla.filter((s) => s.state === "overdue").length;
  const dueSoon = sla.filter((s) => s.state === "due_today" || s.state === "due_soon").length;

  // Rules triggered on challenged cases
  const ruleCounts: Record<string, number> = {};
  cases.filter((c) => c.failedRules?.length).forEach((c) => c.failedRules!.forEach((r) => (ruleCounts[r] = (ruleCounts[r] ?? 0) + 1)));
  const totalChallenged = cases.filter((c) => c.failedRules?.length).length;
  const topRules = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ id, title: RULE_BY_ID[id]?.title ?? id, n, share: pct(n, totalChallenged) }));

  // App hotspots
  const byApp: Record<string, { app: string; total: number; fail: number; challenged: number }> = {};
  closed.forEach((c) => {
    const e = (byApp[c.app] ??= { app: c.app, total: 0, fail: 0, challenged: 0 });
    e.total++;
    if (c.outcome === "fail") e.fail++;
    if (c.challengeSentAt) e.challenged++;
  });
  const hotspots = Object.values(byApp)
    .map((a) => ({ ...a, failRate: pct(a.fail, a.total) }))
    .sort((a, b) => b.failRate - a.failRate);

  // Repeat reviewers
  const reviewerIds = Array.from(new Set(cases.map((c) => c.reviewer.id)));
  const repeat = reviewerIds
    .map((id) => {
      const rc = cases.filter((c) => c.reviewer.id === id);
      return { reviewer: rc[0].reviewer, segment: rc[0].segment, fails: reviewerFails12m(id, DEMO_TODAY, cases), cases: rc.length };
    })
    .filter((r) => r.fails >= 2)
    .sort((a, b) => b.fails - a.fails);

  // Response time (challenge sent → closed as pass)
  const responded = closed.filter((c) => c.outcome === "pass" && c.challengeSentAt && c.closedAt);
  const avgResponse = responded.length ? responded.reduce((s, c) => s + daysBetween(c.challengeSentAt!, c.closedAt!), 0) / responded.length : 0;

  // Fail reasons
  const fails = closed.filter((c) => c.outcome === "fail");
  const failReasons = {
    no_action: fails.filter((c) => c.failReason === "no_action").length,
    insufficient: fails.filter((c) => c.failReason === "insufficient").length,
    revoked: fails.filter((c) => c.failReason === "revoked").length,
  };

  return {
    open: open.length,
    toAssess: cases.filter((c) => c.stage === "to_assess").length,
    challenged: cases.filter((c) => c.stage === "challenged").length,
    escalated: cases.filter((c) => c.stage === "escalated").length,
    overdue,
    dueSoon,
    failRate,
    failRatePrior,
    challengeRate,
    challengeRatePrior,
    weekly,
    topRules,
    hotspots,
    repeat,
    avgResponse,
    failReasons,
    totalFails: fails.length,
    lastWeek,
  };
}

/** Compare engine suggestion vs. historical analyst decisions (synthetic history). */
export function backtest(cases: CaseRecord[], allow?: string[]) {
  const hist = cases.filter((c) => c.historicalChallenge !== undefined);
  let tp = 0, fp = 0, fn = 0, tn = 0, review = 0;
  hist.forEach((c) => {
    const v = assess(c, allow).verdict;
    if (v === "review") review++;
    const predicted = v === "hard_stop";
    if (predicted && c.historicalChallenge) tp++;
    else if (predicted && !c.historicalChallenge) fp++;
    else if (!predicted && c.historicalChallenge) fn++;
    else tn++;
  });
  const n = hist.length;
  return {
    n, tp, fp, fn, tn, review,
    agreement: pct(tp + tn, n),
    precision: pct(tp, tp + fp),
    recall: pct(tp, tp + fn),
  };
}
