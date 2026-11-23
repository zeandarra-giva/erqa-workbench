/* Deterministic SYNTHETIC dataset. Every name, ID and justification is fictional.
   Record shapes mirror the ERQA SharePoint List so the workbench behaves realistically. */
var Seed = (function () {
  var D = SeedData;
  var ANALYSTS = ["Ana Rivera", "Jun Tan", "Maya Okafor"];
  var CURRENT_ANALYST = "Ana Rivera";

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makePeople(r, n, prefix) {
    var out = [], used = new Set();
    while (out.length < n) {
      var name = D.FIRST[Math.floor(r() * D.FIRST.length)] + " " + D.LAST[Math.floor(r() * D.LAST.length)];
      if (used.has(name)) continue;
      used.add(name);
      out.push({ id: prefix + String(10000 + Math.floor(r() * 89999)), name: name });
    }
    return out;
  }

  function generate() {
    var r = rng(20261124);
    var pick = function (arr) {
      return arr[Math.floor(r() * arr.length)];
    };
    var reviewers = makePeople(r, 26, "RV");
    var managers = makePeople(r, 9, "MG");
    var workers = makePeople(r, 80, "WK");
    var repeatOffenders = new Set([reviewers[0].id, reviewers[1].id, reviewers[2].id]);
    var cases = [], emails = [], imports = [], mailSeq = 1;

    function sentEmail(c, kind, day) {
      var e = Emails.build(c, kind, "EM-" + mailSeq++, day + "T09:30:00");
      e.status = "sent";
      e.sentAt = day + "T10:00:00";
      emails.push(e);
    }

    function makeCase(week, i, monday) {
      var reviewerIdx = Math.floor(r() * reviewers.length);
      var reviewer = reviewers[reviewerIdx];
      var isRepeat = repeatOffenders.has(reviewer.id);
      var appDef = pick(D.APPS);
      var org = pick(D.ORGS);
      var badP = isRepeat ? 0.75 : 0.28 + (48 - week) * 0.012; // quality improves slowly over time
      var roll = r();
      var j;
      if (roll < badP) {
        var key = org.region === "LATAM" && r() < 0.5 ? "R1" : pick(["R2", "R2", "R3", "R3", "R3", "R4", "R5", "R6"]);
        j = pick(D.BAD[key]);
      } else if (roll < badP + 0.1) j = pick(D.BAD.R10.concat(D.BAD.R11));
      else j = pick(D.GOOD);

      var c = {
        id: "JR-" + week + "-" + String(i).padStart(3, "0"),
        signoffId: String(8900000 + Math.floor(r() * 150000)),
        year: 2026,
        week: week,
        reviewDate: Dates.addDays(monday, -(6 + Math.floor(r() * 9))),
        reviewer: reviewer,
        reviewerManager: managers[reviewerIdx % managers.length],
        managerOrDelegate: r() < 0.88 ? "Manager" : "Delegate",
        reviewType: pick(["Semi-annual", "Semi-annual", "Semi-annual", "Ad hoc", "Transfer"]),
        worker: pick(workers),
        app: appDef.app,
        appId: appDef.id,
        func: pick(appDef.funcs),
        entitlement: appDef.ent,
        environment: r() < 0.93 ? "PROD" : "UAT",
        country: org.country,
        region: org.region,
        sector: org.sector,
        segment: org.segment,
        template: j.template || pick(D.TEMPLATES),
        frequency: pick(D.FREQ),
        justRole: j.role,
        justProcess: j.process,
        justComm: j.comm,
        analyst: pick(ANALYSTS),
        stage: "to_assess",
        audit: [{ at: monday + "T08:05:00", actor: "Intake pipeline", action: "Imported from weekly sample W" + week }],
      };
      var a = Rules.assess(c);
      c.audit.push({ at: monday + "T08:05:01", actor: "Rules engine", action: "Pre-screen: " + a.verdict.replace("_", " "), detail: a.hardStops.map(function (h) { return h.rule; }).join(", ") || undefined });

      var challenge = a.verdict === "hard_stop" ? r() > 0.07 : a.verdict === "review" ? r() < 0.3 : r() < 0.04;
      var sent = Dates.addDays(monday, 1);
      var due = Dates.addDays(sent, 7);

      function close(outcome, at, reason, excl) {
        c.stage = "closed";
        c.outcome = outcome;
        c.closedAt = Dates.daysBetween(at, Dates.DEMO_TODAY) < 0 ? Dates.DEMO_TODAY : at;
        if (reason) c.failReason = reason;
        if (excl) c.exclusionType = excl;
        c.audit.push({ at: c.closedAt + "T16:00:00", actor: c.analyst, action: "Closed as " + outcome.toUpperCase(), detail: reason ? reason.replace("_", " ") : excl });
      }
      function doChallenge() {
        c.stage = "challenged";
        c.failedRules = a.hardStops.length ? Rules.uniqueRuleIds(a.hardStops) : a.negotiables.map(function (n) { return n.rule; });
        c.challengeSentAt = sent;
        c.challengeDue = due;
        c.audit.push({ at: sent + "T10:00:00", actor: c.analyst, action: "Challenge email sent", detail: "Due " + due });
        sentEmail(c, "challenge", sent);
      }
      function doEscalate() {
        var escSent = Dates.addDays(due, 1);
        c.stage = "escalated";
        c.escalationSentAt = escSent;
        c.escalationDue = Dates.addDays(escSent, 7);
        c.audit.push({ at: escSent + "T10:00:00", actor: c.analyst, action: "Escalated to reviewer's manager", detail: "Due " + c.escalationDue });
        sentEmail(c, "escalation", escSent);
      }

      if (week <= 46) c.historicalChallenge = challenge;

      if (week === 48) return c; // current sample – waiting for assessment
      if (!challenge) {
        if (week === 47 && r() < 0.5) return c; // still in queue
        if (r() < 0.07) close("exclusion", Dates.addDays(monday, 2), undefined, pick(Model.EXCLUSION_TYPES));
        else close("pass", Dates.addDays(monday, 2));
        return c;
      }
      doChallenge();
      var x = r();
      if (week === 47) return c; // in flight
      if (week === 46) {
        if (x < 0.4) doEscalate();
        else if (x < 0.65) {
          // challenged and overdue – needs escalation
        } else if (x < 0.88) close("pass", Dates.addDays(sent, 4 + Math.floor(r() * 3)));
        else close("fail", Dates.addDays(sent, 5), "revoked");
      } else if (week === 45 && x < 0.45) {
        doEscalate();
      } else if (x < (isRepeat ? 0.35 : 0.68)) {
        close("pass", Dates.addDays(sent, 3 + Math.floor(r() * 4)));
      } else if (x < 0.9) {
        var reason = pick(["no_action", "no_action", "insufficient", "insufficient", "revoked"]);
        if (reason !== "revoked") doEscalate();
        close("fail", reason === "revoked" ? Dates.addDays(sent, 5) : Dates.addDays(sent, 16), reason);
      } else {
        close("exclusion", Dates.addDays(sent, 4), undefined, pick(Model.EXCLUSION_TYPES));
      }
      return c;
    }

    for (var week = 36; week <= 48; week++) {
      var monday = Dates.isoWeekStart(2026, week);
      var count = 11 + Math.floor(r() * 6);
      for (var i = 1; i <= count; i++) cases.push(makeCase(week, i, monday));
      var raw = count + Math.floor(r() * 4);
      imports.push({
        id: "IMP-" + week, year: 2026, week: week, at: monday + "T08:05:00",
        rawRows: raw,
        duplicatesRemoved: raw - count,
        placeholdersCleaned: count * 3,
        countriesNormalized: Math.floor(count * (0.15 + r() * 0.2)),
        datesParsed: count,
        htmlStripped: Math.floor(count * 0.3),
        casesCreated: count,
      });
    }
    return { cases: cases, emails: emails, imports: imports };
  }

  return { rng: rng, generate: generate, ANALYSTS: ANALYSTS, CURRENT_ANALYST: CURRENT_ANALYST };
})();
