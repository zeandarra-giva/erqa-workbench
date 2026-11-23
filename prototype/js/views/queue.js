/* Assessment Queue – every sampled justification, pre-screened against the ruleset. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill;
  var ui = { q: "", qParam: null, sel: new Set(), flash: null };
  var ORDER = ["hard_stop", "review", "clear"];
  var TABS = [
    { k: "all", label: "All" },
    { k: "hard_stop", label: "Hard stop" },
    { k: "review", label: "Needs judgment" },
    { k: "clear", label: "Looks clear" },
  ];

  function filters(route) {
    return {
      verdict: route.params.get("verdict") || "all",
      stage: route.params.get("stage") || "to_assess",
      newWeek: Number(route.params.get("new")) || null,
    };
  }

  function rows(f) {
    var s = Store.get();
    var q = ui.q.toLowerCase();
    return s.cases
      .filter(function (c) { return f.stage === "all" || c.stage === f.stage; })
      .map(function (c) { return { c: c, a: Rules.assess(c, s.acronyms) }; })
      .filter(function (x) { return f.verdict === "all" || x.a.verdict === f.verdict; })
      .filter(function (x) {
        var c = x.c;
        return !q || [c.id, c.reviewer.name, c.worker.name, c.app, c.func, c.segment].some(function (v) { return v.toLowerCase().indexOf(q) !== -1; });
      })
      .sort(function (x, y) {
        return (Number(y.c.week === f.newWeek) - Number(x.c.week === f.newWeek)) || (y.c.week - x.c.week) || (ORDER.indexOf(x.a.verdict) - ORDER.indexOf(y.a.verdict));
      });
  }

  function counts(f) {
    var s = Store.get();
    var v = s.cases
      .filter(function (c) { return f.stage === "all" || c.stage === f.stage; })
      .map(function (c) { return Rules.assess(c, s.acronyms).verdict; });
    var n = function (k) { return v.filter(function (x) { return x === k; }).length; };
    return { all: v.length, hard_stop: n("hard_stop"), review: n("review"), clear: n("clear") };
  }

  function selection(list) {
    var selectable = list.filter(function (x) { return x.c.stage === "to_assess"; });
    var selected = selectable.filter(function (x) { return ui.sel.has(x.c.id); });
    return {
      selectable: selectable,
      selected: selected,
      toChallenge: selected.filter(function (x) { return x.a.verdict === "hard_stop"; }),
      toPass: selected.filter(function (x) { return x.a.verdict === "clear"; }),
      skipped: selected.filter(function (x) { return x.a.verdict === "review"; }),
    };
  }

  function render(route) {
    if (route.params.has("q") && route.params.get("q") !== ui.qParam) {
      ui.qParam = route.params.get("q");
      ui.q = ui.qParam;
    }
    var s = Store.get();
    var f = filters(route);
    var list = rows(f);
    var cnt = counts(f);
    var sel = selection(list);
    var allChecked = sel.selectable.length > 0 && sel.selectable.every(function (x) { return ui.sel.has(x.c.id); });

    var tabs =
      '<div class="segmented scroll-thin" data-tour="queue-tabs">' +
      TABS.map(function (t) {
        return '<button class="seg-btn' + (f.verdict === t.k ? " active" : "") + '" data-action="queue:verdict" data-v="' + t.k + '">' + t.label + ' <span class="seg-count tabular">' + cnt[t.k] + "</span></button>";
      }).join("") + "</div>";

    var stageSel =
      '<select class="select" data-change="queue:stage">' +
      [["to_assess", "To assess"], ["challenged", "Challenged"], ["escalated", "Escalated"], ["closed", "Closed"], ["all", "All stages"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (f.stage === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
      }).join("") + "</select>";

    var apply =
      '<div class="row wrap gap-2 ml-auto justify-end" data-tour="queue-apply">' +
      (sel.selected.length
        ? '<span class="small muted">' + sel.selected.length + ' selected: <b class="text-bad">' + sel.toChallenge.length + '</b> challenge · <b class="text-ok">' + sel.toPass.length + "</b> pass · " + sel.skipped.length + " skip</span>"
        : "") +
      UI.button({ variant: "primary", icon: "wand", label: "Apply suggestions", action: "queue:apply", disabled: !sel.selected.length }) +
      "</div>";

    var newBanner = "";
    if (f.newWeek) {
      var n = s.cases.filter(function (c) { return c.week === f.newWeek && c.stage === "to_assess"; }).length;
      newBanner =
        '<div class="banner banner-info"><span><b>' + n + " new cases</b> from the week " + f.newWeek + " intake are ready to assess. They're pre-screened and shown at the top.</span>" +
        '<button class="link-btn" data-action="queue:dismiss-new">Dismiss</button></div>';
    }
    var flash = ui.flash
      ? '<div class="banner banner-info"><span>' + esc(ui.flash) + '</span><span class="row gap-3"><a class="link-u" href="#/outbox">Open Outbox</a><button class="link-btn" data-action="queue:dismiss-flash">Dismiss</button></span></div>'
      : "";

    var body = list.map(function (x) {
      var c = x.c, a = x.a;
      var chips = a.hardStops.map(function (h) { return '<span class="rule-chip rule-chip-bad" title="' + esc(h.evidence) + '">' + h.rule + "</span>"; }).join("");
      if (!a.hardStops.length) chips = a.negotiables.length ? '<span class="muted tiny">Analyst judgment</span>' : '<span class="faint tiny">—</span>';
      var status = c.stage === "closed" ? UI.outcomePill(c) : c.stage === "to_assess" ? pill("neutral", "To assess") : UI.slaPill(c);
      return (
        "<tr>" +
        '<td class="cell-check">' + (c.stage === "to_assess" ? '<input type="checkbox" aria-label="Select ' + c.id + '" data-change="queue:toggle" data-id="' + c.id + '"' + (ui.sel.has(c.id) ? " checked" : "") + ">" : "") + "</td>" +
        '<td><a class="strong hover-accent" href="#/cases/' + c.id + '">' + c.id + "</a>" + (c.week === f.newWeek ? pill("info", "New", "ml-2") : "") + '<div class="muted tiny">W' + c.week + " · " + esc(c.reviewType) + "</div></td>" +
        '<td><div class="strong">' + esc(c.app) + '</div><div class="mono muted tiny">' + esc(c.func) + "</div></td>" +
        '<td><div class="row gap-2">' + UI.avatar(c.reviewer.name, 24) + "<span>" + esc(c.reviewer.name) + '</span></div><div class="muted tiny indent">' + esc(c.segment) + "</div></td>" +
        "<td>" + UI.verdictPill(a.verdict) + "</td>" +
        '<td><div class="row wrap gap-1">' + chips + "</div></td>" +
        "<td>" + status + "</td>" +
        '<td class="cell-go"><a href="#/cases/' + c.id + '" aria-label="Open ' + c.id + '">' + icon("chevron-right", "faint") + "</a></td></tr>"
      );
    }).join("");

    return (
      '<div class="container">' +
      UI.pageHead("Assessment Queue", "Every sampled justification is pre-screened against the ERQA ruleset. You decide; the system explains why.") +
      '<div class="toolbar mb-4">' + UI.searchBox("queue-q", ui.q, "Search case, reviewer, app…", "queue:q") + tabs + stageSel + apply + "</div>" +
      newBanner + flash +
      '<div class="card overflow-hidden" data-tour="queue-table"><div class="table-wrap scroll-thin" data-keep-scroll="queue-table">' +
      '<table class="table table-min-980"><thead><tr>' +
      '<th class="cell-check"><input type="checkbox" aria-label="Select all" data-change="queue:all"' + (allChecked ? " checked" : "") + "></th>" +
      "<th>Case</th><th>Access</th><th>Reviewer</th><th>Pre-screen</th><th>Rules triggered</th><th>Status</th><th></th></tr></thead>" +
      "<tbody>" + body + "</tbody></table></div>" +
      (list.length ? "" : '<div class="pad-6">' + UI.empty("Nothing here", "No cases match these filters.") + "</div>") +
      "</div></div>"
    );
  }

  function setParam(k, v) {
    var r = App.route();
    r.params.set(k, v);
    App.replace(App.withParams("/queue", r.params));
  }

  App.on("click", "queue:verdict", function (el) { setParam("verdict", el.getAttribute("data-v")); });
  App.on("change", "queue:stage", function (el) { setParam("stage", el.value); });
  App.on("input", "queue:q", function (el) { ui.q = el.value; App.render(); });
  App.on("change", "queue:toggle", function (el) {
    var id = el.getAttribute("data-id");
    if (el.checked) ui.sel.add(id);
    else ui.sel.delete(id);
    App.render();
  });
  App.on("change", "queue:all", function (el) {
    var r = App.route();
    var sel = selection(rows(filters(r)));
    ui.sel = el.checked ? new Set(sel.selectable.map(function (x) { return x.c.id; })) : new Set();
    App.render();
  });
  App.on("click", "queue:apply", function () {
    var sel = selection(rows(filters(App.route())));
    sel.toChallenge.forEach(function (x) { Store.dispatch({ type: "challenge", id: x.c.id, rules: Rules.uniqueRuleIds(x.a.hardStops) }); });
    sel.toPass.forEach(function (x) { Store.dispatch({ type: "pass", id: x.c.id, note: "Pre-screen clear – confirmed by analyst (bulk)" }); });
    ui.flash = sel.toChallenge.length + " challenge email" + (sel.toChallenge.length === 1 ? "" : "s") + " drafted in the Outbox · " + sel.toPass.length + " closed as PASS · " + sel.skipped.length + " left for judgment";
    ui.sel = new Set();
    App.render();
  });
  App.on("click", "queue:dismiss-flash", function () { ui.flash = null; App.render(); });
  App.on("click", "queue:dismiss-new", function () {
    var r = App.route();
    r.params.delete("new");
    App.replace(App.withParams("/queue", r.params));
  });

  App.register({ match: function (p) { return p.indexOf("/queue") === 0; }, title: "Assessment Queue", icon: "list-checks", render: render });
})();
