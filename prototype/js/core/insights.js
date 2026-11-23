/* KPIs, hotspots, SLA status and back-test, computed from case data. */
var Insights = (function () {
  function pct(a, b) {
    return b ? (a / b) * 100 : 0;
  }

  function slaOf(c) {
    if (c.stage === "challenged" && !c.challengeSentAt) return { state: "awaiting_send", label: "Email awaiting approval" };
    if (c.stage === "escalated" && !c.escalationSentAt) return { state: "awaiting_send", label: "Escalation awaiting approval" };
    var due = c.stage === "escalated" ? c.escalationDue : c.stage === "challenged" ? c.challengeDue : undefined;
    if (!due) return { state: "none", label: "" };
    var left = Dates.daysLeft(due);
    if (left < 0) return { state: "overdue", due: due, left: left, label: -left + "d overdue" };
    if (left === 0) return { state: "due_today", due: due, left: left, label: "Due today" };
    if (left <= 2) return { state: "due_soon", due: due, left: left, label: left + "d left" };
    return { state: "on_track", due: due, left: left, label: left + "d left" };
  }

  function compute(cases) {
    var open = cases.filter(function (c) { return c.stage !== "closed"; });
    var closed = cases.filter(function (c) { return c.stage === "closed"; });
    var weeks = Array.from(new Set(cases.map(function (c) { return c.week; }))).sort(function (a, b) { return a - b; });
    var lastWeek = weeks[weeks.length - 1];

    var weekly = weeks.map(function (w) {
      var wc = cases.filter(function (c) { return c.week === w; });
      var n = function (fn) { return wc.filter(fn).length; };
      return {
        week: w,
        total: wc.length,
        pass: n(function (c) { return c.outcome === "pass"; }),
        fail: n(function (c) { return c.outcome === "fail"; }),
        exclusion: n(function (c) { return c.outcome === "exclusion"; }),
        open: n(function (c) { return c.stage !== "closed"; }),
      };
    });

    function closedIn(from, to) {
      return cases.filter(function (c) { return c.week >= from && c.week <= to && c.stage === "closed"; });
    }
    function failShare(list) {
      return pct(list.filter(function (c) { return c.outcome === "fail"; }).length, list.length);
    }
    function challShare(list) {
      return pct(list.filter(function (c) { return c.challengeSentAt; }).length, list.length);
    }
    var failRate = failShare(closedIn(lastWeek - 7, lastWeek));
    var failRatePrior = failShare(closedIn(lastWeek - 15, lastWeek - 8));
    var challengeRate = challShare(cases.filter(function (c) { return c.week >= lastWeek - 7 && c.stage !== "to_assess"; }));
    var challengeRatePrior = challShare(cases.filter(function (c) { return c.week >= lastWeek - 15 && c.week < lastWeek - 7; }));

    var slas = open.map(slaOf);
    var overdue = slas.filter(function (s) { return s.state === "overdue"; }).length;
    var dueSoon = slas.filter(function (s) { return s.state === "due_today" || s.state === "due_soon"; }).length;

    var ruleCounts = {};
    var withRules = cases.filter(function (c) { return c.failedRules && c.failedRules.length; });
    withRules.forEach(function (c) {
      c.failedRules.forEach(function (r) { ruleCounts[r] = (ruleCounts[r] || 0) + 1; });
    });
    var topRules = Object.keys(ruleCounts)
      .map(function (id) {
        return { id: id, title: Rules.RULE_BY_ID[id] ? Rules.RULE_BY_ID[id].title : id, n: ruleCounts[id], share: pct(ruleCounts[id], withRules.length) };
      })
      .sort(function (a, b) { return b.n - a.n; });

    var byApp = {};
    closed.forEach(function (c) {
      var e = byApp[c.app] || (byApp[c.app] = { app: c.app, total: 0, fail: 0, challenged: 0 });
      e.total++;
      if (c.outcome === "fail") e.fail++;
      if (c.challengeSentAt) e.challenged++;
    });
    var hotspots = Object.keys(byApp)
      .map(function (k) {
        var a = byApp[k];
        a.failRate = pct(a.fail, a.total);
        return a;
      })
      .sort(function (a, b) { return b.failRate - a.failRate; });

    var reviewerIds = Array.from(new Set(cases.map(function (c) { return c.reviewer.id; })));
    var repeat = reviewerIds
      .map(function (id) {
        var rc = cases.filter(function (c) { return c.reviewer.id === id; });
        return { reviewer: rc[0].reviewer, segment: rc[0].segment, fails: Routing.reviewerFails12m(id, Dates.DEMO_TODAY, cases), cases: rc.length };
      })
      .filter(function (r) { return r.fails >= 2; })
      .sort(function (a, b) { return b.fails - a.fails; });

    var responded = closed.filter(function (c) { return c.outcome === "pass" && c.challengeSentAt && c.closedAt; });
    var avgResponse = responded.length
      ? responded.reduce(function (s, c) { return s + Dates.daysBetween(c.challengeSentAt, c.closedAt); }, 0) / responded.length
      : 0;

    var fails = closed.filter(function (c) { return c.outcome === "fail"; });
    var byReason = function (r) { return fails.filter(function (c) { return c.failReason === r; }).length; };

    return {
      open: open.length,
      toAssess: cases.filter(function (c) { return c.stage === "to_assess"; }).length,
      challenged: cases.filter(function (c) { return c.stage === "challenged"; }).length,
      escalated: cases.filter(function (c) { return c.stage === "escalated"; }).length,
      overdue: overdue,
      dueSoon: dueSoon,
      failRate: failRate,
      failRatePrior: failRatePrior,
      challengeRate: challengeRate,
      challengeRatePrior: challengeRatePrior,
      weekly: weekly,
      topRules: topRules,
      hotspots: hotspots,
      repeat: repeat,
      avgResponse: avgResponse,
      failReasons: { no_action: byReason("no_action"), insufficient: byReason("insufficient"), revoked: byReason("revoked") },
      totalFails: fails.length,
      lastWeek: lastWeek,
    };
  }

  /** Compare the rules' suggestion with historical analyst decisions (synthetic history). */
  function backtest(cases, allow) {
    var hist = cases.filter(function (c) { return c.historicalChallenge !== undefined; });
    var tp = 0, fp = 0, fn = 0, tn = 0, review = 0;
    hist.forEach(function (c) {
      var v = Rules.assess(c, allow).verdict;
      if (v === "review") review++;
      var predicted = v === "hard_stop";
      if (predicted && c.historicalChallenge) tp++;
      else if (predicted) fp++;
      else if (c.historicalChallenge) fn++;
      else tn++;
    });
    return {
      n: hist.length, tp: tp, fp: fp, fn: fn, tn: tn, review: review,
      agreement: pct(tp + tn, hist.length),
      precision: pct(tp, tp + fp),
      recall: pct(tp, tp + fn),
    };
  }

  return { slaOf: slaOf, compute: compute, backtest: backtest };
})();
