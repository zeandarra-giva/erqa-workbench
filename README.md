# ERQA Workbench (prototype)

A clickable prototype of the proposed ERQA Case Workbench: one place for the weekly
justification review, from intake to HR/training reporting.

> **Synthetic data only.** Every name, ID and justification is fictional. Nothing is sent anywhere;
> state is kept in your browser (localStorage). Use "Reset demo data" in the sidebar to start over.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # rules-engine + routing unit tests
```

## Screens

| Screen | Replaces / adds |
| --- | --- |
| Overview | Insights: weekly outcomes, why justifications fail, app hotspots, repeat reviewers |
| Weekly Intake | `.txt → MS Access → queries → SharePoint upload` (dedupe, placeholders, countries, dates, HTML) |
| Assessment Queue | Ruleset pre-screen on every case + bulk "apply suggestions" (analyst confirms) |
| Challenge Board | Kanban of the challenge → escalation loop with automatic 7-day deadlines |
| Case detail | Evidence per rule, decisions per stage, revised-justification re-check, audit trail |
| Outbox | Batch emailing replaced by template drafts, approve and send in one click |
| HR & Training Reports | Phase 3 routing (no action / 3× in 12 months) → weekly HR + monthly LMS CSVs |
| Ruleset & Back-test | Decision matrix R1–R13, acronym allowlist, live "try it", agreement vs history |

## Where the logic lives

- `src/lib/rules.ts`: ERQA challenge ruleset (Steps 0–4, R1–R13) as explainable checks
- `src/lib/routing.ts`: Phase 3 HR / training routing
- `src/lib/intake.ts`: weekly extract cleaning pipeline
- `src/lib/insights.ts`: KPIs, hotspots, back-test
- `src/lib/seed.ts`: deterministic synthetic dataset (demo date: 24 Nov 2026)
