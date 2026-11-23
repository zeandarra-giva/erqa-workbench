/* Ruleset & Back-test – the decision matrix, its agreement with past decisions, and a live sandbox. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill, button = UI.button;
  var CAT = { hard_stop: { label: "Hard stop", tone: "bad" }, negotiable: { label: "Negotiable", tone: null }, acceptable: { label: "Acceptable", tone: "ok" } };
  var AUTO = { high: { label: "Automated · high confidence", tone: "ok" }, medium: { label: "Automated · medium confidence", tone: "info" }, human: { label: "Analyst judgment", tone: "neutral" } };
  var TRY_FIELDS = [
    ["justRole", "Worker's role"],
    ["justProcess", "Business process"],
    ["justComm", "Reason for low commonality"],
  ];
  var ui = { acr: "", tryText: { justRole: "SSU", justProcess: "Needed for daily work", justComm: "Small team" } };

  function render() {
    var s = Store.get();
    var bt = Insights.backtest(s.cases, s.acronyms);
    var tryA = Rules.assess(ui.tryText, s.acronyms);

    var matrix =
      '<div class="card">' + UI.cardHead("Decision matrix", "Checked in order: Step 0 → 4") +
      Rules.STEPS.map(function (st) {
        return (
          '<div class="matrix-step"><div class="matrix-step-head">Step ' + st.step + " · " + st.title + "</div>" +
          Rules.RULES.filter(function (r) { return r.step === st.step; }).map(function (r) {
            var cat = CAT[r.category];
            return (
              '<div class="matrix-row"><span class="mono muted strong">' + r.id + "</span>" +
              '<div><div class="strong small">' + esc(r.title) + '</div><div class="small ink-2">' + esc(r.condition) + '</div><div class="tiny muted">' + esc(r.reason) + "</div></div>" +
              '<div class="matrix-tag">' + (cat.tone ? pill(cat.tone, cat.label) : '<span class="tiny muted strong">' + cat.label + "</span>") + "</div>" +
              '<div class="matrix-tag">' + pill(AUTO[r.automation].tone, AUTO[r.automation].label) + "</div></div>"
            );
          }).join("") + "</div>"
        );
      }).join("") + "</div>";

    var tryIt =
      '<div class="card" data-tour="rules-try">' + UI.cardHead("Try it", "Type a justification and watch the checks run", UI.verdictPill(tryA.verdict)) +
      '<div class="card-body stack-2">' +
      TRY_FIELDS.map(function (f) {
        return '<label class="block"><span class="label-sm">' + f[1] + '</span><textarea id="try-' + f[0] + '" class="textarea" rows="2" data-input="rules:try" data-key="' + f[0] + '">' + esc(ui.tryText[f[0]]) + "</textarea></label>";
      }).join("") +
      '<div class="try-results">' +
      tryA.findings.map(function (f) {
        var cls = f.category === "hard_stop" ? "rule-chip-bad" : f.category === "negotiable" ? "rule-chip-neutral" : "rule-chip-ok";
        return '<div class="row gap-2 tiny align-start"><span class="rule-chip ' + cls + '">' + f.rule + '</span><span class="ink-2">' + esc(f.evidence) + "</span></div>";
      }).join("") + "</div></div></div>";

    var acronyms =
      '<div class="card">' + UI.cardHead("Standard acronyms", "Policy B: accepted without explanation", button({ variant: "ghost", label: "Reset", action: "rules:acr-reset" })) +
      '<div class="acr-list">' +
      s.acronyms.map(function (a) {
        return '<span class="acr">' + esc(a) + '<button aria-label="Remove ' + esc(a) + '" data-action="rules:acr-remove" data-acr="' + esc(a) + '">' + icon("x") + "</button></span>";
      }).join("") + "</div>" +
      '<form class="acr-form" data-submit="rules:acr-add"><input id="acr-input" class="input grow" placeholder="Add acronym, e.g. VCG" value="' + esc(ui.acr) + '" data-input="rules:acr">' +
      button({ icon: "plus", label: "Add", type: "submit" }) + "</form></div>";

    return (
      '<div class="container">' +
      UI.pageHead("Ruleset & Back-test", "The ERQA challenge ruleset as transparent checks. Every flag shows which rule fired and why, so it can be explained in an audit.") +
      '<div class="banner banner-warn">' + icon("info") + "<span>Source: the &quot;Rule Set&quot; document (pages 4–9 seen; it appears to be exported from a Stylus chat). Its official status still needs to be confirmed with ERQA. Pages 1–3 have not been reviewed.</span></div>" +
      '<div class="grid grid-4md" data-tour="rules-backtest">' +
      UI.kpi({ label: "Agreement with past decisions", value: bt.agreement.toFixed(0) + "%", sub: bt.n + " historical cases (synthetic)" }) +
      UI.kpi({ label: "Challenges caught (recall)", value: bt.recall.toFixed(0) + "%", sub: "<b>" + bt.tp + "</b> of " + (bt.tp + bt.fn) + " analyst challenges flagged" }) +
      UI.kpi({ label: "Flag precision", value: bt.precision.toFixed(0) + "%", sub: "<b>" + bt.fp + "</b> flags the analyst didn&apos;t challenge" }) +
      UI.kpi({ label: "Left to judgment", value: bt.review, sub: "Negotiable cases, by design" }) +
      "</div>" +
      '<p class="footnote-left">' + icon("flask") + 'On real data, this back-test would use the historical <code>Challenge</code> column, and should only include cases closed after the ruleset took effect.</p>' +
      '<div class="grid grid-rules">' + matrix + '<div class="stack-4">' + tryIt + acronyms + "</div></div></div>"
    );
  }

  App.on("input", "rules:try", function (el) {
    ui.tryText[el.getAttribute("data-key")] = el.value;
    App.render();
  });
  App.on("input", "rules:acr", function (el) { ui.acr = el.value; });
  App.on("submit", "rules:acr-add", function () {
    var v = ui.acr.trim().toUpperCase();
    ui.acr = "";
    var list = Store.get().acronyms;
    if (v && list.indexOf(v) === -1) Store.dispatch({ type: "setAcronyms", acronyms: list.concat([v]) });
    else App.render();
  });
  App.on("click", "rules:acr-remove", function (el) {
    var a = el.getAttribute("data-acr");
    Store.dispatch({ type: "setAcronyms", acronyms: Store.get().acronyms.filter(function (x) { return x !== a; }) });
  });
  App.on("click", "rules:acr-reset", function () { Store.dispatch({ type: "setAcronyms", acronyms: Rules.DEFAULT_ACRONYMS.slice() }); });

  App.register({ match: function (p) { return p.indexOf("/rules") === 0; }, title: "Ruleset & Back-test", icon: "shield-check", render: render });
})();
