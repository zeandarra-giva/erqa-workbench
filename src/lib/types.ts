// Domain model for the ERQA Case Workbench.
// Mirrors the 55-column ERQA SharePoint List, plus the structured fields the
// current list is missing (fail reason, sent dates, failed rules).

export type Stage = "to_assess" | "challenged" | "escalated" | "closed";
export type Outcome = "pass" | "fail" | "exclusion";
export type FailReason = "no_action" | "insufficient" | "revoked";
export type Verdict = "hard_stop" | "review" | "clear";
export type ReviewType = "Semi-annual" | "Ad hoc" | "Transfer";

export const EXCLUSION_TYPES = [
  "Entitlement not visible anymore",
  "Commonality is not low anymore",
] as const;
export type ExclusionType = (typeof EXCLUSION_TYPES)[number];

export interface Person {
  id: string; // synthetic employee id
  name: string; // fictional
}

export interface AuditEvent {
  at: string; // ISO timestamp
  actor: string;
  action: string;
  detail?: string;
}

export interface CaseRecord {
  id: string; // ERQA case id, e.g. JR-48-007
  signoffId: string;
  year: number;
  week: number;
  reviewDate: string; // ISO date of the EERS review

  reviewer: Person; // EERS reviewer (manager or delegate)
  reviewerManager: Person; // escalation target
  managerOrDelegate: "Manager" | "Delegate";
  reviewType: ReviewType;
  worker: Person;

  app: string;
  appId: string;
  func: string;
  entitlement: string;
  environment: "PROD" | "UAT";

  country: string;
  region: string;
  sector: string;
  segment: string;

  // Justification (the 5 fields managers fill in EERS)
  template: string; // "Reason this access is needed" dropdown
  frequency: string;
  justRole: string;
  justProcess: string;
  justComm: string;

  analyst: string;

  // Lifecycle
  stage: Stage;
  outcome?: Outcome;
  failReason?: FailReason;
  exclusionType?: ExclusionType;
  failedRules?: string[];
  challengeSentAt?: string;
  challengeDue?: string;
  escalationSentAt?: string;
  escalationDue?: string;
  closedAt?: string;

  /** Analyst's original challenge decision (history only) – used for back-testing. */
  historicalChallenge?: boolean;

  audit: AuditEvent[];
}

export type EmailKind = "challenge" | "escalation" | "outcome";

export interface EmailDraft {
  id: string;
  caseId: string;
  kind: EmailKind;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  createdAt: string;
  sentAt?: string;
}

export interface ImportRun {
  id: string;
  year: number;
  week: number;
  at: string;
  rawRows: number;
  duplicatesRemoved: number;
  placeholdersCleaned: number;
  countriesNormalized: number;
  datesParsed: number;
  htmlStripped: number;
  casesCreated: number;
}
