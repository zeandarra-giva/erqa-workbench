/* Case detail – justification with evidence, pre-screen steps, decision panel, routing and audit trail. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill, button = UI.button;
  var FIELDS = [
    { key: "justRole", label: "Worker's role", field: "Role" },
    { key: "justProcess", label: "Business process", field: "Business Process" },
    { key: "justComm", label: "Reason for low commonality", field: "Low Commonality" },
  ];
  var ui = { id: null };

  function caseId(route) {
    return decodeURIComponent(route.path.split("/")[2] || "");
  }

  function ensureState(c) {
    if (ui.id === c.id) return;
    var a = Rules.assess(c, Store.get().acronyms);
    ui = {
      id: c.id,
      revising: false,
      rules: Rules.uniqueRuleIds(a.hardStops),
      excl: Model.EXCLUSION_TYPES[0],
      draft: { justRole: c.justRole, justProcess: c.justProcess, justComm: c.justComm },
    };
  }

  function findingLine(f) {
    var ico = f.category === "hard_stop" ? "x-circle" : f.category === "negotiable" ? "alert-triangle" : "check-circle";
    var tone = f.category === "hard_stop" ? "text-bad" : f.category === "negotiable" ? "text-warn" : "text-ok";
    return (
      '<div class="finding">' + icon(ico, tone) + '<span><span class="mono muted">' + f.rule + '</span> <span class="strong">' + esc(Rules.RULE_BY_ID[f.rule].title) + '</span><span class="ink-2">: ' + esc(f.evidence) + "</span>" +
      (f.confidence === "medium" && f.category !== "acceptable" ? ' <span class="muted tiny">(medium confidence)</span>' : "") + "</span></div>"
    );
  }

  function field(label, value, findings) {
    var worst = findings.some(function (f) { return f.category === "hard_stop"; }) ? " field-hard" : findings.some(function (f) { return f.category === "negotiable"; }) ? " field-neg" : "";
    return (
      '<div class="field' + worst + '"><div class="field-label">' + esc(label) + '</div><div class="field-value">' + (value ? esc(value) : '<i class="faint">(blank)</i>') + "</div>" +
      (findings.length ? '<div class="findings">' + findings.map(findingLine).join("") + "</div>" : "") + "</div>"
    );
  }

  function decisionPanel(c, a, sla) {
    var out = "";
    if (c.stage === "to_assess") {
      out +=
        '<div><div class="label-sm">Rules to cite in the challenge</div><div class="row wrap gap-1">' +
        Rules.RULES.filter(function (r) { return r.category === "hard_stop"; }).map(function (r) {
          var on = ui.rules.indexOf(r.id) !== -1;
          return '<button class="rule-toggle' + (on ? " on" : "") + '" title="' + esc(r.condition) + '" data-action="case:rule" data-rule="' + r.id + '">' + r.id + " " + esc(r.title) + "</button>";
        }).join("") + "</div></div>" +
        button({ variant: "primary", icon: "mail", label: "Challenge · draft email", action: "case:challenge", cls: "btn-block", disabled: !ui.rules.length }) +
        button({ variant: "success", icon: "check-circle", label: "Meets requirements · PASS", action: "case:pass", cls: "btn-block" }) +
        '<div class="row gap-2"><select class="select grow min-w-0" data-change="case:excl">' +
        Model.EXCLUSION_TYPES.map(function (t) { return "<option" + (ui.excl === t ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") +
        "</select>" + button({ label: "Exclude", action: "case:exclude" }) + "</div>" +
        (a.verdict === "hard_stop" && !ui.rules.length ? '<p class="tiny text-warn">Pre-screen found hard stops. Select at least one rule to challenge.</p>' : "");
    }
    if ((c.stage === "challenged" || c.stage === "escalated") && sla.state === "awaiting_send") {
      out +=
        '<div class="note-violet">The ' + (c.stage === "challenged" ? "challenge" : "escalation") + " email is waiting for your approval. The 7-day clock starts when it&apos;s sent." +
        '<a class="link-u block mt-2" href="#/outbox">Review in Outbox →</a></div>';
    }
    if (c.stage === "challenged" && c.challengeSentAt) {
      out +=
        '<p class="small muted">Challenge sent ' + esc(Dates.fmtDate(c.challengeSentAt)) + " to " + esc(c.reviewer.name) + " (cc " + esc(c.reviewerManager.name) + ").</p>" +
        button({ variant: "success", icon: "check-circle", label: "Revised justification passes · PASS", action: "case:pass-revised", cls: "btn-block" }) +
        button({ variant: "danger", icon: "ban", label: "Access revoked · FAIL", action: "case:fail", attrs: { "data-reason": "revoked" }, cls: "btn-block" }) +
        button({ variant: sla.state === "overdue" ? "primary" : "secondary", icon: "arrow-up-right", label: "No action / still insufficient · Escalate", action: "case:escalate", cls: "btn-block" }) +
        (sla.state === "overdue" ? '<p class="tiny text-bad">Response window has passed. Escalation is due.</p>' : "");
    }
    if (c.stage === "escalated" && c.escalationSentAt) {
      out +=
        '<p class="small muted">Escalated ' + esc(Dates.fmtDate(c.escalationSentAt)) + " to " + esc(c.reviewerManager.name) + ".</p>" +
        button({ variant: "success", icon: "check-circle", label: "Revised justification passes · PASS", action: "case:pass-escalated", cls: "btn-block" }) +
        button({ variant: "danger", icon: "ban", label: "Access revoked · FAIL", action: "case:fail", attrs: { "data-reason": "revoked" }, cls: "btn-block" }) +
        button({ variant: "danger", icon: "clock", label: "No action · FAIL", action: "case:fail", attrs: { "data-reason": "no_action" }, cls: "btn-block" }) +
        button({ variant: "danger", icon: "x-circle", label: "Still insufficient · FAIL", action: "case:fail", attrs: { "data-reason": "insufficient" }, cls: "btn-block" });
    }
    if (c.stage === "closed") {
      out +=
        '<div class="kv"><span class="muted">Outcome</span>' + UI.outcomePill(c) + "</div>" +
        (c.failReason ? '<div class="kv"><span class="muted">Fail reason</span><span>' + esc(Model.FAIL_REASON_LABEL[c.failReason]) + "</span></div>" : "") +
        (c.exclusionType ? '<div class="kv"><span class="muted">Exclusion type</span><span>' + esc(c.exclusionType) + "</span></div>" : "") +
        '<div class="kv"><span class="muted">Closed</span><span>' + esc(Dates.fmtDate(c.closedAt)) + "</span></div>";
    }
    return out;
  }

  function render(route) {
    var s = Store.get();
    var id = caseId(route);
    var c = s.cases.find(function (x) { return x.id === id; });
    if (!c) return '<div class="narrow pt-10">' + UI.empty("Case not found", "No case with id " + id + ".") + "</div>";
    ensureState(c);

    var a = Rules.assess(c, s.acronyms);
    var sla = Insights.slaOf(c);
    var routing = Routing.routeFail(c, s.cases);
    var emails = s.emails.filter(function (e) { return e.caseId === c.id; });
    var byField = function (fld) {
      return a.findings.filter(function (f) { return f.field === fld || (f.field === "All fields" && fld === "Role"); });
    };
    var stepStatus = function (step) {
      var fs = a.findings.filter(function (f) { return f.step === step; });
      if (fs.some(function (f) { return f.category === "hard_stop"; })) return "hard";
      if (fs.some(function (f) { return f.category === "negotiable"; })) return "neg";
      return "ok";
    };

    var header =
      '<div class="breadcrumb"><a href="#/queue">Assessment Queue</a>' + icon("chevron-right") + "<span>" + esc(c.id) + "</span></div>" +
      '<div class="case-head"><div><div class="row wrap gap-2"><h1 class="page-title">' + esc(c.app) + "</h1>" +
      (c.stage === "to_assess" ? UI.verdictPill(a.verdict) : "") + (c.stage === "closed" ? UI.outcomePill(c) : UI.slaPill(c)) +
      pill("neutral", Model.STAGE_LABEL[c.stage]) + '</div><p class="mono muted small mt-1">' + esc(c.func) + " · " + c.environment + "</p></div>" +
      '<div class="people">' +
      '<div class="row gap-2">' + UI.avatar(c.reviewer.name, 30) + '<div><div class="strong">' + esc(c.reviewer.name) + '</div><div class="muted">EERS reviewer · ' + c.managerOrDelegate + "</div></div></div>" +
      icon("arrow-right", "faint") +
      '<div class="row gap-2"><span class="avatar avatar-plain">' + icon("user", "muted") + '</span><div><div class="strong">' + esc(c.worker.name) + '</div><div class="muted">Worker</div></div></div>' +
      "</div></div>";

    var justification =
      '<div class="card" data-tour="case-fields">' + UI.cardHead("Justification", "Submitted in EERS on " + esc(Dates.fmtDate(c.reviewDate)) + " · " + esc(c.reviewType) + " review") +
      '<div class="card-body stack-3"><div class="grid grid-2sm">' +
      '<div class="field"><div class="field-label">Reason access is needed (dropdown)</div><div class="field-value">' + esc(c.template) + "</div></div>" +
      '<div class="field"><div class="field-label">Frequency of use (dropdown)</div><div class="field-value">' + esc(c.frequency) + "</div></div></div>" +
      FIELDS.map(function (f) { return field(f.label, c[f.key], byField(f.field)); }).join("") +
      "</div></div>";

    var revision = "";
    if (c.stage === "challenged" || c.stage === "escalated") {
      var draftA = Rules.assess(Object.assign({}, c, ui.draft), s.acronyms);
      revision =
        '<div class="card">' + UI.cardHead("Revised justification", "Paste what the reviewer re-entered in EERS. The pre-screen re-runs instantly.",
          button({ variant: "ghost", icon: "pencil", label: ui.revising ? "Hide" : "Capture revision", action: "case:toggle-revise" })) +
        (ui.revising
          ? '<div class="card-body stack-3">' +
            FIELDS.map(function (f) {
              return '<label class="block"><span class="label-sm">' + f.label + '</span><textarea id="rev-' + f.key + '" class="textarea" rows="2" data-input="case:draft" data-key="' + f.key + '">' + esc(ui.draft[f.key]) + "</textarea></label>";
            }).join("") +
            '<div class="recheck"><span class="row wrap gap-2 small">Re-check: ' + UI.verdictPill(draftA.verdict) +
            draftA.hardStops.map(function (h) { return '<span class="rule-chip rule-chip-bad">' + h.rule + "</span>"; }).join("") + "</span>" +
            button({ variant: "primary", label: "Save revision", action: "case:save-revision" }) + "</div></div>"
          : "") +
        "</div>";
    }

    var details = [
      ["Entitlement", c.entitlement], ["App ID", c.appId], ["Sign-off ID", c.signoffId],
      ["Segment", c.segment], ["Sector", c.sector], ["Country / Region", c.country + " · " + c.region],
      ["Reviewer's manager", c.reviewerManager.name], ["Analyst", c.analyst], ["Weekly sample", "W" + c.week + " · " + c.year],
    ];
    var access =
      '<div class="card">' + UI.cardHead("Access & organisation") + '<dl class="dl-grid">' +
      details.map(function (d) { return "<div><dt>" + d[0] + "</dt><dd>" + esc(d[1]) + "</dd></div>"; }).join("") + "</dl></div>";

    var audit =
      '<div class="card" data-tour="case-audit">' + UI.cardHead("Audit trail", "Every action is logged automatically. This replaces evidence saved by hand to the shared drive.") +
      '<ol class="timeline">' +
      c.audit.slice().reverse().map(function (e) {
        return '<li><span class="timeline-dot"></span><div class="small"><span class="strong">' + esc(e.action) + "</span>" + (e.detail ? '<span class="muted"> · ' + esc(e.detail) + "</span>" : "") + '</div><div class="muted tiny">' + esc(e.actor) + " · " + esc(e.at.replace("T", " ").slice(0, 16)) + "</div></li>";
      }).join("") + "</ol></div>";

    var prescreen =
      '<div class="card" data-tour="case-prescreen">' +
      UI.cardHead('<span class="row gap-2">' + icon("shield-check", "accent") + "Pre-screen</span>", "ERQA ruleset · suggestion only, the analyst decides", UI.verdictPill(a.verdict)) +
      '<ol class="steps">' +
      Rules.STEPS.map(function (st) {
        var k = stepStatus(st.step);
        var label = k === "hard" ? "Hard stop" : k === "neg" ? "Judgment" : "OK";
        return '<li><span class="step-num step-' + k + '">' + st.step + '</span><span class="grow small">' + st.title + '</span><span class="step-label step-label-' + k + '">' + label + "</span></li>";
      }).join("") + "</ol></div>";

    var decision =
      '<div class="card" data-tour="case-decision">' + UI.cardHead("Decision", sla.due ? esc(sla.label) + " · due " + esc(Dates.fmtDate(sla.due)) : "") +
      '<div class="card-body stack-3">' + decisionPanel(c, a, sla) + "</div></div>";

    var routingCard = routing
      ? '<div class="card">' + UI.cardHead("Phase 3 routing", "Applied automatically from the process map rules") +
        '<div class="card-body stack-2 small">' +
        '<div class="kv"><span class="muted">Reviewer fails · 12 months</span><span class="tabular strong">' + routing.fails12m + (routing.repeat ? " · 3× rule met" : "") + "</span></div>" +
        '<div class="kv"><span class="muted">Monthly LMS remedial training</span>' + (routing.training ? pill("violet", "Included") : '<span class="faint">—</span>') + "</div>" +
        '<div class="kv"><span class="muted">Weekly HR report</span>' + (routing.hr ? pill("bad", "Included") : '<span class="faint">—</span>') + "</div>" +
        '<p class="note">' + esc(routing.rule) + "</p>" +
        (routing.needsConfirmation ? '<p class="tiny text-warn">⚠ ' + esc(routing.needsConfirmation) + "</p>" : "") +
        "</div></div>"
      : "";

    var emailCard =
      '<div class="card">' + UI.cardHead("Emails") + '<div class="list">' +
      (emails.length
        ? emails.map(function (e) {
            return '<a class="list-row" href="#/outbox">' + icon("mail", "muted") + '<span class="grow truncate small">' + esc(e.subject) + "</span>" + pill(e.status === "draft" ? "violet" : "neutral", e.status === "draft" ? "Draft" : "Sent") + "</a>";
          }).join("")
        : '<p class="muted small pad">No emails yet.</p>') +
      "</div></div>";

    return (
      '<div class="container">' + header +
      '<div class="grid grid-case"><div class="stack-4">' + justification + revision + access + audit + "</div>" +
      '<div class="stack-4">' + prescreen + decision + routingCard + emailCard + "</div></div></div>"
    );
  }

  function current() {
    return ui.id;
  }

  App.on("click", "case:rule", function (el) {
    var r = el.getAttribute("data-rule");
    var i = ui.rules.indexOf(r);
    if (i === -1) ui.rules.push(r);
    else ui.rules.splice(i, 1);
    App.render();
  });
  App.on("change", "case:excl", function (el) { ui.excl = el.value; });
  App.on("click", "case:challenge", function () { Store.dispatch({ type: "challenge", id: current(), rules: ui.rules.slice() }); });
  App.on("click", "case:pass", function () { Store.dispatch({ type: "pass", id: current() }); });
  App.on("click", "case:pass-revised", function () { Store.dispatch({ type: "pass", id: current(), note: "Revised justification meets requirements" }); });
  App.on("click", "case:pass-escalated", function () { Store.dispatch({ type: "pass", id: current(), note: "Revised justification after escalation" }); });
  App.on("click", "case:exclude", function () { Store.dispatch({ type: "exclude", id: current(), exclusionType: ui.excl }); });
  App.on("click", "case:escalate", function () { Store.dispatch({ type: "escalate", id: current() }); });
  App.on("click", "case:fail", function (el) { Store.dispatch({ type: "fail", id: current(), reason: el.getAttribute("data-reason") }); });
  App.on("click", "case:toggle-revise", function () { ui.revising = !ui.revising; App.render(); });
  App.on("input", "case:draft", function (el) {
    ui.draft[el.getAttribute("data-key")] = el.value;
    App.render();
  });
  App.on("click", "case:save-revision", function () {
    ui.revising = false;
    Store.dispatch(Object.assign({ type: "revise", id: current() }, ui.draft));
  });

  App.register({ match: function (p) { return p.indexOf("/cases/") === 0; }, title: "Case", icon: "list-checks", render: render });
})();
