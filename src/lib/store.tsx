"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { CaseRecord, EmailDraft, ExclusionType, FailReason, ImportRun } from "./types";
import { generateSeed, CURRENT_ANALYST } from "./seed";
import { buildEmail } from "./emails";
import { addDays, DEMO_TODAY, nowStamp } from "./dates";
import { DEFAULT_ACRONYMS } from "./rules";

const STORAGE_KEY = "erqa-workbench:v1";

export interface State {
  cases: CaseRecord[];
  emails: EmailDraft[];
  imports: ImportRun[];
  acronyms: string[];
}

type Action =
  | { type: "pass"; id: string; note?: string }
  | { type: "challenge"; id: string; rules: string[] }
  | { type: "exclude"; id: string; exclusionType: ExclusionType }
  | { type: "escalate"; id: string }
  | { type: "fail"; id: string; reason: FailReason }
  | { type: "revise"; id: string; justRole: string; justProcess: string; justComm: string }
  | { type: "sendEmails"; ids: string[] }
  | { type: "discardEmail"; id: string }
  | { type: "editEmail"; id: string; subject: string; body: string }
  | { type: "import"; run: ImportRun; cases: CaseRecord[] }
  | { type: "setAcronyms"; acronyms: string[] }
  | { type: "load"; state: State }
  | { type: "reset" };

export function initial(): State {
  const s = generateSeed();
  return { ...s, acronyms: DEFAULT_ACRONYMS };
}

const ME = `${CURRENT_ANALYST} (you)`;

function patch(state: State, id: string, fn: (c: CaseRecord) => CaseRecord): State {
  return { ...state, cases: state.cases.map((c) => (c.id === id ? fn(c) : c)) };
}
const log = (c: CaseRecord, action: string, detail?: string): CaseRecord => ({
  ...c,
  audit: [...c.audit, { at: nowStamp(), actor: ME, action, detail }],
});
let emailSeq = 0;
const newEmail = (c: CaseRecord, kind: EmailDraft["kind"]) => buildEmail(c, kind, `EM-N${Date.now()}-${emailSeq++}`, nowStamp());

export function reducer(state: State, a: Action): State {
  switch (a.type) {
    case "pass":
      return patch(state, a.id, (c) => log({ ...c, stage: "closed", outcome: "pass", closedAt: DEMO_TODAY }, "Closed as PASS", a.note));
    case "exclude":
      return patch(state, a.id, (c) => log({ ...c, stage: "closed", outcome: "exclusion", exclusionType: a.exclusionType, closedAt: DEMO_TODAY }, "Closed as EXCLUSION", a.exclusionType));
    case "challenge": {
      const c0 = state.cases.find((c) => c.id === a.id)!;
      const c1 = log({ ...c0, stage: "challenged", failedRules: a.rules, challengeSentAt: undefined, challengeDue: undefined }, "Challenge drafted", a.rules.join(", "));
      return { ...patch(state, a.id, () => c1), emails: [newEmail(c1, "challenge"), ...state.emails] };
    }
    case "escalate": {
      const c0 = state.cases.find((c) => c.id === a.id)!;
      const c1 = log({ ...c0, stage: "escalated", escalationSentAt: undefined, escalationDue: undefined }, "Escalation drafted");
      return { ...patch(state, a.id, () => c1), emails: [newEmail(c1, "escalation"), ...state.emails] };
    }
    case "fail": {
      const c0 = state.cases.find((c) => c.id === a.id)!;
      const c1 = log({ ...c0, stage: "closed", outcome: "fail", failReason: a.reason, closedAt: DEMO_TODAY }, "Closed as FAIL", a.reason.replace("_", " "));
      return { ...patch(state, a.id, () => c1), emails: [newEmail(c1, "outcome"), ...state.emails] };
    }
    case "revise":
      return patch(state, a.id, (c) => log({ ...c, justRole: a.justRole, justProcess: a.justProcess, justComm: a.justComm }, "Revised justification captured from EERS"));
    case "sendEmails": {
      const now = nowStamp();
      let next = state;
      const sentIds = new Set(a.ids);
      state.emails.filter((e) => sentIds.has(e.id) && e.status === "draft").forEach((e) => {
        next = patch(next, e.caseId, (c) => {
          if (e.kind === "challenge") return log({ ...c, challengeSentAt: DEMO_TODAY, challengeDue: addDays(DEMO_TODAY, 7) }, "Challenge email sent", `Due ${addDays(DEMO_TODAY, 7)}`);
          if (e.kind === "escalation") return log({ ...c, escalationSentAt: DEMO_TODAY, escalationDue: addDays(DEMO_TODAY, 7) }, "Escalation email sent", `Due ${addDays(DEMO_TODAY, 7)}`);
          return log(c, "Outcome email sent");
        });
      });
      return { ...next, emails: next.emails.map((e) => (sentIds.has(e.id) ? { ...e, status: "sent", sentAt: now } : e)) };
    }
    case "discardEmail": {
      const e = state.emails.find((x) => x.id === a.id);
      if (!e) return state;
      let next: State = { ...state, emails: state.emails.filter((x) => x.id !== a.id) };
      if (e.kind === "challenge") next = patch(next, e.caseId, (c) => log({ ...c, stage: "to_assess", failedRules: undefined }, "Challenge draft discarded"));
      if (e.kind === "escalation") next = patch(next, e.caseId, (c) => log({ ...c, stage: "challenged" }, "Escalation draft discarded"));
      return next;
    }
    case "editEmail":
      return { ...state, emails: state.emails.map((e) => (e.id === a.id ? { ...e, subject: a.subject, body: a.body } : e)) };
    case "import":
      return { ...state, cases: [...state.cases.filter((c) => c.week !== a.run.week), ...a.cases], imports: [...state.imports.filter((i) => i.week !== a.run.week), a.run] };
    case "setAcronyms":
      return { ...state, acronyms: a.acronyms };
    case "load":
      return a.state;
    case "reset":
      return initial();
  }
}

interface Ctx {
  state: State;
  dispatch: (a: Action) => void;
}
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "load", state: JSON.parse(raw) as State });
    } catch {
      /* storage unavailable – run in memory */
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
