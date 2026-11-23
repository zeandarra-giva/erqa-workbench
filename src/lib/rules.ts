// ERQA justification pre-screen.
// Implements the ERQA Challenge Ruleset (Steps 0–4, Policy A/B, decision matrix R1–R13)
// as transparent, deterministic checks. It only SUGGESTS – the analyst decides.

export type RuleCategory = "hard_stop" | "negotiable" | "acceptable";
export type Field = "Role" | "Business Process" | "Low Commonality" | "All fields";

export interface RuleDef {
  id: string;
  step: number;
  title: string;
  condition: string;
  category: RuleCategory;
  reason: string;
  automation: "high" | "medium" | "human";
}

export const RULES: RuleDef[] = [
  { id: "R1", step: 0, title: "Non-English text", condition: "Justification is written in a non-English language (e.g., Spanish, Portuguese).", category: "hard_stop", reason: "Reviewers do not translate; English submission is mandatory for global auditability.", automation: "high" },
  { id: "R2", step: 1, title: "Generic business process", condition: "Business Process contains only generic filler (e.g., \"BAU\", \"daily responsibilities\", \"needed for job\").", category: "hard_stop", reason: "Fails to identify what concrete operational, technical, or regulatory work is performed.", automation: "high" },
  { id: "R3", step: 2, title: "No peer comparison", condition: "Low Commonality provides no peer comparison or states only \"small team\", \"only person who has it\", or \"everyone needs access\".", category: "hard_stop", reason: "Fails to substantiate why peers lack the entitlement or justify least privilege.", automation: "medium" },
  { id: "R4", step: 3, title: "Copy-paste non-answer", condition: "Low Commonality is an uninformative copy-paste of Business Process that ignores peer differentiation.", category: "hard_stop", reason: "Constitutes a non-response for the low commonality field.", automation: "high" },
  { id: "R5", step: 4, title: "Obscure role acronym", condition: "Role is an obscure, unexplained acronym with zero context provided across any field.", category: "hard_stop", reason: "Reviewer cannot ascertain the worker's legitimate business function.", automation: "medium" },
  { id: "R6", step: 4, title: "System name as role", condition: "Role lists an IT system or entitlement name instead of a human role (e.g., \"AD_Group_Member\").", category: "hard_stop", reason: "Confuses system access attributes with human organizational roles.", automation: "high" },
  { id: "R7", step: 1, title: "Specific business process", condition: "Business Process clearly states specific operational tasks, applications, or transactions in English.", category: "acceptable", reason: "Explains what business activity requires access.", automation: "medium" },
  { id: "R8", step: 2, title: "Valid peer difference", condition: "Low Commonality explains peer differentiation via specialization, backup, regional scope, or zero peers.", category: "acceptable", reason: "Substantiates why the entitlement is restricted.", automation: "medium" },
  { id: "R9", step: 4, title: "Clear role", condition: "Role is clear or uses standard industry acronyms (e.g., \"DBA\", \"VP\", \"AML Analyst\").", category: "acceptable", reason: "Job function is immediately understandable.", automation: "medium" },
  { id: "R10", step: 4, title: "Generic role, strong context", condition: "Role is generic (e.g., \"Contractor\", \"Analyst\") but Business Process & Low Commonality provide full detail.", category: "negotiable", reason: "Strong context compensates for broad title.", automation: "human" },
  { id: "R11", step: 4, title: "Internal acronym, clarified", condition: "An internal acronym appears in Role, but surrounding text clarifies what the person does.", category: "negotiable", reason: "Function can be determined from context.", automation: "human" },
  { id: "R12", step: 3, title: "Same text, answers both", condition: "Same text is used in both fields, but substantively answers both process and peer difference.", category: "negotiable", reason: "Dual-purpose statement fulfils both requirements.", automation: "human" },
  { id: "R13", step: 0, title: "Minor English issues", condition: "Minor grammatical, spelling, or regional English phrasing where business intent is clear.", category: "negotiable", reason: "Focus is on substance and clarity of intent.", automation: "human" },
];

export const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r])) as Record<string, RuleDef>;

export const STEPS = [
  { step: 0, title: "Language check" },
  { step: 1, title: "Business process" },
  { step: 2, title: "Low commonality" },
  { step: 3, title: "Copy-paste duplication" },
  { step: 4, title: "Role & acronym" },
];

export const DEFAULT_ACRONYMS = [
  "DBA", "VP", "AVP", "SVP", "MD", "AML", "KYC", "BA", "QA", "IT", "HR", "CFO", "COO", "CTO", "CIO", "CISO",
  "PM", "SME", "IAM", "SRE", "UAT", "ETL", "API", "GL", "AP", "AR", "FX", "OPS", "L1", "L2", "L3",
];

export interface Finding {
  rule: string;
  step: number;
  field: Field;
  category: RuleCategory;
  evidence: string;
  confidence: "high" | "medium";
}

export interface Assessment {
  verdict: "hard_stop" | "review" | "clear";
  findings: Finding[]; // all hard stops + negotiables + acceptables found
  hardStops: Finding[];
  negotiables: Finding[];
}

export interface JustificationInput {
  justRole: string;
  justProcess: string;
  justComm: string;
  app?: string;
  func?: string;
  entitlement?: string;
}

// ---------- text helpers ----------
const norm = (s: string) => (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
const tokens = (s: string) => norm(s).split(" ").filter(Boolean);

const EN_STOP = new Set("the a an and or of to for in on with is are be this that it as by from has have their they he she his her who which will can access needs need required work team".split(" "));
const ES_PT_STOP = new Set("el la los las de del y o para por en con es son un una su sus que al se lo le como más pero este esta esto ser tiene requiere acceso necesita trabajo equipo personal único unica único realizar gerente banquero também não são uma para com dos das pelo pela".split(" "));

const MEANINGLESS = new Set([...EN_STOP, "bau", "business", "usual", "daily", "responsibilities", "responsibility", "job", "requirement", "requirements", "needed", "work", "role", "function", "duties", "duty", "required", "hybrid", "worker", "for", "his", "her", "their", "carry", "out", "perform", "tasks", "task", "access", "needs", "need"]);

const GENERIC_BP = ["bau", "business as usual", "daily responsibilities", "daily work", "job requirement", "needed for work", "needed for job", "needed for daily work", "required for role", "required for job", "hybrid worker", "job function"];

const NON_EXPLANATIONS = ["small team", "only person who has it", "only person with", "everyone needs access", "everyone needs it", "everyone should have", "all team members need", "required for role", "needed for role"];

const PEER_SIGNALS = /\b(peer|peers|colleague|colleagues|direct reports?|other (team )?members|others in|no other|0 peers|zero peers|only one (on|in) (the|my) team|backup|back-up|covers?|coverage|out of office|ooo|leave|region|regional|specialist|speciali[sz]ed|speciali[sz]ation|dedicated|segregation|maker|checker|least privilege|assigned to support|unlike)\b/i;

const GENERIC_ROLES = ["contractor", "analyst", "employee", "staff", "consultant", "associate", "user", "fte", "worker", "team member", "support"];

export function looksNonEnglish(text: string): { nonEnglish: boolean; sample: string } {
  const t = tokens(text);
  if (t.length < 3) return { nonEnglish: false, sample: "" };
  let es = 0;
  let en = 0;
  const hits: string[] = [];
  for (const w of t) {
    if (ES_PT_STOP.has(w) && !EN_STOP.has(w)) {
      es++;
      if (hits.length < 4) hits.push(w);
    } else if (EN_STOP.has(w)) en++;
  }
  const accents = (text.match(/[ñáéíóúãõç]/gi) || []).length;
  const score = es + accents * 0.5;
  return { nonEnglish: score >= 2 && score > en, sample: hits.join(", ") };
}

function meaningfulWords(text: string): string[] {
  return tokens(text).filter((w) => !MEANINGLESS.has(w) && w.length > 2);
}

export function similarity(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  let inter = 0;
  A.forEach((x) => B.has(x) && inter++);
  return inter / (A.size + B.size - inter);
}

function acronymsIn(text: string): string[] {
  return Array.from(new Set((text || "").match(/\b[A-Z][A-Z0-9&]{1,6}\b/g) || []));
}

function quote(s: string, max = 70) {
  const t = (s || "").trim();
  return t.length > max ? `"${t.slice(0, max)}…"` : `"${t}"`;
}

// ---------- the assessment ----------
export function assess(input: JustificationInput, acronymAllowlist: string[] = DEFAULT_ACRONYMS): Assessment {
  const f: Finding[] = [];
  const { justRole: role = "", justProcess: bp = "", justComm: lc = "" } = input;
  const allow = new Set(acronymAllowlist.map((a) => a.toUpperCase()));

  // Step 0 – language
  const lang = looksNonEnglish(`${role} ${bp} ${lc}`);
  if (lang.nonEnglish) {
    f.push({ rule: "R1", step: 0, field: "All fields", category: "hard_stop", confidence: "high", evidence: `Non-English words detected (${lang.sample}). Reviewers do not translate.` });
  }

  // Step 1 – business process
  const bpNorm = norm(bp);
  const bpMeaning = meaningfulWords(bp);
  const genericHit = GENERIC_BP.find((g) => bpNorm.includes(g));
  if (!bpNorm) {
    f.push({ rule: "R2", step: 1, field: "Business Process", category: "hard_stop", confidence: "high", evidence: "Business Process is blank." });
  } else if (bpMeaning.length < 3) {
    f.push({ rule: "R2", step: 1, field: "Business Process", category: "hard_stop", confidence: genericHit ? "high" : "medium", evidence: `${quote(bp)} contains only generic filler${genericHit ? ` ("${genericHit}")` : ""}; no concrete activity described.` });
  } else if (!lang.nonEnglish) {
    f.push({ rule: "R7", step: 1, field: "Business Process", category: "acceptable", confidence: "medium", evidence: `Describes specific activity (${bpMeaning.slice(0, 4).join(", ")}…).` });
  }

  // Step 2 – low commonality
  const lcNorm = norm(lc);
  const nonExp = NON_EXPLANATIONS.find((p) => lcNorm.includes(p));
  const hasPeerSignal = PEER_SIGNALS.test(lc);
  const sim = similarity(bp, lc);
  const isCopy = sim >= 0.8;
  if (!lcNorm) {
    f.push({ rule: "R3", step: 2, field: "Low Commonality", category: "hard_stop", confidence: "high", evidence: "Low Commonality is blank – no peer comparison." });
  } else if (!isCopy) {
    if (nonExp && !hasPeerSignal) {
      f.push({ rule: "R3", step: 2, field: "Low Commonality", category: "hard_stop", confidence: "high", evidence: `States only "${nonExp}" – no explanation of why peers lack it.` });
    } else if (!hasPeerSignal || meaningfulWords(lc).length < 3) {
      f.push({ rule: "R3", step: 2, field: "Low Commonality", category: "hard_stop", confidence: "medium", evidence: `${quote(lc)} gives no peer comparison (no mention of peers, backup, region, specialization or segregation of duties).` });
    } else {
      f.push({ rule: "R8", step: 2, field: "Low Commonality", category: "acceptable", confidence: "medium", evidence: `Cites a peer difference (${(lc.match(PEER_SIGNALS) || [""])[0]}).` });
    }
  }

  // Step 3 – copy-paste
  if (isCopy && lcNorm) {
    if (hasPeerSignal && meaningfulWords(lc).length >= 6) {
      f.push({ rule: "R12", step: 3, field: "Low Commonality", category: "negotiable", confidence: "medium", evidence: `Low Commonality repeats Business Process (${Math.round(sim * 100)}% match) but appears to address peers. Analyst discretion.` });
    } else {
      f.push({ rule: "R4", step: 3, field: "Low Commonality", category: "hard_stop", confidence: "high", evidence: `Low Commonality is a ${Math.round(sim * 100)}% copy of Business Process and does not explain peer differences.` });
    }
  }

  // Step 4 – role & acronym
  const roleTrim = role.trim();
  const roleNorm = norm(role);
  const sysName =
    /[_\\/]|\b(group|portal|ad group|entitlement|server|admin access|role access)\b/i.test(roleTrim) ||
    (!!input.app && roleNorm.length > 3 && norm(input.app).includes(roleNorm)) ||
    (!!input.func && roleNorm.length > 3 && norm(input.func) === roleNorm);
  const roleAcr = acronymsIn(roleTrim);
  const roleWordsNoAcr = roleTrim.replace(/\b[A-Z][A-Z0-9&]{1,6}\b/g, "").replace(/[^A-Za-z]/g, "");
  const unknownAcr = roleAcr.filter((a) => !allow.has(a));
  const contextStrong = bpMeaning.length >= 6 && hasPeerSignal;

  if (!roleNorm) {
    f.push({ rule: "R5", step: 4, field: "Role", category: "hard_stop", confidence: "high", evidence: "Role is blank." });
  } else if (sysName) {
    f.push({ rule: "R6", step: 4, field: "Role", category: "hard_stop", confidence: "high", evidence: `${quote(roleTrim)} looks like a system, group or entitlement name, not a job role.` });
  } else if (unknownAcr.length && roleWordsNoAcr.length < 3) {
    // role is essentially a standalone acronym
    if (contextStrong) {
      f.push({ rule: "R11", step: 4, field: "Role", category: "negotiable", confidence: "medium", evidence: `Role ${quote(roleTrim)} is an internal acronym (${unknownAcr.join(", ")}) but other fields give context. Analyst discretion.` });
    } else {
      f.push({ rule: "R5", step: 4, field: "Role", category: "hard_stop", confidence: "medium", evidence: `Role ${quote(roleTrim)} is an unexplained acronym (${unknownAcr.join(", ")}) with little context elsewhere.` });
    }
  } else if (GENERIC_ROLES.includes(roleNorm)) {
    f.push({ rule: "R10", step: 4, field: "Role", category: "negotiable", confidence: "high", evidence: `Role ${quote(roleTrim)} is generic${contextStrong ? "; other fields give strong context" : ""}. Analyst discretion.` });
  } else {
    f.push({ rule: "R9", step: 4, field: "Role", category: "acceptable", confidence: "medium", evidence: `Role ${quote(roleTrim)} reads as a job function.` });
  }

  const hardStops = f.filter((x) => x.category === "hard_stop");
  const negotiables = f.filter((x) => x.category === "negotiable");
  return {
    verdict: hardStops.length ? "hard_stop" : negotiables.length ? "review" : "clear",
    findings: f.sort((a, b) => a.step - b.step),
    hardStops,
    negotiables,
  };
}
