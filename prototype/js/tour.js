/*
 * Demo walkthrough: a scripted, guided tour of the Workbench.
 * A floating controller (bottom-right) starts the tour, jumps between chapters,
 * autoplays, and steps forward/back. Each step opens a screen and spotlights
 * the element marked with data-tour="…".
 */
var Tour = (function () {
  var esc = UI.esc, icon = UI.icon;
  var AUTOPLAY_MS = 8000;
  var PAD = 10;

  function firstHardStop() {
    var s = Store.get();
    var c =
      s.cases.find(function (x) { return x.stage === "to_assess" && Rules.assess(x, s.acronyms).verdict === "hard_stop"; }) ||
      s.cases.find(function (x) { return x.stage === "to_assess"; }) ||
      s.cases[0];
    return "/cases/" + c.id;
  }

  var STEPS = [
    { chapter: "Welcome", route: "/", title: "Welcome to the ERQA Workbench", body: "One place to run the weekly justification review, from the moment the MSaaS sample arrives to the HR and training reports. This tour takes about 3 minutes. Everything you see is synthetic data." },
    { chapter: "Welcome", route: "/", target: "sidebar", title: "The whole process in one sidebar", body: "Each item is one step of today's process: Intake → Assess → Challenge → Outbox → Reports. Saved views jump straight to what needs attention, such as overdue responses.", solves: "Today the work is spread over 7 places: EERS, a .txt drop, MS Access, SharePoint, the mailbox, an evidence drive and HR email." },
    { chapter: "Insight", route: "/", target: "kpis", title: "Where things stand, at a glance", body: "Cases waiting to be assessed, responses at risk of missing their 7-day deadline, and the challenge and fail rates compared with the previous 8 weeks.", solves: "Today these numbers need an export and a pivot table." },
    { chapter: "Insight", route: "/", target: "weekly", title: "Weekly outcomes", body: "Every weekly sample shown by result: pass, fail, exclusion and still open. Hover over a bar for the details." },
    { chapter: "Insight", route: "/", target: "insights", title: "Insights in plain words", body: "Generated from the case data using simple rules, no AI: overdue responses, the most common reason for challenges, repeat reviewers and app hotspots. The fail rate is always shown next to the challenge rate, so a quality gain isn't confused with lighter QA." },
    { chapter: "Insight", route: "/", target: "why", title: "Why justifications fail", body: "Because every challenge records which rules it cited, ERQA can finally see what managers get wrong most often, and target their communications accordingly.", solves: "Today the reason for a challenge isn't stored in a structured way." },

    { chapter: "1 · Intake", route: "/intake", target: "intake-import", title: "Import the weekly sample", body: 'Today someone picks up the .txt file, loads it into MS Access, runs queries and uploads the result to SharePoint. Here it\'s one button. "Import history" next to it shows every past run for audit.', solves: "Repeated manual loading and cleaning every week." },
    { chapter: "1 · Intake", route: "/intake", target: "intake-drop", title: "Try it: import, clean, create", body: 'Click "Import weekly sample" to see a realistic, messy extract, then "Clean & validate". Duplicates, "- Select -" placeholders, country variants like USA / US, text dates and HTML are all fixed and reported.' },

    { chapter: "2 · Assess", route: "/queue", target: "queue-tabs", title: "Every case is pre-screened", body: "Each justification is checked against the ERQA ruleset (Steps 0–4) and sorted into Hard stop, Needs judgment or Looks clear.", solves: "Analysts applying the rules from memory, one case at a time." },
    { chapter: "2 · Assess", route: "/queue", target: "queue-table", title: "The exact rules triggered", body: "Rule codes such as R2 (generic business process) or R3 (no peer comparison) appear on every row. Hover over a code to see the evidence." },
    { chapter: "2 · Assess", route: "/queue", target: "queue-apply", title: "Clear-cut cases handled in bulk", body: 'Select cases and click "Apply suggestions". Hard stops get challenge emails drafted, clear cases close as PASS, and grey areas are deliberately skipped for the analyst to judge.' },
    { chapter: "2 · Assess", route: firstHardStop, target: "case-fields", title: "Evidence right where it matters", body: "Inside the case, each justification field shows the rule it breaks and the phrase that triggered it, so the analyst doesn't have to look for it." },
    { chapter: "2 · Assess", route: firstHardStop, target: "case-prescreen", title: "The ruleset, step by step", body: "Language → Business process → Low commonality → Copy-paste → Role & acronym, the same order as the ERQA checklist. It's a suggestion only; the analyst decides." },
    { chapter: "2 · Assess", route: firstHardStop, target: "case-decision", title: "One click to act", body: 'Challenge (with the cited rules preselected), Pass, or Exclude. Try "Challenge · draft email": the email is written for you and waits in the Outbox for approval.' },

    { chapter: "3 · Challenge", route: "/outbox", target: "outbox", title: "The Outbox replaces batch emailing", body: "Challenge, escalation and fail emails are drafted from templates with the case details and the exact rules missed. You can edit anything before it goes out.", solves: "Writing and sending challenge emails by hand, in batches." },
    { chapter: "3 · Challenge", route: "/outbox", target: "outbox-send", title: "Approve and send all", body: "One click sends the whole batch, and the 7-day deadline for each case starts automatically. In production the case ID in the subject line lets replies be matched to the case." },
    { chapter: "3 · Challenge", route: "/board", target: "board", title: "Deadlines tracked for you", body: "The Challenge Board shows every case in the loop: awaiting approval → challenged (7 days) → escalated (7 more days) → resolved. Overdue cases are highlighted for action.", solves: "Two 7-day deadlines per case, tracked by hand." },
    { chapter: "3 · Challenge", route: firstHardStop, target: "case-audit", title: "Evidence saved automatically", body: "Every import, pre-screen result, email and decision is logged with who did it and when, so the audit trail builds itself.", solves: "Saving evidence by hand to a separate shared drive." },

    { chapter: "4 · Report", route: "/reports", target: "reports-cards", title: "HR and training reports, ready to go", body: "When a case fails, the Workbench records why and applies the rules: no action → training + HR; 3rd fail in 12 months → HR; otherwise → remedial training. Export the weekly HR or monthly LMS list as a CSV.", solves: "Working out the routing and building both reports by hand. Historical counts suggest the routing hasn't always been consistent." },
    { chapter: "4 · Report", route: "/reports", target: "reports-log", title: "Every routing decision explained", body: "The routing log shows which rule sent each fail where, which is exactly what an auditor will ask." },

    { chapter: "Governance", route: "/rules", target: "rules-backtest", title: "Can we trust the rules?", body: "The back-test compares the pre-screen with past analyst decisions. On real data this would use the historical Challenge column. Here it runs on synthetic history, so the numbers only demonstrate the method." },
    { chapter: "Governance", route: "/rules", target: "rules-try", title: "Try the ruleset yourself", body: "Type any justification and see which checks run and why. The list of accepted standard acronyms is editable." },

    { chapter: "Wrap-up", route: "/", title: "That's the Workbench", body: "Fewer tools (7 places → 2), less manual work (intake, emails, deadlines, routing and evidence handled automatically) and more insight, with the analyst still making every decision. Next step: a pilot on one weekly sample." },
  ];
  var CHAPTERS = STEPS.map(function (s) { return s.chapter; }).filter(function (c, i, a) { return a.indexOf(c) === i; });

  var t = { open: false, active: false, i: 0, auto: false, timer: null, ticker: null, scrolledFor: "" };
  var rootEl;

  function stepRoute(step) {
    return typeof step.route === "function" ? step.route() : step.route;
  }

  function start(i, auto) {
    t.i = i || 0;
    t.active = true;
    t.open = false;
    t.auto = !!auto;
    show();
  }
  function stop() {
    t.active = false;
    t.auto = false;
    clearTimeout(t.timer);
    clearInterval(t.ticker);
    draw();
  }
  function goTo(n) {
    t.i = Math.max(0, Math.min(STEPS.length - 1, n));
    show();
  }

  function show() {
    var route = stepRoute(STEPS[t.i]);
    var path = route.split("?")[0];
    t.scrolledFor = "";
    if (App.route().path !== path) App.go(route);
    draw();
    clearInterval(t.ticker);
    t.ticker = setInterval(position, 120);
    scheduleAuto();
  }

  function scheduleAuto() {
    clearTimeout(t.timer);
    if (!t.active || !t.auto) return;
    if (t.i === STEPS.length - 1) {
      t.auto = false;
      draw();
      return;
    }
    t.timer = setTimeout(function () { goTo(t.i + 1); }, AUTOPLAY_MS);
  }

  function cardPlacement(rect) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var W = Math.min(380, vw - 32);
    if (!rect) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: Math.min(460, vw - 32) + "px" };
    var left = Math.min(Math.max(16, rect.left), vw - W - 16);
    if (vh - rect.bottom > 260) return { left: left + "px", top: rect.bottom + PAD + 12 + "px", transform: "none", width: W + "px" };
    if (rect.top > 260) return { left: left + "px", top: Math.max(16, rect.top - PAD - 12) + "px", transform: "translateY(-100%)", width: W + "px" };
    var top = Math.max(16, Math.min(rect.top, vh - 320)) + "px";
    if (vw - rect.right > W + 40) return { left: rect.right + PAD + 12 + "px", top: top, transform: "none", width: W + "px" };
    return { left: Math.max(16, rect.left - W - PAD - 12) + "px", top: top, transform: "none", width: W + "px" };
  }

  /* Follow the target element as the page scrolls or re-renders. */
  function position() {
    if (!t.active) return;
    var step = STEPS[t.i];
    var spot = rootEl.querySelector(".tour-spot");
    var dim = rootEl.querySelector(".tour-dim");
    var card = rootEl.querySelector(".tour-card");
    if (!spot || !card) return;
    var el = step.target ? document.querySelector('[data-tour="' + step.target + '"]') : null;
    var rect = null;
    if (el) {
      var key = t.i + ":" + step.target;
      if (t.scrolledFor !== key) {
        t.scrolledFor = key;
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
      rect = el.getBoundingClientRect();
    }
    if (rect) {
      spot.style.display = "block";
      dim.style.display = "none";
      spot.style.left = rect.left - PAD + "px";
      spot.style.top = rect.top - PAD + "px";
      spot.style.width = rect.width + PAD * 2 + "px";
      spot.style.height = rect.height + PAD * 2 + "px";
    } else {
      spot.style.display = "none";
      dim.style.display = "block";
    }
    var p = cardPlacement(rect);
    card.style.left = p.left;
    card.style.top = p.top;
    card.style.transform = p.transform;
    card.style.width = p.width;
  }

  function overlay() {
    var step = STEPS[t.i];
    var last = t.i === STEPS.length - 1;
    return (
      '<div class="tour-layer" aria-live="polite"><div class="tour-dim"></div><div class="tour-spot"></div>' +
      '<div class="tour-card" role="dialog" aria-label="' + esc(step.title) + '">' +
      '<div class="row between mb-2"><span class="tour-chapter">' + icon("sparkles") + esc(step.chapter) + "</span>" +
      '<button class="icon-btn" aria-label="Exit walkthrough" data-action="tour:stop">' + icon("x") + "</button></div>" +
      '<h3 class="tour-title">' + esc(step.title) + '</h3><p class="tour-body">' + esc(step.body) + "</p>" +
      (step.solves ? '<div class="tour-solves"><b>Solves:</b> ' + esc(step.solves) + "</div>" : "") +
      '<div class="tour-progress">' + STEPS.map(function (_, k) { return '<span class="' + (k <= t.i ? "on" : "") + '"></span>'; }).join("") + "</div>" +
      '<div class="row between mt-3"><span class="tiny muted tabular">' + (t.i + 1) + " of " + STEPS.length + "</span>" +
      '<div class="row gap-2"><button class="btn btn-secondary btn-xs" data-action="tour:prev"' + (t.i === 0 ? " disabled" : "") + ">" + icon("chevron-left") + "Back</button>" +
      (last
        ? '<button class="btn btn-primary btn-xs" data-action="tour:stop">Finish</button>'
        : '<button class="btn btn-primary btn-xs" data-action="tour:next">Next' + icon("chevron-right") + "</button>") +
      "</div></div></div></div>"
    );
  }

  function controller() {
    var step = STEPS[t.i];
    var menu = "";
    if (t.open && !t.active) {
      menu =
        '<div class="tour-menu"><div class="tour-menu-head"><div class="strong">Demo walkthrough</div><div class="tiny muted">' + STEPS.length + " steps · about 3 minutes · what each screen solves</div></div>" +
        '<button class="tour-menu-primary" data-action="tour:start">' + icon("play") + "Start from the beginning</button>" +
        '<button class="tour-menu-secondary" data-action="tour:autoplay">' + icon("presentation") + "Autoplay (hands-free)</button>" +
        '<div class="tour-menu-label">' + icon("list-ordered") + "JUMP TO CHAPTER</div>" +
        CHAPTERS.map(function (ch) {
          var n = STEPS.filter(function (s) { return s.chapter === ch; }).length;
          return '<button class="tour-chapter-link" data-action="tour:chapter" data-chapter="' + esc(ch) + '"><span>' + esc(ch) + '</span><span class="tabular faint">' + n + "</span></button>";
        }).join("") + "</div>";
    }
    var control = t.active
      ? '<div class="tour-bar"><span class="tour-bar-label"><b>' + esc(step.chapter) + "</b> · " + (CHAPTERS.indexOf(step.chapter) + 1) + "/" + CHAPTERS.length + "</span>" +
        '<button class="round-btn" aria-label="Previous step" data-action="tour:prev"' + (t.i === 0 ? " disabled" : "") + ">" + icon("chevron-left") + "</button>" +
        '<button class="round-btn' + (t.auto ? " on" : "") + '" aria-label="' + (t.auto ? "Pause autoplay" : "Autoplay") + '" data-action="tour:toggle-auto">' + icon(t.auto ? "pause" : "play") + "</button>" +
        '<button class="round-btn" aria-label="Next step" data-action="tour:next"' + (t.i === STEPS.length - 1 ? " disabled" : "") + ">" + icon("chevron-right") + "</button>" +
        '<button class="round-btn dark" aria-label="Exit walkthrough" data-action="tour:stop">' + icon("x") + "</button></div>"
      : '<button class="tour-fab" aria-expanded="' + t.open + '" data-action="tour:menu"><span class="tour-fab-icon">' + (t.open ? "" : '<span class="ping"></span>') + icon(t.open ? "x" : "play") + "</span><span>" + (t.open ? "Close" : "Demo walkthrough") + "</span></button>";
    return '<div class="tour-dock">' + menu + control + "</div>";
  }

  function draw() {
    rootEl.innerHTML = (t.active ? overlay() : "") + controller();
    position();
  }

  App.on("click", "tour:menu", function () { t.open = !t.open; draw(); });
  App.on("click", "tour:start", function () { start(0, false); });
  App.on("click", "tour:autoplay", function () { start(0, true); });
  App.on("click", "tour:chapter", function (el) {
    var ch = el.getAttribute("data-chapter");
    start(STEPS.findIndex(function (s) { return s.chapter === ch; }), false);
  });
  App.on("click", "tour:next", function () { goTo(t.i + 1); });
  App.on("click", "tour:prev", function () { goTo(t.i - 1); });
  App.on("click", "tour:stop", stop);
  App.on("click", "tour:toggle-auto", function () {
    t.auto = !t.auto;
    draw();
    scheduleAuto();
  });
  App.onKey(function (e) {
    if (!t.active) return;
    var tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "ArrowRight") goTo(t.i + 1);
    else if (e.key === "ArrowLeft") goTo(t.i - 1);
    else if (e.key === "Escape") stop();
  });
  window.addEventListener("resize", position);

  return {
    mount: function (el) {
      rootEl = el;
      draw();
    },
  };
})();
