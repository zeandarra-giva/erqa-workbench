import type { CaseRecord, EmailDraft, EmailKind } from "./types";
import { RULE_BY_ID } from "./rules";
import { addDays, fmtDate, DEMO_TODAY } from "./dates";

const SIGN = "Entitlement Review Quality Assurance (ERQA)";

function criteriaList(ruleIds: string[] = []) {
  if (!ruleIds.length) return "  • (Analyst to specify the missing requirement)";
  return ruleIds
    .map((id) => {
      const r = RULE_BY_ID[id];
      return r ? `  • ${r.title}: ${r.reason}` : `  • ${id}`;
    })
    .join("\n");
}

export function buildEmail(c: CaseRecord, kind: EmailKind, id: string, createdAt: string): EmailDraft {
  const due = fmtDate(addDays(DEMO_TODAY, 7));
  const ref = `[ERQA ${c.id}]`;
  let subject = "";
  let body = "";
  let to = c.reviewer.name;
  let cc: string | undefined = c.reviewerManager.name;

  if (kind === "challenge") {
    subject = `${ref} Justification challenge – ${c.app} · ${c.func}`;
    body = `Hello ${c.reviewer.name.split(" ")[0]},

Your justification for ${c.worker.name}'s access to ${c.app} (${c.func}) was sampled for quality review and does not yet meet the requirements.

What needs attention:
${criteriaList(c.failedRules)}

Please perform a new (ad-hoc) review in EERS and enter a revised justification by ${due} (7 calendar days). Each field must contain a distinct, specific answer in English.

Keep the case reference ${ref} in the subject line of any reply.

${SIGN}`;
  } else if (kind === "escalation") {
    to = c.reviewerManager.name;
    cc = c.reviewer.name;
    subject = `${ref} ESCALATION – justification required for ${c.app}`;
    body = `Hello ${c.reviewerManager.name.split(" ")[0]},

On ${fmtDate(c.challengeSentAt)} we challenged a justification submitted by ${c.reviewer.name} (your direct report) for ${c.worker.name}'s access to ${c.app} (${c.func}). The justification has not yet met the requirements.

Open items:
${criteriaList(c.failedRules)}

Please ensure a new (ad-hoc) review with a complete justification is submitted in EERS by ${due} (7 calendar days). If no adequate action is taken, the review will be closed as FAIL under the Accountability Framework Procedure.

${SIGN}`;
  } else {
    subject = `${ref} Justification review closed – FAIL`;
    body = `Hello ${c.reviewer.name.split(" ")[0]},

The justification review for ${c.worker.name}'s access to ${c.app} (${c.func}) has been closed as FAIL (${c.failReason === "no_action" ? "no action taken" : c.failReason === "revoked" ? "access revoked – original justification not supported" : "revised justification still incomplete"}).

Next steps are handled in line with the Accountability Framework Procedure.

${SIGN}`;
  }

  return { id, caseId: c.id, kind, to, cc, subject, body, status: "draft", createdAt };
}
