// Intake pipeline: replaces ".txt on shared drive → MS Access queries → manual upload".
// Cleans the raw weekly extract and creates cases. Runs entirely in the browser.

import type { CaseRecord, ImportRun } from "./types";
import { assess } from "./rules";
import { isoWeekStart, isoDate, nowStamp } from "./dates";
import { rng } from "./seed";

export type RawRow = Record<string, string>;

export const COUNTRY_MAP: Record<string, string> = {
  usa: "United States", us: "United States", "u.s.": "United States", "united states": "United States", "united states of america": "United States",
  mex: "Mexico", mexico: "Mexico", "méxico": "Mexico",
  ind: "India", india: "India",
  uk: "United Kingdom", gbr: "United Kingdom", "united kingdom": "United Kingdom", "great britain": "United Kingdom",
  bra: "Brazil", brazil: "Brazil", brasil: "Brazil",
  sgp: "Singapore", singapore: "Singapore",
  pol: "Poland", poland: "Poland",
  phl: "Philippines", philippines: "Philippines",
};

const PLACEHOLDERS = new Set(["- select -", "-select-", "select", "n/a", "na", "null", "#n/a"]);

export interface IntakeIssue {
  row: number;
  signoffId: string;
  type: "duplicate" | "placeholder" | "country" | "date" | "html" | "missing";
  detail: string;
}

export interface IntakeResult {
  run: ImportRun;
  cases: CaseRecord[];
  issues: IntakeIssue[];
}

function parseDate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); // 2026-11-20 00:00:00.0000000
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // 11/20/2026
  if (m) return isoDate(new Date(+m[3], +m[1] - 1, +m[2]));
  return null;
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/\{\{[^}]*\}\}/g, " ").replace(/\s+/g, " ").trim();

/** Build a realistic, deliberately messy raw extract for the next weekly drop (synthetic). */
export function generateRawDrop(existing: CaseRecord[], week: number): RawRow[] {
  const r = rng(9000 + week);
  const pool = existing.filter((c) => c.week >= 44);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const countryVariants: Record<string, string[]> = {
    "United States": ["USA", "United States", "US"],
    Mexico: ["MEX", "Mexico", "México"],
    India: ["IND", "India"],
    "United Kingdom": ["UK", "United Kingdom", "GBR"],
    Brazil: ["BRA", "Brasil"],
  };
  const rows: RawRow[] = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const src = pick(pool);
    const donor = pick(pool); // mix justifications across rows
    const d = isoWeekStart(2026, week);
    rows.push({
      "Signoff ID": String(9_100_000 + Math.floor(r() * 90_000)),
      "EERS Reviewer": src.reviewer.name,
      "Reviewer SOEID": src.reviewer.id,
      "Reviewer Manager": src.reviewerManager.name,
      "Reviewer Manager SOEID": src.reviewerManager.id,
      "Manager or Delegate": src.managerOrDelegate,
      "Review Type": r() < 0.4 ? "" : src.reviewType,
      Worker: src.worker.name,
      "Worker SOEID": src.worker.id,
      "App Name": src.app,
      "App ID": src.appId,
      Function: src.func,
      Entitlement: r() < 0.35 ? `For full details, <a href="https://intranet.example/ent?id=${src.appId}">click here</a> ${src.entitlement}` : src.entitlement,
      Environment: src.environment,
      "SOA Country": pick(countryVariants[src.country] ?? [src.country]),
      "SOA Region": src.region,
      "SOA Sector": src.sector,
      "Managed Segment": src.segment,
      "Template Name": donor.template,
      FREQUENCY: donor.frequency,
      JUST_ROLE: donor.justRole,
      JUST_PROCESS: donor.justProcess,
      JUST_COMM: donor.justComm,
      "Date of EERS Review": r() < 0.6 ? `${src.reviewDate.slice(0, 4)}-11-${String(16 + (i % 6)).padStart(2, "0")} 00:00:00.0000000` : `11/${16 + (i % 6)}/2026`,
      "IAM Revocation": "- Select -",
      Escalation: "- Select -",
      "Def revo verified": "- Select -",
      _monday: d,
    });
  }
  // duplicates the MS Access step used to remove
  rows.push({ ...rows[2] });
  rows.push({ ...rows[7] });
  return rows;
}

export function runIntake(raw: RawRow[], week: number, existing: CaseRecord[], analysts: string[]): IntakeResult {
  const issues: IntakeIssue[] = [];
  const seen = new Set(existing.map((c) => c.signoffId));
  const stats = { placeholders: 0, countries: 0, dates: 0, html: 0, dups: 0 };
  const cases: CaseRecord[] = [];
  const at = nowStamp();
  const monday = isoWeekStart(2026, week);

  raw.forEach((row, idx) => {
    const sid = (row["Signoff ID"] || "").trim();
    if (seen.has(sid)) {
      stats.dups++;
      issues.push({ row: idx + 1, signoffId: sid, type: "duplicate", detail: "Duplicate sign-off ID removed" });
      return;
    }
    seen.add(sid);

    const clean: RawRow = {};
    for (const [k, v] of Object.entries(row)) {
      const t = (v ?? "").trim();
      if (PLACEHOLDERS.has(t.toLowerCase())) {
        clean[k] = "";
        stats.placeholders++;
      } else clean[k] = t;
    }
    const rawCountry = clean["SOA Country"];
    const country = COUNTRY_MAP[rawCountry.toLowerCase()] ?? rawCountry;
    if (country !== rawCountry) {
      stats.countries++;
      issues.push({ row: idx + 1, signoffId: sid, type: "country", detail: `"${rawCountry}" → "${country}"` });
    }
    const date = parseDate(clean["Date of EERS Review"]);
    if (date) stats.dates++;
    else issues.push({ row: idx + 1, signoffId: sid, type: "date", detail: `Unparseable date "${clean["Date of EERS Review"]}"` });
    let ent = clean["Entitlement"];
    if (/<[^>]+>/.test(ent)) {
      ent = stripHtml(ent);
      stats.html++;
      issues.push({ row: idx + 1, signoffId: sid, type: "html", detail: "HTML stripped from entitlement description" });
    }
    if (!clean["Review Type"]) issues.push({ row: idx + 1, signoffId: sid, type: "missing", detail: "Review Type is empty – flagged for data owner" });

    const c: CaseRecord = {
      id: `JR-${week}-${String(cases.length + 1).padStart(3, "0")}`,
      signoffId: sid,
      year: 2026,
      week,
      reviewDate: date ?? monday,
      reviewer: { id: clean["Reviewer SOEID"], name: clean["EERS Reviewer"] },
      reviewerManager: { id: clean["Reviewer Manager SOEID"], name: clean["Reviewer Manager"] },
      managerOrDelegate: clean["Manager or Delegate"] === "Delegate" ? "Delegate" : "Manager",
      reviewType: (clean["Review Type"] || "Semi-annual") as CaseRecord["reviewType"],
      worker: { id: clean["Worker SOEID"], name: clean["Worker"] },
      app: clean["App Name"],
      appId: clean["App ID"],
      func: clean["Function"],
      entitlement: ent,
      environment: clean["Environment"] === "UAT" ? "UAT" : "PROD",
      country,
      region: clean["SOA Region"],
      sector: clean["SOA Sector"],
      segment: clean["Managed Segment"],
      template: clean["Template Name"],
      frequency: clean["FREQUENCY"],
      justRole: clean["JUST_ROLE"],
      justProcess: clean["JUST_PROCESS"],
      justComm: clean["JUST_COMM"],
      analyst: analysts[cases.length % analysts.length],
      stage: "to_assess",
      audit: [{ at, actor: "Intake pipeline", action: `Imported from weekly sample W${week}` }],
    };
    const a = assess(c);
    c.audit.push({ at, actor: "Rules engine", action: `Pre-screen: ${a.verdict.replace("_", " ")}`, detail: a.hardStops.map((h) => h.rule).join(", ") || undefined });
    cases.push(c);
  });

  return {
    cases,
    issues,
    run: {
      id: `IMP-${week}`,
      year: 2026,
      week,
      at,
      rawRows: raw.length,
      duplicatesRemoved: stats.dups,
      placeholdersCleaned: stats.placeholders,
      countriesNormalized: stats.countries,
      datesParsed: stats.dates,
      htmlStripped: stats.html,
      casesCreated: cases.length,
    },
  };
}
