/* Overview – KPIs, weekly outcomes and plain-language insights. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill, dot = UI.dot;
  var ui = { q: "" };
  var pct = function (n) { return n.toFixed(1) + "%"; };
  var signed = function (n) { return (n >= 0 ? "+" : "") + n.toFixed(1) + " pts"; };
  var TONE_COLOR = { bad: "#c2262e", warn: "#e8890c", info: "#2f62f5", ok: "#15803d" };

  function render() {
    var s = Store.get();
    var ins = Insights.compute(s.cases);
    var wk = ins.lastWeek;
    var monday = Dates.isoWeekStart(2026, wk);
    var maxWeek = Math.max.apply(null, ins.weekly.map(function (w) { return w.total; }).concat([1]));
    var failDelta = ins.failRate - ins.failRatePrior;
    var chalDelta = ins.challengeRate - ins.challengeRatePrior;
    var newThisWeek = s.cases.filter(function (c) { return c.week === wk; }).length;

    var insights = [];
    if (ins.overdue) insights.push({ tone: "bad", text: ins.overdue + " challenge/escalation response" + (ins.overdue > 1 ? "s are" : " is") + " overdue. Escalate or close today to stay within policy.", href: "/board?view=overdue" });
    if (ins.topRules[0]) insights.push({ tone: "info", text: '"' + ins.topRules[0].title + '" (' + ins.topRules[0].id + ") drives " + ins.topRules[0].share.toFixed(0) + "% of challenges. A targeted manager reminder could cut volume at the source." });
    if (ins.repeat[0]) insights.push({ tone: "warn", text: ins.repeat.length + " reviewer" + (ins.repeat.length > 1 ? "s have" : " has") + " 2+ fails in 12 months. " + ins.repeat.filter(function (r) { return r.fails >= 3; }).length + " already meet the 3× HR rule.", scroll: "repeat" });
    if (ins.hotspots[0]) insights.push({ tone: "warn", text: ins.hotspots[0].app + " has the highest fail rate (" + ins.hotspots[0].failRate.toFixed(0) + "% of " + ins.hotspots[0].total + " closed cases)." });
    insights.push({ tone: failDelta <= 0 ? "ok" : "bad", text: "Fail rate is " + pct(ins.failRate) + " over the last 8 weeks vs " + pct(ins.failRatePrior) + " before, shown next to a challenge rate of " + pct(ins.challengeRate) + " so a quality gain isn't confused with lighter QA." });

    var head = UI.pageHead(
      "Overview",
      "Week " + wk + " · " + esc(Dates.fmtShort(monday)) + " – " + esc(Dates.fmtShort(Dates.addDays(monday, 6))) + ", 2026 · " + newThisWeek + " cases sampled by MSaaS",
      '<div class="row gap-2"><a class="btn btn-secondary" href="#/queue">' + icon("list-checks") + "<span>Assess queue</span></a>" +
        '<a class="btn btn-primary" href="#/board">' + icon("square-kanban") + "<span>Challenge board</span></a></div>"
    );

    var kpis =
      '<div class="grid grid-kpis" data-tour="kpis">' +
      UI.kpi({ label: "Cases to assess", value: ins.toAssess, delta: "+" + newThisWeek + " this week", deltaTone: "info", sub: "<b>" + (ins.challenged + ins.escalated) + "</b> in challenge loop", href: "/queue" }) +
      UI.kpi({ label: "Responses at risk", value: ins.overdue + ins.dueSoon, delta: ins.overdue + " overdue", deltaTone: ins.overdue ? "bad" : "ok", sub: "<b>" + ins.dueSoon + "</b> due within 2 days", href: "/board" }) +
      UI.kpi({ label: "Challenge rate (8 wks)", value: pct(ins.challengeRate), delta: signed(chalDelta), deltaTone: "neutral", sub: "<b>" + pct(ins.challengeRatePrior) + "</b> prior 8 weeks" }) +
      UI.kpi({ label: "Fail rate (8 wks)", value: pct(ins.failRate), delta: signed(failDelta), deltaTone: failDelta <= 0 ? "ok" : "bad", sub: "<b>" + pct(ins.failRatePrior) + "</b> prior 8 weeks", href: "/reports" }) +
      "</div>";

    var toolbar =
      '<div class="toolbar mt-5"><form class="search-form" data-submit="overview:search">' + UI.searchBox("overview-q", ui.q, "Search case, reviewer or app…", "overview:q") + "</form>" +
      '<div class="chip chip-note ml-auto">' + icon("sparkles", "violet") + "Insights refresh automatically from case data</div></div>";

    var pipeline =
      '<div class="grid grid-pipeline mt-5" data-tour="pipeline">' +
      [
        { label: "To assess", n: ins.toAssess, color: "#3f3f46", href: "/queue" },
        { label: "Challenged", n: ins.challenged, color: "#2f62f5", href: "/board" },
        { label: "Escalated", n: ins.escalated, color: "#e8890c", href: "/board" },
        { label: "Fails (all time, synthetic)", n: ins.totalFails, color: "#c2262e", href: "/reports" },
      ].map(function (p) {
        return '<a class="pipe-link" href="#' + p.href + '"><span class="row gap-2">' + dot(p.color) + esc(p.label) + '</span><span class="row gap-2"><span class="pipe-n tabular">' + p.n + "</span>" + icon("arrow-right", "faint") + "</span></a>";
      }).join("") +
      "</div>";

    var legend =
      '<div class="legend-inline">' +
      [["#22a05b", "Pass"], ["#d9454c", "Fail"], ["#b8b8c0", "Exclusion"], ["#9db5ff", "Open"]].map(function (l) {
        return '<span class="row gap-1">' + dot(l[0]) + l[1] + "</span>";
      }).join("") + "</div>";

    var chart =
      '<div class="card span-2" data-tour="weekly">' + UI.cardHead("Weekly outcomes", "Cases per weekly sample, by result", legend) +
      '<div class="chart">' +
      ins.weekly.map(function (w) {
        var tip = "W" + w.week + ": " + w.pass + " pass · " + w.fail + " fail · " + w.exclusion + " excl · " + w.open + " open";
        return (
          '<div class="bar-col"><span class="bar-val tabular">' + w.total + '</span><div class="bar-stack" title="' + esc(tip) + '" style="height:' + (w.total / maxWeek) * 180 + 'px">' +
          '<div style="flex:' + w.pass + ';background:#22a05b"></div><div style="flex:' + w.fail + ';background:#d9454c"></div>' +
          '<div style="flex:' + w.exclusion + ';background:#b8b8c0"></div><div style="flex:' + w.open + ';background:#9db5ff"></div></div></div>'
        );
      }).join("") +
      '</div><div class="chart-axis">' + ins.weekly.map(function (w) { return '<span class="tabular">W' + w.week + "</span>"; }).join("") + "</div></div>";

    var insightCard =
      '<div class="card" data-tour="insights">' + UI.cardHead('<span class="row gap-2">' + icon("sparkles", "violet") + "Insights</span>", "Generated from the case data. Rule-based, no AI.") +
      '<ul class="insight-list">' +
      insights.map(function (i) {
        return '<li><span class="insight-dot">' + dot(TONE_COLOR[i.tone]) + "</span><span>" + esc(i.text) + (i.href ? ' <a class="link" href="#' + i.href + '">View →</a>' : i.scroll ? ' <button class="link" data-action="overview:scroll" data-target="' + i.scroll + '">View →</button>' : "") + "</span></li>";
      }).join("") + "</ul></div>";

    var why =
      '<div class="card" data-tour="why">' + UI.cardHead("Why justifications get challenged", "Ruleset hard stops on challenged cases") +
      '<div class="card-body stack-3">' +
      ins.topRules.slice(0, 7).map(function (r) {
        var color = Rules.RULE_BY_ID[r.id] && Rules.RULE_BY_ID[r.id].category === "hard_stop" ? "#d9454c" : "#e8a33c";
        return '<div><div class="bar-label"><span><span class="mono muted">' + r.id + "</span> · " + esc(r.title) + '</span><span class="tabular muted">' + r.n + '</span></div><div class="meter"><div style="width:' + r.share + "%;background:" + color + '"></div></div></div>';
      }).join("") + "</div></div>";

    var hotspots =
      '<div class="card">' + UI.cardHead("Application hotspots", "Fail rate on closed cases") + '<div class="list">' +
      ins.hotspots.slice(0, 6).map(function (h) {
        var label = h.failRate.toFixed(0) + "% fail";
        var tag = h.failRate >= 20 ? pill("bad", label) : h.failRate >= 10 ? '<span class="muted small tabular">' + label + "</span>" : pill("ok", label);
        return '<div class="list-row"><div><div class="strong">' + esc(h.app) + '</div><div class="muted small">' + h.total + " closed · " + h.challenged + " challenged</div></div>" + tag + "</div>";
      }).join("") + "</div></div>";

    var repeat =
      '<div class="card" id="repeat">' + UI.cardHead("Repeat reviewers", "2+ fails in the last 12 months") + '<div class="list">' +
      (ins.repeat.length
        ? ins.repeat.slice(0, 6).map(function (r) {
            var tag = r.fails >= 3 ? pill("bad", r.fails + " fails · HR rule") : '<span class="muted small tabular">' + r.fails + " fails</span>";
            return '<div class="list-row">' + UI.avatar(r.reviewer.name, 30) + '<div class="grow min-w-0"><div class="strong truncate">' + esc(r.reviewer.name) + '</div><div class="muted small">' + esc(r.segment) + " · " + r.cases + " sampled</div></div>" + tag + "</div>";
          }).join("")
        : '<p class="muted small pad">No repeat reviewers.</p>') +
      '</div><div class="reason-split">' +
      [["no_action", "No action"], ["insufficient", "Insufficient"], ["revoked", "Revoked"]].map(function (r) {
        return '<div><div class="tabular strong big-n">' + ins.failReasons[r[0]] + '</div><div class="muted tiny">' + r[1] + "</div></div>";
      }).join("") + "</div></div>";

    return (
      '<div class="container">' + head + kpis + toolbar + pipeline +
      '<div class="grid grid-main-side mt-5">' + chart + insightCard + "</div>" +
      '<div class="grid grid-thirds mt-4">' + why + hotspots + repeat + "</div>" +
      '<p class="footnote">Avg. days from challenge to fixed justification: ' + ins.avgResponse.toFixed(1) + " · All figures from synthetic data</p></div>"
    );
  }

  App.on("input", "overview:q", function (el) {
    ui.q = el.value;
  });
  App.on("click", "overview:scroll", function (el) {
    var t = document.getElementById(el.getAttribute("data-target"));
    if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  App.on("submit", "overview:search", function () {
    App.go("/queue?q=" + encodeURIComponent(ui.q) + "&stage=all");
  });

  App.register({ match: function (p) { return p === "/"; }, title: "Overview", icon: "layout-grid", render: render });
})();
