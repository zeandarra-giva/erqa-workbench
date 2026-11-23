/*
 * Phase 3 – HR Reporting routing (ERQA process map).
 *  • No action                         → remedial training (monthly LMS) AND HR (weekly)
 *  • Acted, still failed, 3rd in 12 mo → HR (weekly)
 *  • Acted, still failed, otherwise    → remedial training (monthly LMS)
 * "Revoked" is confirmed as FAIL; it is routed as an "acted" failure (flagged to confirm).
 */
var Routing = (function () {
  function reviewerFails12m(reviewerId, asOf, cases) {
    return cases.filter(function (c) {
      if (c.reviewer.id !== reviewerId || c.outcome !== "fail" || !c.closedAt) return false;
      var d = Dates.daysBetween(c.closedAt, asOf);
      return d >= 0 && d <= 365;
    }).length;
  }

  function routeFail(c, cases) {
    if (c.outcome !== "fail" || !c.failReason || !c.closedAt) return null;
    var fails12m = reviewerFails12m(c.reviewer.id, c.closedAt, cases);
    var repeat = fails12m >= 3;
    if (c.failReason === "no_action") {
      return { training: true, hr: true, fails12m: fails12m, repeat: repeat, rule: "Failure due to no action → training + HR (parallel)" };
    }
    var base = repeat
      ? { training: false, hr: true, fails12m: fails12m, repeat: repeat, rule: "Acted but failed; " + fails12m + " fails in 12 months (≥3) → HR" }
      : { training: true, hr: false, fails12m: fails12m, repeat: repeat, rule: "Acted but failed; " + fails12m + " fail(s) in 12 months (<3) → remedial training" };
    if (c.failReason === "revoked") base.needsConfirmation = "Routing for revoked-access fails is assumed to follow the 'acted' path – confirm with ERQA.";
    return base;
  }

  return { reviewerFails12m: reviewerFails12m, routeFail: routeFail };
})();

var Emails = (function () {
  var SIGN = "Entitlement Review Quality Assurance (ERQA)";

  function criteriaList(ruleIds) {
    if (!ruleIds || !ruleIds.length) return "  • (Analyst to specify the missing requirement)";
    return ruleIds
      .map(function (id) {
        var r = Rules.RULE_BY_ID[id];
        return r ? "  • " + r.title + ": " + r.reason : "  • " + id;
      })
      .join("\n");
  }
  function first(name) {
    return name.split(" ")[0];
  }

  function build(c, kind, id, createdAt) {
    var due = Dates.fmtDate(Dates.addDays(Dates.DEMO_TODAY, 7));
    var ref = "[ERQA " + c.id + "]";
    var to = c.reviewer.name, cc = c.reviewerManager.name, subject, body;

    if (kind === "challenge") {
      subject = ref + " Justification challenge – " + c.app + " · " + c.func;
      body =
        "Hello " + first(c.reviewer.name) + ",\n\n" +
        "Your justification for " + c.worker.name + "'s access to " + c.app + " (" + c.func + ") was sampled for quality review and does not yet meet the requirements.\n\n" +
        "What needs attention:\n" + criteriaList(c.failedRules) + "\n\n" +
        "Please perform a new (ad-hoc) review in EERS and enter a revised justification by " + due + " (7 calendar days). Each field must contain a distinct, specific answer in English.\n\n" +
        "Keep the case reference " + ref + " in the subject line of any reply.\n\n" + SIGN;
    } else if (kind === "escalation") {
      to = c.reviewerManager.name;
      cc = c.reviewer.name;
      subject = ref + " ESCALATION – justification required for " + c.app;
      body =
        "Hello " + first(c.reviewerManager.name) + ",\n\n" +
        "On " + Dates.fmtDate(c.challengeSentAt) + " we challenged a justification submitted by " + c.reviewer.name + " (your direct report) for " + c.worker.name + "'s access to " + c.app + " (" + c.func + "). The justification has not yet met the requirements.\n\n" +
        "Open items:\n" + criteriaList(c.failedRules) + "\n\n" +
        "Please ensure a new (ad-hoc) review with a complete justification is submitted in EERS by " + due + " (7 calendar days). If no adequate action is taken, the review will be closed as FAIL under the Accountability Framework Procedure.\n\n" + SIGN;
    } else {
      var why = c.failReason === "no_action" ? "no action taken" : c.failReason === "revoked" ? "access revoked – original justification not supported" : "revised justification still incomplete";
      subject = ref + " Justification review closed – FAIL";
      body =
        "Hello " + first(c.reviewer.name) + ",\n\n" +
        "The justification review for " + c.worker.name + "'s access to " + c.app + " (" + c.func + ") has been closed as FAIL (" + why + ").\n\n" +
        "Next steps are handled in line with the Accountability Framework Procedure.\n\n" + SIGN;
    }
    return { id: id, caseId: c.id, kind: kind, to: to, cc: cc, subject: subject, body: body, status: "draft", createdAt: createdAt };
  }

  return { build: build };
})();
