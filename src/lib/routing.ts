// Phase 3 – HR Reporting routing (from the ERQA process map V2).
//  • No action                         → remedial training (monthly LMS) AND HR (weekly)
//  • Acted, still failed, 3rd in 12 mo → HR (weekly)
//  • Acted, still failed, otherwise    → remedial training (monthly LMS)
// "Revoked" is confirmed as FAIL; it is routed as an "acted" failure (flagged to confirm).

import type { CaseRecord, FailReason } from "./types";
import { daysBetween } from "./dates";

export interface Routing {
  training: boolean;
  hr: boolean;
  fails12m: number;
  repeat: boolean;
  rule: string;
  needsConfirmation?: string;
}

export const FAIL_REASON_LABEL: Record<FailReason, string> = {
  no_action: "No action",
  insufficient: "Acted – still insufficient",
  revoked: "Access revoked",
};

export function reviewerFails12m(reviewerId: string, asOf: string, cases: CaseRecord[]): number {
  return cases.filter(
    (c) =>
      c.reviewer.id === reviewerId &&
      c.outcome === "fail" &&
      c.closedAt &&
      daysBetween(c.closedAt, asOf) >= 0 &&
      daysBetween(c.closedAt, asOf) <= 365,
  ).length;
}

export function routeFail(c: CaseRecord, cases: CaseRecord[]): Routing | null {
  if (c.outcome !== "fail" || !c.failReason || !c.closedAt) return null;
  const fails12m = reviewerFails12m(c.reviewer.id, c.closedAt, cases);
  const repeat = fails12m >= 3;
  if (c.failReason === "no_action") {
    return { training: true, hr: true, fails12m, repeat, rule: "Failure due to no action → training + HR (parallel)" };
  }
  const base = repeat
    ? { training: false, hr: true, fails12m, repeat, rule: `Acted but failed; ${fails12m} fails in 12 months (≥3) → HR` }
    : { training: true, hr: false, fails12m, repeat, rule: `Acted but failed; ${fails12m} fail(s) in 12 months (<3) → remedial training` };
  return c.failReason === "revoked"
    ? { ...base, needsConfirmation: "Routing for revoked-access fails is assumed to follow the 'acted' path – confirm with ERQA." }
    : base;
}
