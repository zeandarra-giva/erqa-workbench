// Deterministic SYNTHETIC data. Every name, ID and justification is fictional.
// Shapes mirror the ERQA SharePoint List so the prototype behaves realistically.

import type { CaseRecord, EmailDraft, ImportRun, Person, FailReason, ExclusionType } from "./types";
import { EXCLUSION_TYPES } from "./types";
import { assess } from "./rules";
import { addDays, DEMO_TODAY, isoWeekStart, daysBetween } from "./dates";
import { buildEmail } from "./emails";

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Avery", "Jordan", "Priya", "Mateo", "Hana", "Liam", "Sofia", "Kofi", "Elena", "Ravi", "Noor", "Daniel", "Mei", "Lucas", "Amara", "Tomas", "Isla", "Arjun", "Camila", "Owen", "Yara", "Felix", "Leila", "Marcus", "Zara", "Diego", "Anya", "Samuel", "Ines", "Kenji"];
const LAST = ["Whitfield", "Moreno", "Castell", "Okafor", "Lindqvist", "Ramanathan", "Delacroix", "Nakamura", "Brennan", "Haddad", "Vasquez", "Kowalski", "Fairbanks", "Mensah", "Albright", "Sato", "Quintero", "Devlin", "Ashford", "Petrov"];

function makePeople(r: () => number, n: number, prefix: string): Person[] {
  const out: Person[] = [];
  const used = new Set<string>();
  while (out.length < n) {
    const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    if (used.has(name)) continue;
    used.add(name);
    out.push({ id: `${prefix}${String(10000 + Math.floor(r() * 89999))}`, name });
  }
  return out;
}

const APPS = [
  { app: "Payments Hub", id: "140211", funcs: ["WIRE_RELEASE_APPROVER", "BENEFICIARY_MAINT"], ent: "Approve and release outgoing wire payments above desk limits" },
  { app: "Core Ledger", id: "141580", funcs: ["GL_JOURNAL_POSTER", "PERIOD_CLOSE_OVERRIDE"], ent: "Post manual journal entries to the general ledger" },
  { app: "External Email Gateway", id: "147396", funcs: ["INBOUND_OUTBOUND", "INBOUND_OUTBOUND_SMALL"], ent: "Send and receive email to external domains" },
  { app: "Identity Console", id: "150323", funcs: ["PRIVILEGED_ADMIN", "ROLE_APPROVER"], ent: "Administer privileged directory groups" },
  { app: "Trade Capture", id: "151042", funcs: ["EXTERNAL_FILE_TRANSFER", "LIMIT_OVERRIDE"], ent: "Transfer trade files to external counterparties" },
  { app: "Enterprise Data Warehouse", id: "152906", funcs: ["PROD_READ_ALL", "DEV_WRITE"], ent: "Read access to all production data marts" },
  { app: "Disputes Workflow", id: "155527", funcs: ["DISPUTE_CREDIT_ISSUER"], ent: "Issue provisional credits on card disputes" },
  { app: "Client Onboarding Portal", id: "158804", funcs: ["KYC_OVERRIDE", "ACCOUNT_ACTIVATE"], ent: "Override KYC checklist items during onboarding" },
];

const ORGS = [
  { country: "United States", region: "NA", sector: "Corporate Functions", segment: "Finance" },
  { country: "United States", region: "NA", sector: "Technology", segment: "Infrastructure" },
  { country: "Mexico", region: "LATAM", sector: "Retail Banking", segment: "Branch Network" },
  { country: "United Kingdom", region: "EMEA", sector: "Markets", segment: "Trade Operations" },
  { country: "Poland", region: "EMEA", sector: "Technology", segment: "Application Support" },
  { country: "India", region: "APAC", sector: "Operations", segment: "Payments Operations" },
  { country: "Singapore", region: "APAC", sector: "Wealth", segment: "Private Banking" },
  { country: "Brazil", region: "LATAM", sector: "Operations", segment: "Client Onboarding" },
  { country: "Philippines", region: "APAC", sector: "Operations", segment: "Shared Services" },
];

type J = { role: string; process: string; comm: string; template?: string };

const GOOD: J[] = [
  { role: "Treasury Payments Analyst", process: "Releases high-value outgoing wires after four-eyes verification and resolves payment repairs for the corporate desk.", comm: "Only two of my eight direct reports release wires; peers handle reconciliations and do not need release rights (maker/checker segregation)." },
  { role: "Senior Financial Controller", process: "Posts and reviews manual adjusting journal entries during month-end close for the regional legal entities.", comm: "Peers work on forecasting and never post journals; this controller is the designated poster for the region." },
  { role: "Maintenance Technician", process: "Communicates with external vendors and building managers to confirm appointments for licensed repair work.", comm: "Technicians do not normally need external email; this worker backs up the team lead when they are out of office." },
  { role: "IAM Engineer", process: "Administers privileged directory groups and executes approved access changes raised through change tickets.", comm: "Peers on the team handle access reviews only; this engineer is one of two assigned to privileged group administration." },
  { role: "Trade Settlement Analyst", process: "Sends daily trade confirmation files to the clearing counterparty and investigates rejected files.", comm: "Peers cover other regions; only this analyst supports the EMEA clearing link, with a named backup." },
  { role: "DBA", process: "Applies patches and monitors performance of production data marts during approved change windows.", comm: "Only the two DBAs on my team are assigned to this platform; peers support other databases." },
  { role: "Disputes Specialist", process: "Reviews card dispute evidence and issues provisional credits within regulatory timelines.", comm: "Peers handle intake only; this specialist is dedicated to credit decisions to keep segregation of duties." },
  { role: "Onboarding Team Lead", process: "Approves KYC exceptions for corporate clients after compliance sign-off and documents the rationale.", comm: "Least privilege: as team lead she is the only one of nine direct reports authorised to approve exceptions; peers prepare files." },
  { role: "Priority Banker", process: "Activates new accounts for priority clients and verifies identification documents in the onboarding portal.", comm: "Most colleagues serve the mass segment; this banker is the specialist for priority clients in the branch." },
  { role: "Application Support Engineer", process: "Troubleshoots production incidents and monitors overnight batch jobs for the ledger application.", comm: "Peers support other applications; this engineer is the primary on-call for the ledger, with one backup." },
];

const BAD: Record<string, J[]> = {
  R1: [
    { role: "Gerente de sucursal", process: "Es el responsable de autorizar las operaciones de la sucursal y requiere acceso para enviar reportes.", comm: "Es el único gerente en el equipo que realiza esta función." },
    { role: "Banquero asociado", process: "Se requiere el acceso para realizar la apertura de cuentas de los clientes.", comm: "La mayoría de los banqueros no tienen este acceso." },
  ],
  R2: [
    { role: "Operations Analyst", process: "BAU", comm: "Peers in the region do not process these items; only this analyst covers the team." },
    { role: "Payments Associate", process: "Needed for daily work", comm: "Colleagues handle other queues; this worker is the backup for the supervisor." },
  ],
  R3: [
    { role: "Finance Analyst", process: "Prepares accruals and posts adjusting entries for the regional cost centres at month end.", comm: "Small team" },
    { role: "Reconciliation Analyst", process: "Reconciles nostro balances and investigates breaks for the payments desk.", comm: "Everyone needs access" },
  ],
  R4: [
    { role: "Data Engineer", process: "Builds and maintains data pipelines for the risk reporting data mart", comm: "Builds and maintains data pipelines for the risk reporting data mart" },
  ],
  R5: [{ role: "SSU", process: "Needed for daily work", comm: "Small team" }],
  R6: [
    { role: "AD_Group_Member", process: "Monitors overnight batch jobs for the settlements platform and restarts failed jobs.", comm: "Peers work day shifts; this worker covers nights." },
    { role: "TLM Recon Portal", process: "Matches settlement breaks and escalates aged items to the desk.", comm: "Peers cover other currencies; this worker owns USD breaks." },
  ],
  R10: [{ role: "Contractor", process: "Migrates legacy disputes data into the new workflow tool and validates record counts after each load.", comm: "Peers are permanent staff on BAU queues; this contractor is dedicated to the migration project only." }],
  R11: [{ role: "VCG D&E", process: "Designs valuation execution strategies and maintains pricing models used by valuation control.", comm: "Peers focus on reporting; only this specialist maintains the pricing models." }],
};

const TEMPLATES = ["Access is required for their job function", "Access is required for their job function", "Access is required for their job function", "This person is a backup for another worker"];
const FREQ = ["Daily", "Daily", "Weekly", "Monthly", "Adhoc", "Quarterly"];
export const ANALYSTS = ["Ana Rivera", "Jun Tan", "Maya Okafor"];
export const CURRENT_ANALYST = "Ana Rivera";

export interface SeedState {
  cases: CaseRecord[];
  emails: EmailDraft[];
  imports: ImportRun[];
}

export function generateSeed(): SeedState {
  const r = rng(20261124);
  const reviewers = makePeople(r, 26, "RV");
  const managers = makePeople(r, 9, "MG");
  const workers = makePeople(r, 80, "WK");
  const repeatOffenders = new Set([reviewers[0].id, reviewers[1].id, reviewers[2].id]);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

  const cases: CaseRecord[] = [];
  const emails: EmailDraft[] = [];
  const imports: ImportRun[] = [];
  let mailSeq = 1;

  for (let week = 36; week <= 48; week++) {
    const monday = isoWeekStart(2026, week);
    const count = 11 + Math.floor(r() * 6);
    for (let i = 1; i <= count; i++) {
      const reviewerIdx = Math.floor(r() * reviewers.length);
      const reviewer = reviewers[reviewerIdx];
      const isRepeat = repeatOffenders.has(reviewer.id);
      const appDef = pick(APPS);
      const org = pick(ORGS);
      const drift = (48 - week) * 0.012; // quality improves slowly over time
      const badP = isRepeat ? 0.75 : 0.28 + drift;
      const roll = r();
      let j: J;
      if (roll < badP) {
        const key = org.region === "LATAM" && r() < 0.5 ? "R1" : pick(["R2", "R2", "R3", "R3", "R3", "R4", "R5", "R6"]);
        j = pick(BAD[key]);
      } else if (roll < badP + 0.1) {
        j = pick([...BAD.R10, ...BAD.R11]);
      } else j = pick(GOOD);

      const c: CaseRecord = {
        id: `JR-${week}-${String(i).padStart(3, "0")}`,
        signoffId: String(8_900_000 + Math.floor(r() * 150_000)),
        year: 2026,
        week,
        reviewDate: addDays(monday, -(6 + Math.floor(r() * 9))),
        reviewer,
        reviewerManager: managers[reviewerIdx % managers.length],
        managerOrDelegate: r() < 0.88 ? "Manager" : "Delegate",
        reviewType: pick(["Semi-annual", "Semi-annual", "Semi-annual", "Ad hoc", "Transfer"] as const),
        worker: pick(workers),
        app: appDef.app,
        appId: appDef.id,
        func: pick(appDef.funcs),
        entitlement: appDef.ent,
        environment: r() < 0.93 ? "PROD" : "UAT",
        ...org,
        template: j.template ?? pick(TEMPLATES),
        frequency: pick(FREQ),
        justRole: j.role,
        justProcess: j.process,
        justComm: j.comm,
        analyst: pick(ANALYSTS),
        stage: "to_assess",
        audit: [{ at: `${monday}T08:05:00`, actor: "Intake pipeline", action: `Imported from weekly sample W${week}` }],
      };
      const a = assess(c);
      c.audit.push({ at: `${monday}T08:05:01`, actor: "Rules engine", action: `Pre-screen: ${a.verdict.replace("_", " ")}`, detail: a.hardStops.map((h) => h.rule).join(", ") || undefined });

      const challenge = a.verdict === "hard_stop" ? r() > 0.07 : a.verdict === "review" ? r() < 0.3 : r() < 0.04;
      const sent = addDays(monday, 1);
      const due = addDays(sent, 7);
      const by = c.analyst;

      const close = (outcome: NonNullable<CaseRecord["outcome"]>, at: string, reason?: FailReason, excl?: ExclusionType) => {
        c.stage = "closed";
        c.outcome = outcome;
        c.closedAt = daysBetween(at, DEMO_TODAY) < 0 ? DEMO_TODAY : at;
        if (reason) c.failReason = reason;
        if (excl) c.exclusionType = excl;
        c.audit.push({ at: `${c.closedAt}T16:00:00`, actor: by, action: `Closed as ${outcome.toUpperCase()}`, detail: reason ? reason.replace("_", " ") : excl });
      };
      const doChallenge = () => {
        c.stage = "challenged";
        c.failedRules = a.hardStops.length ? Array.from(new Set(a.hardStops.map((h) => h.rule))) : a.negotiables.map((n) => n.rule);
        c.challengeSentAt = sent;
        c.challengeDue = due;
        c.audit.push({ at: `${sent}T10:00:00`, actor: by, action: "Challenge email sent", detail: `Due ${due}` });
        emails.push({ ...buildEmail(c, "challenge", `EM-${mailSeq++}`, `${sent}T09:30:00`), status: "sent", sentAt: `${sent}T10:00:00` });
      };
      const doEscalate = () => {
        const escSent = addDays(due, 1);
        c.stage = "escalated";
        c.escalationSentAt = escSent;
        c.escalationDue = addDays(escSent, 7);
        c.audit.push({ at: `${escSent}T10:00:00`, actor: by, action: "Escalated to reviewer's manager", detail: `Due ${c.escalationDue}` });
        emails.push({ ...buildEmail(c, "escalation", `EM-${mailSeq++}`, `${escSent}T09:30:00`), status: "sent", sentAt: `${escSent}T10:00:00` });
      };

      if (week <= 46) c.historicalChallenge = challenge;

      if (week === 48) {
        // current sample – waiting for assessment
      } else if (!challenge) {
        if (week === 47 && r() < 0.5) {
          /* still in queue */
        } else if (r() < 0.07) close("exclusion", addDays(monday, 2), undefined, pick(EXCLUSION_TYPES));
        else close("pass", addDays(monday, 2));
      } else {
        doChallenge();
        const x = r();
        if (week === 47) {
          // in flight, due today
        } else if (week === 46) {
          if (x < 0.4) doEscalate();
          else if (x < 0.65) {
            /* challenged and overdue – needs escalation */
          } else if (x < 0.88) close("pass", addDays(sent, 4 + Math.floor(r() * 3)));
          else close("fail", addDays(sent, 5), "revoked");
        } else if (week === 45 && x < 0.45) {
          doEscalate(); // escalation overdue – needs closure
        } else if (x < (isRepeat ? 0.35 : 0.68)) {
          close("pass", addDays(sent, 3 + Math.floor(r() * 4)));
        } else if (x < 0.9) {
          const reason: FailReason = pick(["no_action", "no_action", "insufficient", "insufficient", "revoked"] as const);
          if (reason !== "revoked") doEscalate();
          close("fail", reason === "revoked" ? addDays(sent, 5) : addDays(sent, 16), reason);
        } else {
          close("exclusion", addDays(sent, 4), undefined, pick(EXCLUSION_TYPES));
        }
      }
      cases.push(c);
    }
    const raw = count + Math.floor(r() * 4);
    imports.push({
      id: `IMP-${week}`,
      year: 2026,
      week,
      at: `${monday}T08:05:00`,
      rawRows: raw,
      duplicatesRemoved: raw - count,
      placeholdersCleaned: count * 3,
      countriesNormalized: Math.floor(count * (0.15 + r() * 0.2)),
      datesParsed: count,
      htmlStripped: Math.floor(count * 0.3),
      casesCreated: count,
    });
  }
  return { cases, emails, imports };
}
