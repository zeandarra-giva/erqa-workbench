import { describe, expect, it } from "vitest";
import { assess } from "./rules";
import { routeFail } from "./routing";
import type { CaseRecord } from "./types";

const ids = (a: ReturnType<typeof assess>) => a.findings.map((f) => f.rule);

// Examples below are taken from the ERQA Justification Guide and Rule Set
// (paraphrased / fictional – no real data).
describe("pre-screen follows the ERQA ruleset", () => {
  it("clean pass: good example from the guide", () => {
    const a = assess({
      justRole: "Maintenance Technician",
      justProcess: "Communicates with external vendors and building managers to confirm appointments for licensed repair work.",
      justComm: "Technicians do not normally need external email; this worker backs up the team lead when they are out of office.",
    });
    expect(a.verdict).toBe("clear");
  });

  it("R1 – non-English text is a hard stop", () => {
    const a = assess({
      justRole: "Gerente de seguridad",
      justProcess: "Es el responsable de la seguridad de la sucursal y requiere acceso para enviar reportes.",
      justComm: "Es el único personal de seguridad en el equipo.",
    });
    expect(ids(a)).toContain("R1");
    expect(a.verdict).toBe("hard_stop");
  });

  it("R2 – generic business process (bad example from the guide)", () => {
    const a = assess({ justRole: "Contractor", justProcess: "Needs access to carry out daily responsibilities", justComm: "Everyone should have this access" });
    expect(ids(a)).toEqual(expect.arrayContaining(["R2", "R3"]));
    expect(a.verdict).toBe("hard_stop");
  });

  it("R2 – 'BAU' only", () => {
    expect(ids(assess({ justRole: "Business Analyst", justProcess: "BAU", justComm: "Only two peers in the region cover this application." }))).toContain("R2");
  });

  it("R3 – 'small team' is a non-explanation", () => {
    const a = assess({ justRole: "Treasury Analyst", justProcess: "Releases outgoing wire payments after four-eyes verification in the payments hub.", justComm: "Small team" });
    expect(ids(a)).toContain("R3");
  });

  it("R4 – copy-paste non-answer", () => {
    const t = "Processes vendor invoices in the accounts payable system every day";
    const a = assess({ justRole: "AP Specialist", justProcess: t, justComm: t });
    expect(ids(a)).toContain("R4");
    expect(a.verdict).toBe("hard_stop");
  });

  it("R12 – same text that answers both is negotiable, not a hard stop", () => {
    const t = "Reconciles nostro accounts daily for the EMEA desk; peers cover other regions so only this worker needs the EMEA entitlement.";
    const a = assess({ justRole: "Reconciliation Analyst", justProcess: t, justComm: t });
    expect(ids(a)).toContain("R12");
    expect(ids(a)).not.toContain("R4");
  });

  it("R5 – obscure standalone acronym with no context (ruleset example 'SSU')", () => {
    const a = assess({ justRole: "SSU", justProcess: "Needed for daily work", justComm: "Small team" });
    expect(ids(a)).toContain("R5");
  });

  it("R11 – internal acronym clarified by context (ruleset example 'VCG D&E')", () => {
    const a = assess({
      justRole: "VCG D&E",
      justProcess: "Designs valuation execution strategies and maintains pricing models used by the valuation control group.",
      justComm: "Peers on the team focus on reporting; only this specialist maintains the pricing models.",
    });
    expect(ids(a)).toContain("R11");
    expect(a.verdict).toBe("review");
  });

  it("R6 – system or group name used as role", () => {
    expect(ids(assess({ justRole: "AD_Group_Member", justProcess: "Monitors overnight batch jobs for the settlements platform.", justComm: "Peers work days; this worker covers the night shift." }))).toContain("R6");
    expect(ids(assess({ justRole: "TLM Recon Portal", justProcess: "Monitors overnight batch jobs for the settlements platform.", justComm: "Peers work days; this worker covers the night shift." }))).toContain("R6");
  });

  it("R9 – standard acronyms are acceptable", () => {
    const a = assess({ justRole: "DBA", justProcess: "Administers production Oracle databases and applies patches during change windows.", justComm: "Only the two DBAs on the team are assigned to this server; peers support other platforms." });
    expect(ids(a)).toContain("R9");
    expect(a.verdict).toBe("clear");
  });

  it("R10 – generic role is negotiable", () => {
    const a = assess({ justRole: "Analyst", justProcess: "Prepares the monthly regulatory capital report and reconciles general ledger balances.", justComm: "Peers handle forecasting and do not post to the ledger; this analyst is the regional specialist." });
    expect(a.verdict).toBe("review");
    expect(ids(a)).toContain("R10");
  });
});

describe("Phase 3 routing", () => {
  const base = (id: string, closedAt: string, failReason: CaseRecord["failReason"]): CaseRecord =>
    ({ id, reviewer: { id: "R1", name: "x" }, outcome: "fail", failReason, closedAt } as unknown as CaseRecord);

  it("no action → training and HR", () => {
    const c = base("a", "2026-11-20", "no_action");
    expect(routeFail(c, [c])).toMatchObject({ training: true, hr: true });
  });
  it("acted, first fail → training only", () => {
    const c = base("a", "2026-11-20", "insufficient");
    expect(routeFail(c, [c])).toMatchObject({ training: true, hr: false });
  });
  it("acted, 3rd fail in 12 months → HR only", () => {
    const c = base("c", "2026-11-20", "insufficient");
    const all = [base("a", "2026-03-01", "insufficient"), base("b", "2026-07-01", "no_action"), c];
    expect(routeFail(c, all)).toMatchObject({ training: false, hr: true, fails12m: 3 });
  });
  it("fails older than 12 months do not count", () => {
    const c = base("c", "2026-11-20", "insufficient");
    const all = [base("a", "2025-06-01", "insufficient"), base("b", "2025-08-01", "insufficient"), c];
    expect(routeFail(c, all)).toMatchObject({ training: true, hr: false, fails12m: 1 });
  });
});
