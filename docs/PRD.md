---
tags:
  - erqa
  - prd
  - project
created: 2026-11-23
updated: 2026-11-23
status: "draft v0.1"
owner: "Project owner"
---

# ERQA Case Workbench: Product Requirements Document

> [!info] Document status
> **Draft v0.1, 2026-11-23.** Discovery phase. Compiled from every note in `1) Planning`. Sections marked **TBD** are waiting on stakeholder input (mainly [[ERQA Constraints Register]] and the baseline timings).
> Source tags used here: `[Hub]` [[ERQA Project Hub]] · `[Workflow]` [[ERQA Current Workflow]] · `[Map]` [[ERQA Process Map V2]] · `[Guide]` [[ERQA Justification Guide Summary]] · `[Ruleset]` [[ERQA Challenge Ruleset]] · `[Dict]` [[ERQA Data Dictionary]] · `[Data]` [[ERQA Dataset Profile]] · `[Hyp]` [[ERQA Opportunity Hypotheses]] · `[Options]` [[ERQA Solution Options]] · `[Tracker]` [[ERQA Context Tracker]]

> [!warning] Data handling rule
> No real customer, employee or account data, and no analyst names, goes into this document, prompts or prototypes. Schema-only or synthetic data only. `[Hub]`

---

## 1. Executive Summary

### 1.1 The team
**ERQA (Entitlement Review Quality Assurance)** is a team within Entitlements Governance. It checks the quality of manager-performed entitlement reviews in **EERS** (Enterprise Entitlement Review System). When a manager approves high-risk, low-commonality access, they must write a justification. Each week, the MSaaS team samples signed-off reviews, and ERQA analysts assess whether each justification meets the criteria. `[Guide] [Workflow]`

### 1.2 The problem
The workflow is **manual, spread across five or more tools, and dominated by challenges**:
- **Intake is manual every week:** .txt on a shared drive → MS Access → dedupe/enrich queries → bulk upload to a SharePoint List. `[Workflow]`
- **Challenges are frequent but rarely end in a fail.** 2,446 of 4,372 cases (**55.9%**) were challenged, but only 417 (**9.5%** of all cases) failed. About **83% of challenges end as a pass or exclusion**, because the manager fixes the justification. `[Data]`
- **The cost is in the chase loop, not the challenge decision:** batch emails sent by hand from a shared mailbox (a stated pain point), two 7-day deadlines tracked by hand, and repeated rechecks in EERS. `[Workflow] [Hyp H9]`
- **HR and training routing is unreliable.** The historical training (358) and HR (50) counts **can't both be true** under the official Phase 3 rules (solving them gives −9 No-Action fails). There's no failure-reason column, and the "3 fails in 12 months" check is a manual lookup. `[Map] [Dict]`
- **The data is messy:** 118 country variants, HTML in entitlement text, "- Select -" placeholders, dates stored as text, and an empty Review Type column. `[Data] [Dict]`
- **Insight is limited.** Nothing records *which* criteria failed, or when challenges and escalations were sent (only due dates). The fail-rate drop from 13.0% (2025) to 6.7% (2026) can't be explained. `[Dict] [Hyp H3]`

### 1.3 The proposal
Build the **ERQA Case Workbench**: one place for the weekly justification review, from intake to HR and training reporting. It covers Phases 2–3 of the official process map and builds in a **rules-based pre-screen** taken from the analysts' own challenge ruleset. `[Hub]`

The project owner's goal: **fewer tools, less manual work, more insight.** `[Hub]`

Likely MVP, in priority order `[Hyp]`:
1. **Intake pipeline** (H10): one step replaces .txt → Access → SharePoint, with dedupe, cleaning and a row-count audit log.
2. **Chase-loop automation** (H9): case tracker with deadlines, templated challenge and escalation emails (the analyst approves before sending), day-7 queues.
3. **Phase 3 routing** (H12): automatic classification of fails, 12-month fail lookup, weekly HR and monthly LMS reports with a routing log.
4. **Rule pre-screen** (H8): Hard Stop / Negotiable / No-issue flags with evidence. **The analyst always decides.**
5. **Better data model** (H13): failure reason, sent dates, failed criteria, computed fail count.

### 1.4 Guiding principles
Recommend, don't decide · Explainable first (rules before ML) · Data stays inside the bank · Audit by default · Smallest approvable footprint. `[Options]`

### 1.5 Status and next step
- A **concept prototype** (Next.js, synthetic data) is built at `~/Desktop/erqa-workbench`, with 16 unit tests checking the engine against the ruleset's own examples. `[Hub]`
- Discovery readout at **Biweekly 01 (2026-11-24)**. `[Hub]`
- **Blocking inputs:** compliance and tooling constraints, baseline timings and volumes, sponsor, and whether the ruleset is official. See §14.

---

## 2. Background & Context

### 2.1 Roles `[Workflow] [Map]`
| Role | Who | Relationship to the product |
| --- | --- | --- |
| EERS Reviewer | Manager **or delegate** who certifies their team's access and writes justifications | Receives challenge emails; never uses the Workbench |
| Worker | Team member who holds the access | Affected by revocation |
| Reviewer's manager | CC'd on the challenge; target of the escalation | Receives escalation emails |
| **ERQA Analyst** | Assesses, challenges, decides pass/fail | **Primary user** |
| ERQA Lead | Oversees backlog, SLA, quality | Primary user (dashboard, reports) |
| MSaaS team | Generates the weekly sample | Upstream data provider |
| HR | Receives accountability reports | Downstream consumer |
| LMS / Training | Enrols fails in remedial training | Downstream consumer |
| Governance / Audit | Reviews evidence and metrics | Secondary consumer |

### 2.2 When a justification is required `[Guide]`
- Only for access that is **high-risk AND low-commonality**.
  - Low commonality = fewer than 25% of the reviewer's direct reports have it.
  - High risk = based on the activities the access allows plus EERS attribute codes (e.g., privileged, external, money transfer), not the IS risk rating.
- Review types in scope: semi-annual, transfer, ad hoc.

### 2.3 Justification fields `[Guide] [Dict]`
| Guide field | Column | Input |
| --- | --- | --- |
| Reason this access is needed | `Template Name` (AF) | Dropdown |
| Frequency of use | `FREQUENCY` (AQ) | Dropdown |
| Worker's role | `JUST_ROLE` (AO) | Free text |
| Business process | `JUST_PROCESS` (AP) | Free text |
| Reason for low commonality | `JUST_COMM` (AR) | Free text |

The value "Access is required for their job function" (96% of rows) is the **dropdown**, so the useful signal is in the three free-text fields. `[Dict]`

---

## 3. Current State (As-Is)

### 3.1 End-to-end process `[Workflow] [Map]`
1. **Phase 1, Primary review:** the reviewer approves or revokes access in EERS and justifies high-risk, low-commonality approvals, then signs off.
2. MSaaS generates a **weekly sample** from the EERS database → .txt on the ERQA shared drive.
3. ERQA loads it into **MS Access**, runs dedupe and enrichment queries, and bulk-uploads to the **ERQA SharePoint List** (the system of record).
4. **Phase 2, Challenge & escalation:**
   - Meets criteria → **PASS**.
   - Doesn't meet → challenge email to the reviewer (CC their manager), **7 calendar days**.
   - No action, or the revised justification fails → **escalate** to the reviewer's manager, **7 more days**.
   - Revoked after a challenge or after escalation → **FAIL** (confirmed by the project owner, 2026-11-23).
   - After escalation: no action → FAIL · revised justification fails → FAIL · passes → PASS.
5. Evidence saved to the shared drive; status updated in the SharePoint List.
6. **Phase 3, HR reporting** (routing table in §8.2): monthly LMS report and/or weekly HR report.
7. **Phase 4 (unclear):** "IAM & Deferred Revocations" is drawn as a dashed, unconnected box. The guide's "last attempt, then revoke" step may belong here.

### 3.2 Manual touchpoints `[Workflow]`
| # | Step | Tools | Workbench module |
| --- | --- | --- | --- |
| M1–M3 | Load .txt, run Access queries, upload to SharePoint | Shared drive, MS Access, SharePoint | Intake (§7.1) |
| M4 | Assess each justification | EERS, SharePoint | Pre-screen + Queue (§7.2) |
| M5 | Write and send challenge emails in batches (**pain point**) | Outlook shared mailbox | Outbox (§7.3) |
| M6 | Track 7-day deadlines | Unknown | Challenge Board (§7.3) |
| M7 | Recheck EERS for corrections | EERS | Challenge Board (§7.3) |
| M8 | Send escalation emails | Outlook | Outbox (§7.3) |
| M9 | Decide outcome, save evidence, update status | Shared drive, SharePoint | Case detail (§7.4) |
| M10 | Weekly HR failure report | SNOW (ServiceNow?) / email | Reports (§7.5) |
| M10b | 3×-in-12-months history check | Unknown | Routing (§7.5) |
| M10c | Monthly LMS training report | Unknown | Reports (§7.5) |
| M11 | Last attempt, then revoke | EERS? | Out of MVP scope (§6.2) |

### 3.3 Baseline data `[Data]`
| Metric | Value |
| --- | --- |
| Cases (all) | 4,372 (55 columns) |
| Outcomes | Pass 3,276 (74.9%) · Fail 417 (9.5%) · Exclusion 679 (15.5%) |
| Challenged | 2,446 (55.9%). All 417 fails were challenged. |
| Challenge yield (fails ÷ challenges) | ≈ 17% |
| Fails → training / HR | 358 (85.9%) / 50 (12.0%) |
| Fail rate by year | 2025: 13.0% (255/1,960) · 2026: 6.7% (162/2,412) |
| Template concentration | One dropdown value = 4,179 rows (≈96%) |
| Analyst concentration | Three analysts carry most of the volume |

---

## 4. Goals, Non-Goals & Success Metrics

### 4.1 Goals `[Hub]`
- **G0** Fewer tools, less manual work, more insight (the project owner's stated goal).
- **G1** Cut analyst time on the challenge chase loop, especially challenges that end as pass or exclusion.
- **G2** Make backlog, SLA and overdue status visible without manual consolidation.
- **G3** Produce audit-ready, explainable QA metrics (trend, root cause, hotspots).
- **G4** Standardize data quality (country, org fields) automatically.
- **G5** Route every fail correctly and traceably to HR and/or training.

### 4.2 Non-goals
- Changing MSaaS sampling criteria (fixed by the bank). `[Hyp H1]`
- Automating the final QA decision. The system recommends; the analyst decides. `[Options]`
- Replacing EERS, or writing back into EERS.
- Any external cloud, SaaS or AI service unless explicitly approved.
- Executing revocations (Phase 4) in the MVP.

### 4.3 Success metrics (targets TBD once the baseline is measured)
| KPI | Baseline | Target | Source |
| --- | --- | --- | --- |
| Analyst minutes per case (assess / email / recheck) | TBD (shadow an analyst) | TBD | `[Tracker]` |
| Weekly intake effort (M1–M3) | TBD | Near zero (one step) | H10 |
| Missed or late 7-day deadlines | Not measured today | 0 | H9 |
| HR/training routing consistency | Inconsistent (−9 reconciliation) | 100% routed with a log entry | H12 |
| Pre-screen agreement with past analyst `Challenge` decisions | — | Report precision/recall in back-test | H8 |
| Tools touched per weekly cycle | 5+ (shared drive, Access, SharePoint, Outlook, EERS, SNOW) | TBD | G0 |
| Country values normalized | 118 variants | 100% mapped to ISO | H5 |

### 4.4 Definition of done `[Hub]`
- [ ] Baseline metrics agreed (minutes per case, backlog, SLA breach rate)
- [ ] Solution approved by the relevant control owners (InfoSec, IT, others)
- [ ] Pilot run on one review cycle with measured before/after
- [ ] Runbook and handoff to the ERQA team

---

## 5. Users & Key User Stories
| ID | As a… | I want to… | So that… |
| --- | --- | --- | --- |
| US1 | Analyst | load the weekly sample in one step | I stop doing the .txt → Access → SharePoint routine |
| US2 | Analyst | see pre-screen flags with the exact evidence | I assess faster and more consistently |
| US3 | Analyst | review and approve drafted challenge emails as one batch | I stop writing emails by hand |
| US4 | Analyst | see which cases are due, overdue or waiting on me | no 7-day deadline is missed |
| US5 | Analyst | record the outcome and failure reason in one place | routing and reporting are automatic |
| US6 | Lead | see backlog, SLA and outcome trends | I can manage workload and report upward |
| US7 | Lead / HR | get the weekly HR and monthly LMS reports generated | routing follows Phase 3 rules every time |
| US8 | Auditor | see why each flag, decision and routing happened | the process is explainable and evidenced |

---

## 6. Scope

### 6.1 MVP (in scope)
Intake pipeline · Assessment queue with rules pre-screen · Challenge/escalation tracker · Outbox (templated emails, analyst-approved) · Case detail with outcome and failure reason · Phase 3 routing and reports · Overview dashboard · Audit log.

### 6.2 Later / out of MVP
- Phase 4 IAM & deferred revocations tracking (H6), pending detail on that stage.
- Risk-based focus on likely failures (H1, Triage Scorer).
- Internal AI assist with Stylus: summarize responses, draft emails (H11, Tier D).
- Workload / key-person view (H7).
- Statistical triage model (Tier C).

---

## 7. Functional Requirements
Priority: **P0** = MVP must-have · **P1** = MVP should-have · **P2** = later.

### 7.1 Intake (replaces M1–M3) · H10, H5
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-IN-1 | Import the weekly MSaaS .txt extract | P0 |
| FR-IN-2 | Deduplicate (keys TBD: what the Access queries do today) and enrich fields | P0 |
| FR-IN-3 | Normalize country to ISO codes using a maintained mapping table | P0 |
| FR-IN-4 | Flag org-field anomalies (long free text, HTML) and strip HTML from Entitlement | P1 |
| FR-IN-5 | Treat "- Select -" as null; parse text dates to real dates | P0 |
| FR-IN-6 | Log row counts in / deduped / loaded per batch for audit | P0 |
| FR-IN-7 | Tag every case with sample Year + Week | P0 |

### 7.2 Assessment Queue & Pre-screen (M4) · H8
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-PS-1 | Run the ruleset (§8.1) on JUST_ROLE, JUST_PROCESS, JUST_COMM for every case | P0 |
| FR-PS-2 | Output per case: 🔴 Hard Stop (suggest Challenge = Yes) · 🟡 Negotiable (analyst decides) · 🟢 No issues (suggest Challenge = No) | P0 |
| FR-PS-3 | Show the rule ID and evidence for every flag (matched phrase, similarity %) | P0 |
| FR-PS-4 | Report **all** triggered rules, not just the first Hard Stop, so one challenge email lists every issue | P0 |
| FR-PS-5 | Analyst confirms or overrides each suggestion; overrides are logged with a reason | P0 |
| FR-PS-6 | Maintain a standard-acronym allowlist (R5, R9) | P1 |
| FR-PS-7 | Cross-check JUST_ROLE against App Name / Function / Entitlement (R6) | P1 |
| FR-PS-8 | Back-test screen: compare engine output with historical `Challenge` values | P1 |

### 7.3 Challenge, Escalation & Outbox (M5–M8) · H9
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-CH-1 | Case lifecycle states: Sampled → Assessed → Challenged → Escalated → Pass / Fail (state diagram in [[ERQA Current Workflow]]) | P0 |
| FR-CH-2 | Generate challenge emails from templates, filled in with the triggered rule reasons; reviewer as To, their manager as CC | P0 |
| FR-CH-3 | Generate escalation emails to the reviewer's manager | P0 |
| FR-CH-4 | Analyst reviews and approves a batch before anything is sent; record **sent dates** | P0 |
| FR-CH-5 | Compute due dates (sent + 7 calendar days) and show due-soon / overdue queues | P0 |
| FR-CH-6 | Board view of open challenges and escalations by stage and due date | P0 |
| FR-CH-7 | Record the reviewer's response: no action / revoked / revised justification (re-run the pre-screen on the revision) | P0 |
| FR-CH-8 | Send directly from the shared mailbox (depends on tooling approval) | P2 |

### 7.4 Outcome & Case Record (M9) · H13
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-OC-1 | Apply the Phase 2 outcome rules (revoked at any stage = FAIL; escalation no action = FAIL; etc.) | P0 |
| FR-OC-2 | Store a structured **failure reason**: No Action / Action insufficient / Revoked | P0 |
| FR-OC-3 | Store the **failed criteria** (rule IDs) per case | P0 |
| FR-OC-4 | Support exclusions with type ("Entitlement not visible anymore", "Commonality is not low anymore") | P0 |
| FR-OC-5 | Link evidence (shared-drive location or attachment) to the case | P1 |
| FR-OC-6 | Keep Status (lifecycle) separate from Result (outcome) | P0 |

### 7.5 Phase 3 Routing & Reports (M10–M10c) · H12
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-RT-1 | On FAIL, route per §8.2 automatically | P0 |
| FR-RT-2 | Compute each reviewer's fail count over a rolling 12 months (by reviewer ID) | P0 |
| FR-RT-3 | Generate the **weekly HR accountability report** | P0 |
| FR-RT-4 | Generate the **monthly LMS remedial-training report** | P0 |
| FR-RT-5 | Write a routing log entry per fail (rule applied, inputs, outputs) | P0 |
| FR-RT-6 | Report formats match what HR / LMS accept today (TBD) | P1 |

### 7.6 Overview Dashboard & Insight · H3, H4, H6
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-DB-1 | Backlog, due-soon, overdue counts | P0 |
| FR-DB-2 | Pass / Fail / Exclusion and challenge yield, by week and year | P1 |
| FR-DB-3 | Fail rate shown next to challenge rate and sample size (honest trend) | P1 |
| FR-DB-4 | Top failed rules, hotspots by app / segment / region (normalized) | P1 |
| FR-DB-5 | Remediation follow-through (Fail → reported → retained / revoked) | P2 |
| FR-DB-6 | Workload by analyst | P2 |

### 7.7 Ruleset Management
| ID | Requirement | Priority |
| --- | --- | --- |
| FR-RS-1 | Read-only view of every rule, its category and reason | P0 |
| FR-RS-2 | Versioned phrase lists and acronym allowlist, with change history | P1 |

---

## 8. Business Rules

### 8.1 Challenge ruleset (pre-screen spec) `[Ruleset]`
Evaluated in order: **Step 0 Language → 1 Business Process → 2 Low Commonality → 3 Copy-paste → 4 Role & Acronym.**

| Rule | Condition | Outcome | Category | Automation confidence |
| --- | --- | --- | --- | --- |
| R1 | Non-English justification | Challenge | Hard Stop | 🟢 High |
| R2 | Business Process is only generic filler ("BAU", "daily responsibilities") | Challenge | Hard Stop | 🟢 High / 🟡 borderline |
| R3 | Low Commonality has no peer comparison ("small team", "everyone needs it") | Challenge | Hard Stop | 🟡 Medium |
| R4 | Low Commonality is an uninformative copy of Business Process | Challenge | Hard Stop | 🟢 detect / 🟡 judge |
| R5 | Role is an obscure acronym with no context | Challenge | Hard Stop | 🟡 Medium (allowlist) |
| R6 | Role is an IT system / entitlement name | Challenge | Hard Stop | 🟢 High |
| R7–R9 | Positive versions of R2, R3, R5/R6 | No challenge | Acceptable | — |
| R10–R13 | Generic role with context; internal acronym with context; dual-purpose duplicate; minor English issues | No challenge (discretion) | Negotiable | 🔴 Human only |

Related guide criteria C1–C5 (plus C6, non-English) are in [[ERQA Justification Guide Summary]]. Where the guide and the ruleset differ (e.g., acronyms), **the ruleset is treated as operative, pending validation.**

### 8.2 Phase 3 routing `[Map]`
| Failure type | Monthly LMS training | Weekly HR report |
| --- | :---: | :---: |
| No Action | ✅ | ✅ |
| Action taken, still failed, 3rd fail in 12 months | — | ✅ |
| Action taken, still failed, not a repeat | ✅ | — |

⚠️ The map's wording says "all FAIL cases" go to LMS, while the arrows don't (D14). Validate before building FR-RT-1.

### 8.3 Deadlines `[Guide]`
- Challenge: 7 calendar days from the challenge email.
- Escalation: 7 calendar days from the escalation email.

---

## 9. Data Requirements

### 9.1 Source data `[Dict]`
The 55-column ERQA SharePoint List export, in 7 groups: Case Outcome (A–Q), Challenge & Escalation (R–W), EERS Review (X–AH), Access Context (AI–AN), Justification (AO–AR), Org Attributes (AS–AV), SharePoint Metadata (AW–BC). Labelled **Internal PII**. Full detail in [[ERQA Data Dictionary]].

### 9.2 New fields the Workbench adds (H13)
| Field | Why |
| --- | --- |
| Failure reason (No Action / Insufficient / Revoked) | Drives Phase 3 routing |
| Challenge sent date, escalation sent date | Response times; correct due dates |
| Failed rule IDs | Root-cause insight; specific coaching |
| Reviewer 12-month fail count (computed) | 3× rule |
| Pre-screen result + analyst override + reason | Explainability, audit |
| Review Type (actually filled) | Split by semi-annual / ad hoc / transfer |

### 9.3 Data-quality rules
"- Select -" → null · text dates → parsed dates · country → ISO map · HTML stripped from Entitlement · Re-attempt ID normalized (email vs. ID) · sparse-by-design columns (Revocation ID, HR fields, deferred revocation) documented as expected-null, not errors. `[Data] [Dict]`

---

## 10. Non-Functional Requirements

### 10.1 Compliance, security & privacy (largely TBD → [[ERQA Constraints Register]])
- Data stays inside the bank network. No external services without explicit approval.
- Data classification per element: TBD.
- Approved tooling (Excel/Power Query, Power BI, Power Automate/Apps, SharePoint, Python, internal servers, internal LLM): TBD.
- Approval bodies (IT, InfoSec, CAB, Model Risk): TBD.
- Retention period for evidence: TBD.
- Applicable policies, incl. the Accountability Framework Procedure: TBD.

### 10.2 Explainability & human-in-the-loop
- Every recommendation shows its rule and evidence.
- Deterministic rules only in the MVP, to stay outside model-risk review where possible.
- The system recommends; an analyst makes and records every final call.

### 10.3 Auditability
- Log every import, recommendation, override, email approval, status change and routing decision, with who and when.

### 10.4 Usability
- A single queue-driven workflow; an analyst shouldn't need to open more than one tool for Phases 2–3 (except EERS to verify corrections).

---

## 11. Solution Approach `[Options]`
| Tier | When it applies | Build |
| --- | --- | --- |
| **A. Locked-down** | Excel / M365 only | Power Query cleaning, Excel/Power BI dashboard, formula-based rules |
| **B. M365 automation** | Power Platform allowed | SharePoint List as tracker, Power Automate reminders/emails, Power Apps forms |
| **C. Internal app** | Python or bank server allowed | Pipeline + internal DB + web app (what the prototype simulates) |
| **D. Add-on** | Internal LLM approved for this data | Stylus-assisted summaries and email drafts |

**Tentative path:** start at the most capable tier the constraints allow (B is the likely fit, since the SharePoint List already exists); back-test the pre-screen on synthetic and historical data; expand once value and approvals are confirmed. Final tier choice depends on §10.1.

---

## 12. Prototype (concept, synthetic data) `[Hub]`
Repo: `erqa-workbench` (Next.js; state in browser localStorage). Screens and how they map to this PRD:

| Screen | PRD section |
| --- | --- |
| Overview | §7.6 |
| Intake | §7.1 |
| Assessment Queue (ruleset pre-screen) | §7.2 |
| Challenge Board | §7.3 |
| Case detail | §7.4 |
| Outbox | §7.3 |
| HR & Training Reports | §7.5 |
| Ruleset & Back-test | §7.7, FR-PS-8 |

16 unit tests check the rules engine and routing against the ruleset's own examples.

---

## 13. Release Plan `[Hub]`
| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0. Discovery (current) | Context, constraints, baseline, sponsor | Constraints register filled; baselines agreed |
| 1. Baseline & data foundation | Synthetic 55-column dataset, country map, anomaly rules, baseline KPIs | KPI baseline published |
| 2. Design & prototype | Choose tier; prototype dashboard and pre-screen | Stakeholder sign-off on design |
| 3. Implementation | Build in approved tooling; audit trail and logging | Feature-complete MVP |
| 4. Testing & review | Back-test pre-screen; control-owner and audit walkthrough | Approvals obtained |
| 5. Pilot, launch & handoff | One review cycle; measure against baseline; runbook | DoD met (§4.4) |

---

## 14. Risks
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Tooling restricted (no cloud, no external LLM, maybe no Python) | High | Tiered options with an M365-only path |
| Pre-screen treated as an unexplainable "model" → model risk review | High | Deterministic rules; human makes the final call |
| Ruleset may be an unofficial Stylus chat draft | High | Confirm owner and approval before building on it |
| Fail-rate drop reflects lighter QA, not better reviews | Medium | Show fail rate next to challenge rate and sample size; check 2025→2026 changes |
| Inconsistent org/country data skews hotspots | Medium | Deterministic normalization before reporting |
| Historical HR/training data can't be reconciled | Medium | Structured failure reason + routing log going forward |
| Workflow details and timings unknown | High | Shadow an analyst; time each step |

---

## 15. Open Questions & Discrepancies

### 15.1 Discrepancies to validate `[Workflow]`
| ID | Topic | Status |
| --- | --- | --- |
| D1 | "Automated YES/NO suggestion" in the ERQA queue: Phase 1 check, a Stylus run, or something else? | Open |
| D5 | Revoke / last-attempt step and the Phase 4 "IAM & Deferred Revocations" stage | Open |
| D6 | Cadence: weekly batches within semi-annual campaigns? | Open |
| D8 | Direction of the "Updated justification" arrow to EERS | Open |
| D9 | "SNOW" = ServiceNow? | Open |
| D10 | Are the two exclusion types the only ones? | Mostly resolved |
| D11 | Volume per challenge email batch | Open |
| D14 | LMS report: "all FAIL cases" vs. the arrows | Open |
| D2, D3, D4, D7, D12, D13 | — | ✅ Resolved |

### 15.2 Questions for stakeholders `[Tracker] [Dict] [Ruleset] [Data]`
- **Team:** size, roles, seniority; downstream consumers beyond HR; is there maker-checker on analyst decisions?
- **Workflow:** minutes per case; weekly volumes; how 7-day deadlines are tracked; what the Access queries do; who executes revocations; how the 3× lookup and LMS/HR reports are produced.
- **Data:** meaning of "3/9 Error Checker", SOA, HRC number/result, Substantiation Date, Re-attempt ID; how "no action" fails are recorded; is 2026 a partial year; is Review Type ever filled?
- **Ruleset:** official or draft? Owner? Pages 1–3? Effective date? Official acronym allowlist?
- **Constraints:** everything in §10.1.
- **Success & scope:** what "streamlined" means to the team; sponsor, budget, timeline; what the project owner can build and deploy personally.

---

## 16. Appendix

### 16.1 Glossary
| Term | Meaning |
| --- | --- |
| ERQA | Entitlement Review Quality Assurance |
| EERS | Enterprise Entitlement Review System |
| MSaaS | Team that generates weekly samples |
| Challenge | Request to the reviewer to revise an inadequate justification |
| Escalation | Second request, to the reviewer's manager |
| Exclusion | Case removed from assessment (entitlement no longer visible, or commonality no longer low) |
| Hard Stop / Negotiable / Acceptable | Ruleset categories: challenge / analyst discretion / no challenge |
| LMS | Learning Management System (assumed) |
| Stylus | Internal AI tool with a `/justification-review` preset |
| SOEID | Employee ID; key for the 12-month fail lookup |

### 16.2 Key decisions `[Hub]`
| Date | Decision |
| --- | --- |
| 2026-11-22 | Gather full context before building |
| 2026-11-22 | Masked or synthetic data only in the design workspace |
| 2026-11-23 | Revoked after challenge or escalation = FAIL |
| 2026-11-23 | Recommend the ERQA Case Workbench with the ruleset-driven pre-screen as the project |

### 16.3 Hypothesis traceability `[Hyp]`
| Hypothesis | PRD section |
| --- | --- |
| H9 Chase loop | §7.3 |
| H10 Intake | §7.1 |
| H8 Pre-screen | §7.2, §8.1 |
| H12 Phase 3 routing | §7.5, §8.2 |
| H13 Data model | §7.4, §9.2 |
| H5 Data cleaning | §7.1, §9.3 |
| H3, H4, H6, H7 Insight | §7.6 |
| H1 Risk focus, H11 Stylus | §6.2 (later) |

## Related
[[ERQA Project Hub]] · [[ERQA Context Tracker]] · [[ERQA Current Workflow]] · [[ERQA Process Map V2]] · [[ERQA Justification Guide Summary]] · [[ERQA Challenge Ruleset]] · [[ERQA Data Dictionary]] · [[ERQA Dataset Profile]] · [[ERQA Opportunity Hypotheses]] · [[ERQA Constraints Register]] · [[ERQA Solution Options]] · [[Planning]]
