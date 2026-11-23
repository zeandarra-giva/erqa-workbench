"use client";

// Demo walkthrough: a scripted, guided tour of the Workbench.
// A floating controller (bottom-right) starts the tour, jumps between chapters,
// autoplays, and steps forward/back. Each step navigates to a screen and
// spotlights the element marked with data-tour="…".

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Play, Pause, ChevronLeft, ChevronRight, X, Sparkles, ListOrdered, Presentation } from "lucide-react";
import { useStore, type State } from "@/lib/store";
import { assess } from "@/lib/rules";
import { cn } from "./ui";

interface Step {
  chapter: string;
  route: string | ((s: State) => string);
  target?: string; // data-tour id; omitted = centred card
  title: string;
  body: string;
  solves?: string; // the problem this screen solves
}

const firstHardStop = (s: State) => {
  const c =
    s.cases.find((x) => x.stage === "to_assess" && assess(x, s.acronyms).verdict === "hard_stop") ??
    s.cases.find((x) => x.stage === "to_assess") ??
    s.cases[0];
  return `/cases/${c.id}`;
};

const STEPS: Step[] = [
  { chapter: "Welcome", route: "/", title: "Welcome to the ERQA Workbench", body: "One place to run the weekly justification review, from the moment the MSaaS sample arrives to the HR and training reports. This tour takes about 3 minutes. Everything you see is synthetic data." },
  { chapter: "Welcome", route: "/", target: "sidebar", title: "The whole process in one sidebar", body: "Each item is one step of today's process: Intake → Assess → Challenge → Outbox → Reports. Saved views jump straight to what needs attention, such as overdue responses.", solves: "Today the work is spread over 7 places: EERS, a .txt drop, MS Access, SharePoint, the mailbox, an evidence drive and HR email." },
  { chapter: "Insight", route: "/", target: "kpis", title: "Where things stand, at a glance", body: "Cases waiting to be assessed, responses at risk of missing their 7-day deadline, and the challenge and fail rates compared with the previous 8 weeks.", solves: "Today these numbers need an export and a pivot table." },
  { chapter: "Insight", route: "/", target: "weekly", title: "Weekly outcomes", body: "Every weekly sample shown by result: pass, fail, exclusion and still open. Hover over a bar for the details." },
  { chapter: "Insight", route: "/", target: "insights", title: "Insights in plain words", body: "Generated from the case data using simple rules, no AI: overdue responses, the most common reason for challenges, repeat reviewers and app hotspots. The fail rate is always shown next to the challenge rate, so a quality gain isn't confused with lighter QA." },
  { chapter: "Insight", route: "/", target: "why", title: "Why justifications fail", body: "Because every challenge records which rules it cited, ERQA can finally see what managers get wrong most often, and target their communications accordingly.", solves: "Today the reason for a challenge isn't stored in a structured way." },

  { chapter: "1 · Intake", route: "/intake", target: "intake-import", title: "Import the weekly sample", body: "Today someone picks up the .txt file, loads it into MS Access, runs queries and uploads the result to SharePoint. Here it's one button. \"Import history\" next to it shows every past run for audit.", solves: "Repeated manual loading and cleaning every week." },
  { chapter: "1 · Intake", route: "/intake", target: "intake-drop", title: "Try it: import, clean, create", body: "Click \"Import weekly sample\" to see a realistic, messy extract, then \"Clean & validate\". Duplicates, \"- Select -\" placeholders, country variants like USA / US, text dates and HTML are all fixed and reported." },

  { chapter: "2 · Assess", route: "/queue", target: "queue-tabs", title: "Every case is pre-screened", body: "Each justification is checked against the ERQA ruleset (Steps 0–4) and sorted into Hard stop, Needs judgment or Looks clear.", solves: "Analysts applying the rules from memory, one case at a time." },
  { chapter: "2 · Assess", route: "/queue", target: "queue-table", title: "The exact rules triggered", body: "Rule codes such as R2 (generic business process) or R3 (no peer comparison) appear on every row. Hover over a code to see the evidence." },
  { chapter: "2 · Assess", route: "/queue", target: "queue-apply", title: "Clear-cut cases handled in bulk", body: "Select cases and click \"Apply suggestions\". Hard stops get challenge emails drafted, clear cases close as PASS, and grey areas are deliberately skipped for the analyst to judge." },
  { chapter: "2 · Assess", route: firstHardStop, target: "case-fields", title: "Evidence right where it matters", body: "Inside the case, each justification field shows the rule it breaks and the phrase that triggered it, so the analyst doesn't have to look for it." },
  { chapter: "2 · Assess", route: firstHardStop, target: "case-prescreen", title: "The ruleset, step by step", body: "Language → Business process → Low commonality → Copy-paste → Role & acronym, the same order as the ERQA checklist. It's a suggestion only; the analyst decides." },
  { chapter: "2 · Assess", route: firstHardStop, target: "case-decision", title: "One click to act", body: "Challenge (with the cited rules preselected), Pass, or Exclude. Try \"Challenge · draft email\": the email is written for you and waits in the Outbox for approval." },

  { chapter: "3 · Challenge", route: "/outbox", target: "outbox", title: "The Outbox replaces batch emailing", body: "Challenge, escalation and fail emails are drafted from templates with the case details and the exact rules missed. You can edit anything before it goes out.", solves: "Writing and sending challenge emails by hand, in batches." },
  { chapter: "3 · Challenge", route: "/outbox", target: "outbox-send", title: "Approve and send all", body: "One click sends the whole batch, and the 7-day deadline for each case starts automatically. In production the case ID in the subject line lets replies be matched to the case." },
  { chapter: "3 · Challenge", route: "/board", target: "board", title: "Deadlines tracked for you", body: "The Challenge Board shows every case in the loop: awaiting approval → challenged (7 days) → escalated (7 more days) → closed. Overdue and due-today cases are highlighted for action.", solves: "Two 7-day deadlines per case, tracked by hand." },
  { chapter: "3 · Challenge", route: firstHardStop, target: "case-audit", title: "Evidence saved automatically", body: "Every import, pre-screen result, email and decision is logged with who did it and when, so the audit trail builds itself.", solves: "Saving evidence by hand to a separate shared drive." },

  { chapter: "4 · Report", route: "/reports", target: "reports-cards", title: "HR and training reports, ready to go", body: "When a case fails, the Workbench records why and applies the rules: no action → training + HR; 3rd fail in 12 months → HR; otherwise → remedial training. Export the weekly HR or monthly LMS list as a CSV.", solves: "Working out the routing and building both reports by hand. Historical counts suggest the routing hasn't always been consistent." },
  { chapter: "4 · Report", route: "/reports", target: "reports-log", title: "Every routing decision explained", body: "The routing log shows which rule sent each fail where, which is exactly what an auditor will ask." },

  { chapter: "Governance", route: "/rules", target: "rules-backtest", title: "Can we trust the rules?", body: "The back-test compares the pre-screen with past analyst decisions. On real data this would use the historical Challenge column. Here it runs on synthetic history, so the numbers only demonstrate the method." },
  { chapter: "Governance", route: "/rules", target: "rules-try", title: "Try the ruleset yourself", body: "Type any justification and see which checks run and why. The list of accepted standard acronyms is editable." },

  { chapter: "Wrap-up", route: "/", title: "That's the Workbench", body: "Fewer tools (7 places → 2), less manual work (intake, emails, deadlines, routing and evidence handled automatically) and more insight, with the analyst still making every decision. Next step: a pilot on one weekly sample." },
];

const CHAPTERS = Array.from(new Set(STEPS.map((s) => s.chapter)));
const AUTOPLAY_MS = 8000;
const PAD = 10;

export function DemoTour() {
  const router = useRouter();
  const pathname = usePathname();
  const { state } = useStore();
  const [open, setOpen] = useState(false); // controller menu
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const lastScrolled = useRef<string>("");

  const step = STEPS[i];
  const route = useMemo(() => (typeof step.route === "function" ? step.route(state) : step.route), [step, state]);

  const go = useCallback((n: number) => {
    setI(Math.max(0, Math.min(STEPS.length - 1, n)));
  }, []);
  const start = (n = 0) => {
    setI(n);
    setActive(true);
    setOpen(false);
  };
  const stop = useCallback(() => {
    setActive(false);
    setAuto(false);
    setRect(null);
  }, []);

  // Navigate to the step's screen
  useEffect(() => {
    if (!active) return;
    const base = route.split("?")[0];
    if (pathname !== base) router.push(route);
  }, [active, route, pathname, router]);

  // Track the target element's position
  useEffect(() => {
    if (!active) return;
    lastScrolled.current = "";
    const tick = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) return setRect(null);
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!el) return setRect(null);
      const key = `${i}:${step.target}`;
      if (lastScrolled.current !== key) {
        lastScrolled.current = key;
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      const r = el.getBoundingClientRect();
      setRect((prev) => (prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && prev.width === r.width && prev.height === r.height ? prev : r));
    };
    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [active, i, step.target, pathname]);

  // Autoplay
  useEffect(() => {
    if (!active || !auto) return;
    if (i === STEPS.length - 1) {
      const t = window.setTimeout(() => setAuto(false), 0);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => go(i + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [active, auto, i, go]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === "Escape") stop();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, i, go, stop]);

  // Tooltip placement
  const CARD_W = Math.min(380, vp.w - 32);
  let cardStyle: React.CSSProperties = { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: Math.min(460, vp.w - 32) };
  if (rect) {
    const below = vp.h - rect.bottom;
    const above = rect.top;
    const right = vp.w - rect.right;
    const left = Math.min(Math.max(16, rect.left), vp.w - CARD_W - 16);
    if (below > 260) cardStyle = { left, top: rect.bottom + PAD + 12, width: CARD_W };
    else if (above > 260) cardStyle = { left, top: Math.max(16, rect.top - PAD - 12), width: CARD_W, transform: "translateY(-100%)" };
    else if (right > CARD_W + 40) cardStyle = { left: rect.right + PAD + 12, top: Math.max(16, Math.min(rect.top, vp.h - 320)), width: CARD_W };
    else cardStyle = { left: Math.max(16, rect.left - CARD_W - PAD - 12), top: Math.max(16, Math.min(rect.top, vp.h - 320)), width: CARD_W };
  }
  const chapterIdx = CHAPTERS.indexOf(step.chapter);

  return (
    <>
      {active && (
        <div className="pointer-events-none fixed inset-0 z-[60]" aria-live="polite">
          {/* spotlight */}
          {rect ? (
            <div
              className="absolute rounded-2xl ring-2 ring-accent transition-all duration-300 ease-out"
              style={{
                left: rect.left - PAD,
                top: rect.top - PAD,
                width: rect.width + PAD * 2,
                height: rect.height + PAD * 2,
                boxShadow: "0 0 0 9999px rgba(18,18,24,0.42)",
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-[rgba(18,18,24,0.42)] transition-opacity" />
          )}

          {/* step card */}
          <div className="pointer-events-auto absolute rounded-2xl border border-line bg-surface p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] transition-all duration-300" style={cardStyle} role="dialog" aria-label={step.title}>
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-accent">
                <Sparkles className="size-3.5" /> {step.chapter}
              </span>
              <button onClick={stop} className="rounded-lg p-1 text-muted hover:bg-subtle" aria-label="Exit walkthrough"><X className="size-4" /></button>
            </div>
            <h3 className="text-[17px] font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-1.5 text-[14px] leading-relaxed text-ink-2">{step.body}</p>
            {step.solves && (
              <div className="mt-3 rounded-xl border border-[#f3c9cb] bg-bad-soft/60 px-3 py-2 text-[12.5px] leading-snug text-bad">
                <b>Solves:</b> {step.solves}
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {STEPS.map((_, k) => <span key={k} className={cn("h-1 flex-1 rounded-full", k <= i ? "bg-accent" : "bg-line")} />)}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="tabular text-[12.5px] text-muted">{i + 1} of {STEPS.length}</span>
              <div className="flex gap-2">
                <button disabled={i === 0} onClick={() => go(i - 1)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-line-strong px-2.5 text-[13px] disabled:opacity-40"><ChevronLeft className="size-4" />Back</button>
                {i < STEPS.length - 1 ? (
                  <button onClick={() => go(i + 1)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-ink px-3 text-[13px] font-medium text-white">Next<ChevronRight className="size-4" /></button>
                ) : (
                  <button onClick={stop} className="inline-flex h-8 items-center rounded-lg bg-ink px-3 text-[13px] font-medium text-white">Finish</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating controller */}
      <div className="fixed right-5 bottom-5 z-[70] flex flex-col items-end gap-2">
        {open && !active && (
          <div className="w-[300px] rounded-2xl border border-line bg-surface p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.35)]">
            <div className="px-2 pt-1 pb-2">
              <div className="text-[14px] font-semibold">Demo walkthrough</div>
              <div className="text-[12.5px] text-muted">{STEPS.length} steps · about 3 minutes · what each screen solves</div>
            </div>
            <button onClick={() => start(0)} className="mb-1 flex w-full items-center gap-2 rounded-xl bg-ink px-3 py-2.5 text-[13.5px] font-medium text-white"><Play className="size-4" /> Start from the beginning</button>
            <button onClick={() => { start(0); setAuto(true); }} className="mb-2 flex w-full items-center gap-2 rounded-xl border border-line-strong px-3 py-2.5 text-[13.5px] font-medium hover:bg-subtle"><Presentation className="size-4" /> Autoplay (hands-free)</button>
            <div className="flex items-center gap-1.5 px-2 pb-1 text-[11.5px] font-medium tracking-wider text-faint"><ListOrdered className="size-3.5" />JUMP TO CHAPTER</div>
            {CHAPTERS.map((ch) => (
              <button key={ch} onClick={() => start(STEPS.findIndex((s) => s.chapter === ch))} className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[13px] text-ink-2 hover:bg-subtle">
                <span>{ch}</span><span className="tabular text-[12px] text-faint">{STEPS.filter((s) => s.chapter === ch).length}</span>
              </button>
            ))}
          </div>
        )}

        {active ? (
          <div className="flex items-center gap-1 rounded-full border border-line bg-surface p-1.5 pl-3 shadow-[0_14px_40px_-14px_rgba(0,0,0,0.4)]">
            <span className="mr-1 hidden text-[12.5px] text-muted sm:inline">
              <b className="text-ink">{step.chapter}</b> · {chapterIdx + 1}/{CHAPTERS.length}
            </span>
            <button onClick={() => go(i - 1)} disabled={i === 0} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-subtle disabled:opacity-40" aria-label="Previous step"><ChevronLeft className="size-4" /></button>
            <button onClick={() => setAuto(!auto)} className={cn("inline-flex size-8 items-center justify-center rounded-full", auto ? "bg-accent text-white" : "hover:bg-subtle")} aria-label={auto ? "Pause autoplay" : "Autoplay"}>
              {auto ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button onClick={() => go(i + 1)} disabled={i === STEPS.length - 1} className="inline-flex size-8 items-center justify-center rounded-full hover:bg-subtle disabled:opacity-40" aria-label="Next step"><ChevronRight className="size-4" /></button>
            <button onClick={stop} className="inline-flex size-8 items-center justify-center rounded-full bg-ink text-white" aria-label="Exit walkthrough"><X className="size-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(!open)}
            className="group flex items-center gap-2.5 rounded-full bg-ink py-2.5 pr-4 pl-2.5 text-white shadow-[0_14px_40px_-12px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5"
            aria-expanded={open}
          >
            <span className="relative inline-flex size-8 items-center justify-center rounded-full bg-white/15">
              {!open && <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />}
              {open ? <X className="size-4" /> : <Play className="size-4 translate-x-[1px]" />}
            </span>
            <span className="text-[13.5px] font-medium">{open ? "Close" : "Demo walkthrough"}</span>
          </button>
        )}
      </div>
    </>
  );
}
