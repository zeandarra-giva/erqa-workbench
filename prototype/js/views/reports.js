/* HR & Training Reports – Phase 3 routing applied to every FAIL, with CSV exports. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill, button = UI.button;
  var ui = { week: null, month: null };
  var HEAD = ["Case", "Reviewer", "Reviewer ID", "Segment", "App", "Function", "Fail reason", "Fails 12m", "Closed", "Routing rule"];

  function routed() {
    var s = Store.get();
    return s.cases
      .filter(function (c) { return c.outcome === "fail" && c.closedAt; })
      .map(function (c) { return { c: c, r: Routing.routeFail(c, s.cases) }; })
      .sort(function (a, b) { return b.c.closedAt.localeCompare(a.c.closedAt); });
  }
  function monthLabel(m) {
    return new Date(m + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  function csvRow(x) {
    var c = x.c, r = x.r;
    return [c.id, c.reviewer.name, c.reviewer.id, c.segment, c.app, c.func, Model.FAIL_REASON_LABEL[c.failReason], r.fails12m, c.closedAt, r.rule];
  }
  function periods(fails) {
    var weeks = Array.from(new Set(fails.map(function (x) { return Dates.isoWeekOf(x.c.closedAt).week; }))).sort(function (a, b) { return b - a; });
    var months = Array.from(new Set(fails.map(function (x) { return x.c.closedAt.slice(0, 7); }))).sort().reverse();
    if (ui.week == null || weeks.indexOf(ui.week) === -1) ui.week = weeks[0] || 48;
    if (ui.month == null || months.indexOf(ui.month) === -1) ui.month = months[0] || "2026-11";
    return { weeks: weeks, months: months };
  }
  function hrRows(fails) {
    return fails.filter(function (x) { return x.r.hr && Dates.isoWeekOf(x.c.closedAt).week === ui.week; });
  }
  function lmsRows(fails) {
    return fails.filter(function (x) { return x.r.training && x.c.closedAt.indexOf(ui.month) === 0; });
  }

  function reportCard(o) {
    return (
      '<div class="card">' +
      UI.cardHead('<span class="row gap-2">' + o.icon + o.title + "</span>", o.sub,
        '<div class="row gap-2">' + o.picker + button({ icon: "download", label: "CSV", action: o.action, disabled: !o.rows.length }) + "</div>") +
      '<div class="list">' +
      (o.rows.length
        ? o.rows.map(function (x) {
            var c = x.c;
            return (
              '<a class="list-row" href="#/cases/' + c.id + '">' + UI.avatar(c.reviewer.name, 30) +
              '<div class="grow min-w-0"><div class="strong truncate">' + esc(c.reviewer.name) + '</div><div class="muted small truncate">' + c.id + " · " + esc(c.app) + " · " + esc(Model.FAIL_REASON_LABEL[c.failReason]) + "</div></div>" +
              (x.r.repeat ? pill("bad", x.r.fails12m + "× in 12 mo") : "") + "</a>"
            );
          }).join("")
        : '<div class="pad-3">' + UI.empty("No cases for this period") + "</div>") +
      "</div></div>"
    );
  }

  function render() {
    var fails = routed();
    var p = periods(fails);
    var hr = hrRows(fails), lms = lmsRows(fails);
    var pending = fails.filter(function (x) { return x.r.needsConfirmation; }).length;

    var weekPicker = '<select class="select" data-change="reports:week">' + p.weeks.map(function (w) { return '<option value="' + w + '"' + (w === ui.week ? " selected" : "") + ">Week " + w + "</option>"; }).join("") + "</select>";
    var monthPicker = '<select class="select" data-change="reports:month">' + p.months.map(function (m) { return '<option value="' + m + '"' + (m === ui.month ? " selected" : "") + ">" + monthLabel(m) + "</option>"; }).join("") + "</select>";

    var log = fails.slice(0, 40).map(function (x) {
      var c = x.c, r = x.r;
      return (
        '<tr><td><a class="strong hover-accent" href="#/cases/' + c.id + '">' + c.id + "</a></td><td>" + esc(c.reviewer.name) + "</td><td>" + esc(Model.FAIL_REASON_LABEL[c.failReason]) + "</td>" +
        '<td class="tabular' + (r.repeat ? " strong text-bad" : "") + '">' + r.fails12m + "</td>" +
        "<td>" + (r.training ? pill("violet", "Yes") : "—") + "</td><td>" + (r.hr ? pill("bad", "Yes") : "—") + "</td>" +
        '<td class="muted">' + esc(r.rule) + (r.needsConfirmation ? " ⚠" : "") + '</td><td class="muted">' + esc(Dates.fmtDate(c.closedAt)) + "</td></tr>"
      );
    }).join("");

    return (
      '<div class="container">' +
      UI.pageHead("HR & Training Reports", "Phase 3 routing is applied automatically to every FAIL: no action → training + HR · 3rd fail in 12 months → HR · otherwise → remedial training.") +
      '<div class="grid grid-3md">' +
      UI.kpi({ label: "Fails routed (all time)", value: fails.length, sub: pending + " revoked-access fails pending routing confirmation" }) +
      UI.kpi({ label: "HR report · week " + ui.week, value: hr.length, delta: "weekly", deltaTone: "bad", sub: "Accountability Framework" }) +
      UI.kpi({ label: "LMS training · " + monthLabel(ui.month), value: lms.length, delta: "monthly", deltaTone: "violet", sub: "Remedial training enrolment" }) +
      "</div>" +
      '<div class="grid grid-halves mt-4" data-tour="reports-cards">' +
      reportCard({ icon: icon("users", "text-bad"), title: "Weekly HR report", sub: "Fails due to no action, plus repeat (3×) offenders", picker: weekPicker, rows: hr, action: "reports:csv-hr" }) +
      reportCard({ icon: icon("graduation", "violet"), title: "Monthly LMS training report", sub: "Reviewers to enrol in remedial training", picker: monthPicker, rows: lms, action: "reports:csv-lms" }) +
      "</div>" +
      '<div class="card mt-4" data-tour="reports-log">' +
      UI.cardHead('<span class="row gap-2">' + icon("route", "accent") + "Routing log</span>", "Every routing decision with the rule that triggered it, for audit", button({ icon: "download", label: "Export", action: "reports:csv-log" })) +
      '<div class="table-wrap scroll-thin"><table class="table table-min-900 table-sm"><thead><tr><th>Case</th><th>Reviewer</th><th>Fail reason</th><th>Fails 12m</th><th>Training</th><th>HR</th><th>Rule applied</th><th>Closed</th></tr></thead><tbody>' +
      log + "</tbody></table></div></div></div>"
    );
  }

  App.on("change", "reports:week", function (el) { ui.week = Number(el.value); App.render(); });
  App.on("change", "reports:month", function (el) { ui.month = el.value; App.render(); });
  App.on("click", "reports:csv-hr", function () {
    UI.downloadCsv("ERQA_HR_report_W" + ui.week + ".csv", [HEAD].concat(hrRows(routed()).map(csvRow)));
  });
  App.on("click", "reports:csv-lms", function () {
    UI.downloadCsv("ERQA_LMS_training_" + ui.month + ".csv", [HEAD].concat(lmsRows(routed()).map(csvRow)));
  });
  App.on("click", "reports:csv-log", function () {
    UI.downloadCsv("ERQA_routing_log.csv", [HEAD].concat(routed().map(csvRow)));
  });

  App.register({ match: function (p) { return p.indexOf("/reports") === 0; }, title: "HR & Training Reports", icon: "file-chart", render: render });
})();
