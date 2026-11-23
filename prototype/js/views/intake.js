/* Weekly Intake – import the MSaaS extract, clean & validate it, create pre-screened cases. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill, button = UI.button;
  var ISSUE_TONE = { duplicate: "bad", placeholder: "neutral", country: "info", date: "neutral", html: "violet", missing: "neutral" };
  var COLUMNS = ["Signoff ID", "EERS Reviewer", "App Name", "SOA Country", "Date of EERS Review", "Review Type", "IAM Revocation", "Entitlement", "Pre-screen"];
  var ui = { raw: null, result: null, historyOpen: false, issuesOpen: false };

  function nextWeek() {
    return Math.max.apply(null, Store.get().imports.map(function (i) { return i.week; })) + 1;
  }
  function history() {
    return Store.get().imports.slice().sort(function (a, b) { return b.week - a.week; });
  }

  function needsCleaning(row, k) {
    var v = row[k] || "";
    if (k === "SOA Country") return Intake.KNOWN_COUNTRIES.indexOf(v) === -1;
    if (k === "Date of EERS Review") return !/^\d{4}-\d{2}-\d{2}$/.test(v);
    if (k === "Entitlement") return /<[^>]+>/.test(v);
    return v === "- Select -" || v === "";
  }

  /* Value after cleaning, for fields the pipeline can fix. Review Type can't be invented. */
  function cleanedValue(c, k) {
    if (k === "SOA Country") return c.country;
    if (k === "Date of EERS Review") return Dates.fmtDate(c.reviewDate);
    if (k === "IAM Revocation") return "(blank)";
    if (k === "Entitlement") return c.entitlement;
    return null;
  }

  function cell(row, k, dup, cleaned, extra) {
    var raw = row[k] || "";
    var shown = raw ? esc(raw) : "<i>empty</i>";
    if (dup || !needsCleaning(row, k)) return '<td class="' + extra + '">' + shown + "</td>";
    if (!ui.result) return '<td class="cell-dirty ' + extra + '">' + shown + "</td>";
    var fixed = cleaned ? cleanedValue(cleaned, k) : null;
    if (fixed === null) return '<td class="cell-missing ' + extra + '"><i>missing</i><div class="tiny">flagged</div></td>';
    return '<td class="cell-fixed ' + extra + '" title="Was: ' + esc(raw || "empty") + '"><div class="strong">' + esc(fixed) + '</div><div class="was truncate">' + (raw ? esc(raw) : "empty") + "</div></td>";
  }

  function table(acronyms) {
    var cleanedById = {};
    (ui.result ? ui.result.cases : []).forEach(function (c) { cleanedById[c.signoffId] = c; });
    var rows = ui.raw.map(function (r, i) {
      var dup = ui.raw.findIndex(function (x) { return x["Signoff ID"] === r["Signoff ID"]; }) !== i;
      var cleaned = ui.result && !dup ? cleanedById[r["Signoff ID"]] : null;
      var v = Rules.assess({ justRole: r.JUST_ROLE, justProcess: r.JUST_PROCESS, justComm: r.JUST_COMM }, acronyms).verdict;
      return (
        '<tr class="' + (dup ? "row-dup" : "") + '">' +
        '<td class="mono nowrap">' + esc(r["Signoff ID"]) + (dup ? pill("bad", "duplicate", "ml-2 no-strike") : "") + "</td>" +
        '<td class="nowrap">' + esc(r["EERS Reviewer"]) + '</td><td class="nowrap">' + esc(r["App Name"]) + "</td>" +
        ["SOA Country", "Date of EERS Review", "Review Type", "IAM Revocation"].map(function (k) { return cell(r, k, dup, cleaned, "nowrap"); }).join("") +
        cell(r, "Entitlement", dup, cleaned, "cell-ent truncate") +
        '<td class="nowrap">' + (v === "review" ? '<span class="tiny muted">Judgment</span>' : UI.verdictPill(v)) + "</td></tr>"
      );
    }).join("");
    return (
      '<div class="table-wrap table-tall scroll-thin" data-keep-scroll="intake-table"><table class="table table-min-1080 table-sm">' +
      '<thead class="sticky-head"><tr>' + COLUMNS.map(function (h) { return '<th class="nowrap">' + h + "</th>"; }).join("") + "</tr></thead>" +
      "<tbody>" + rows + "</tbody></table></div>"
    );
  }

  function legend() {
    var stage = !ui.result
      ? '<span class="legend-item"><span class="swatch swatch-dirty"></span>Needs cleaning (wrong format, placeholder or empty)</span>'
      : '<span class="legend-item"><span class="swatch swatch-fixed"></span>Fixed: new value shown, original crossed out below</span>' +
        '<span class="legend-item"><span class="swatch swatch-missing"></span>Missing in source, can&apos;t be fixed (flagged to data owner)</span>';
    return (
      '<div class="legend">' + '<span class="muted strong">Legend</span>' + stage +
      '<span class="legend-item"><span class="swatch swatch-dup"></span><span class="strike">Duplicate row</span> (removed)</span>' +
      '<span class="legend-item"><span class="muted">Pre-screen:</span>' + UI.verdictPill("hard_stop") + UI.verdictPill("clear") + '<span class="muted">Judgment = analyst decides</span></span></div>'
    );
  }

  function validation() {
    var r = ui.result;
    var stats = [
      ["Duplicates removed", r.run.duplicatesRemoved],
      ["Placeholders cleaned", r.run.placeholdersCleaned],
      ["Countries normalised", r.run.countriesNormalized],
      ["Dates parsed", r.run.datesParsed],
      ["HTML stripped", r.run.htmlStripped],
      ["Cases created", r.run.casesCreated],
    ];
    return (
      '<div class="card mb-4">' + UI.cardHead("Validation report", r.run.rawRows + " rows in → " + r.run.casesCreated + " clean cases, each pre-screened") +
      '<div class="grid grid-stats card-body">' +
      stats.map(function (s) { return '<div class="stat"><div class="stat-n tabular">' + s[1] + '</div><div class="stat-l truncate">' + s[0] + "</div></div>"; }).join("") +
      "</div>" +
      '<div class="disclosure"><button class="disclosure-btn" data-action="intake:issues">' + icon("chevron-down", ui.issuesOpen ? "rot-180 muted" : "muted") + r.issues.length + " fixes and flags, row by row</button>" +
      (ui.issuesOpen
        ? '<div class="issues scroll-thin">' +
          r.issues.map(function (i) {
            return '<div class="issue">' + pill(ISSUE_TONE[i.type], i.type, "issue-tag") + '<span class="ink-2">Row ' + i.row + ": " + esc(i.detail) + "</span></div>";
          }).join("") + "</div>"
        : "") +
      "</div></div>"
    );
  }

  function drawer() {
    if (!ui.historyOpen) return "";
    return (
      '<div class="drawer"><div class="drawer-backdrop" data-action="intake:history-close"></div>' +
      '<aside class="drawer-panel" role="dialog" aria-label="Import history">' +
      '<div class="drawer-head"><div><h2 class="drawer-title">Import history</h2><p class="tiny muted">Every weekly run is logged for audit</p></div>' +
      '<button class="icon-btn icon-btn-lg" aria-label="Close" data-action="intake:history-close">' + icon("x") + "</button></div>" +
      '<div class="drawer-body scroll-thin">' +
      history().map(function (h) {
        return (
          '<div class="history-item"><div class="row gap-3"><span class="tile-icon">' + icon("file-text", "muted") + "</span>" +
          '<div class="grow min-w-0"><div class="strong small">Week ' + h.week + ' sample</div><div class="tiny muted">' + esc(Dates.fmtDate(h.at)) + "</div></div>" +
          pill("ok", h.casesCreated + " cases") + "</div>" +
          '<div class="history-meta"><span>' + h.rawRows + " rows in</span><span>" + h.duplicatesRemoved + " duplicates</span><span>" + h.countriesNormalized + " countries fixed</span><span>" + h.htmlStripped + " HTML stripped</span></div></div>"
        );
      }).join("") + "</div></aside></div>"
    );
  }

  function render() {
    var s = Store.get();
    var week = nextWeek();
    var last = history()[0];
    var current = !ui.raw ? 1 : !ui.result ? 2 : 3;

    var stepper =
      '<div class="stepper">' +
      ["Import", "Clean & validate", "Create cases"].map(function (label, i) {
        var k = i + 1;
        var cls = k < current ? "done" : k === current ? "current" : "";
        return '<span class="step-chip ' + cls + '"><span class="tabular strong">' + k + "</span>" + label + "</span>" + (k < 3 ? '<span class="step-line"></span>' : "");
      }).join("") + "</div>";

    var sub = ui.raw
      ? ui.result
        ? "Cleaned. Green cells show the corrected value; review, then create the cases."
        : ui.raw.length + " rows as received (synthetic). Highlighted cells need cleaning."
      : "Week " + week + " sample expected " + esc(Dates.fmtDate(Dates.isoWeekStart(2026, week))) + ".";
    var actions = ui.raw
      ? '<div class="row wrap gap-2 justify-end">' + button({ variant: "ghost", icon: "x", label: "Cancel", action: "intake:cancel" }) +
        (!ui.result
          ? button({ variant: "primary", icon: "wand", label: "Clean & validate", action: "intake:clean" })
          : button({ variant: "primary", icon: "database", label: "Create " + ui.result.cases.length + " cases", action: "intake:commit" })) + "</div>"
      : "";

    var body = ui.raw
      ? legend() + table(s.acronyms)
      : '<div class="waiting"><span class="tile-icon tile-icon-lg">' + icon("file-input", "muted") + "</span>" +
        '<p class="strong">Waiting for the next MSaaS extract</p>' +
        '<p class="small muted narrow-text">In production the drop is picked up automatically. Here you can import a realistic, messy synthetic extract to see the pipeline clean it.</p>' +
        button({ variant: "primary", icon: "upload", label: "Import weekly sample", action: "intake:import", cls: "mt-1" }) +
        (last ? '<p class="tiny muted">Last import: week ' + last.week + " · " + last.casesCreated + " cases · " + esc(Dates.fmtDate(last.at)) + "</p>" : "") + "</div>";

    return (
      '<div class="container">' +
      UI.pageHead("Weekly Intake", "The MSaaS weekly sample is cleaned and loaded automatically, with no MS Access or manual upload.",
        '<div class="row wrap gap-2">' + button({ icon: "history", label: "Import history", action: "intake:history-open" }) +
          button({ variant: "primary", icon: "upload", label: "Import weekly sample", action: "intake:import", disabled: !!ui.raw, attrs: { "data-tour": "intake-import" } }) + "</div>") +
      stepper + (ui.result ? validation() : "") +
      '<div class="card overflow-hidden" data-tour="intake-drop">' + UI.cardHead(ui.raw ? "Raw extract · week " + week : "Next weekly drop", sub, actions) + '<div class="divider"></div>' + body + "</div>" +
      drawer() + "</div>"
    );
  }

  App.on("click", "intake:import", function () {
    ui.raw = Intake.generateRawDrop(Store.get().cases, nextWeek());
    ui.result = null;
    ui.issuesOpen = false;
    App.render();
  });
  App.on("click", "intake:clean", function () {
    var s = Store.get();
    ui.result = Intake.run(ui.raw, nextWeek(), s.cases, Seed.ANALYSTS);
    App.render();
  });
  App.on("click", "intake:cancel", function () {
    ui.raw = null;
    ui.result = null;
    App.render();
  });
  App.on("click", "intake:commit", function () {
    var r = ui.result;
    ui.raw = null;
    ui.result = null;
    Store.dispatch({ type: "import", run: r.run, cases: r.cases });
    App.go("/queue?new=" + r.run.week + "&stage=to_assess&verdict=all");
  });
  App.on("click", "intake:issues", function () { ui.issuesOpen = !ui.issuesOpen; App.render(); });
  App.on("click", "intake:history-open", function () { ui.historyOpen = true; App.render(); });
  App.on("click", "intake:history-close", function () { ui.historyOpen = false; App.render(); });
  App.onKey(function (e) {
    if (e.key === "Escape" && ui.historyOpen) {
      ui.historyOpen = false;
      App.render();
    }
  });

  App.register({ match: function (p) { return p.indexOf("/intake") === 0; }, title: "Weekly Intake", icon: "file-input", render: render });
})();
