/* Application state: one object, changed only through Store.dispatch(action).
   Persisted to localStorage so a demo survives a page refresh. */
var Store = (function () {
  var KEY = "erqa-workbench:v1";
  var ME = Seed.CURRENT_ANALYST + " (you)";
  var listeners = [];
  var emailSeq = 0;
  var state;

  function initial() {
    var s = Seed.generate();
    s.acronyms = Rules.DEFAULT_ACRONYMS.slice();
    return s;
  }

  function clone(o) {
    return Object.assign({}, o);
  }
  function find(s, id) {
    return s.cases.find(function (c) { return c.id === id; });
  }
  function patch(s, id, fn) {
    return Object.assign({}, s, {
      cases: s.cases.map(function (c) { return c.id === id ? fn(clone(c)) : c; }),
    });
  }
  function log(c, action, detail) {
    c.audit = c.audit.concat([{ at: Dates.nowStamp(), actor: ME, action: action, detail: detail }]);
    return c;
  }
  function newEmail(c, kind) {
    return Emails.build(c, kind, "EM-N" + Date.now() + "-" + emailSeq++, Dates.nowStamp());
  }

  function reduce(s, a) {
    var today = Dates.DEMO_TODAY;
    var due = Dates.addDays(today, 7);
    var c1;
    switch (a.type) {
      case "pass":
        return patch(s, a.id, function (c) {
          Object.assign(c, { stage: "closed", outcome: "pass", closedAt: today });
          return log(c, "Closed as PASS", a.note);
        });
      case "exclude":
        return patch(s, a.id, function (c) {
          Object.assign(c, { stage: "closed", outcome: "exclusion", exclusionType: a.exclusionType, closedAt: today });
          return log(c, "Closed as EXCLUSION", a.exclusionType);
        });
      case "challenge":
        c1 = log(Object.assign(clone(find(s, a.id)), { stage: "challenged", failedRules: a.rules, challengeSentAt: undefined, challengeDue: undefined }), "Challenge drafted", a.rules.join(", "));
        s = patch(s, a.id, function () { return c1; });
        return Object.assign({}, s, { emails: [newEmail(c1, "challenge")].concat(s.emails) });
      case "escalate":
        c1 = log(Object.assign(clone(find(s, a.id)), { stage: "escalated", escalationSentAt: undefined, escalationDue: undefined }), "Escalation drafted");
        s = patch(s, a.id, function () { return c1; });
        return Object.assign({}, s, { emails: [newEmail(c1, "escalation")].concat(s.emails) });
      case "fail":
        c1 = log(Object.assign(clone(find(s, a.id)), { stage: "closed", outcome: "fail", failReason: a.reason, closedAt: today }), "Closed as FAIL", a.reason.replace("_", " "));
        s = patch(s, a.id, function () { return c1; });
        return Object.assign({}, s, { emails: [newEmail(c1, "outcome")].concat(s.emails) });
      case "revise":
        return patch(s, a.id, function (c) {
          Object.assign(c, { justRole: a.justRole, justProcess: a.justProcess, justComm: a.justComm });
          return log(c, "Revised justification captured from EERS");
        });
      case "sendEmails": {
        var ids = new Set(a.ids);
        var now = Dates.nowStamp();
        s.emails
          .filter(function (e) { return ids.has(e.id) && e.status === "draft"; })
          .forEach(function (e) {
            s = patch(s, e.caseId, function (c) {
              if (e.kind === "challenge") return log(Object.assign(c, { challengeSentAt: today, challengeDue: due }), "Challenge email sent", "Due " + due);
              if (e.kind === "escalation") return log(Object.assign(c, { escalationSentAt: today, escalationDue: due }), "Escalation email sent", "Due " + due);
              return log(c, "Outcome email sent");
            });
          });
        return Object.assign({}, s, {
          emails: s.emails.map(function (e) { return ids.has(e.id) ? Object.assign(clone(e), { status: "sent", sentAt: now }) : e; }),
        });
      }
      case "discardEmail": {
        var e = s.emails.find(function (x) { return x.id === a.id; });
        if (!e) return s;
        s = Object.assign({}, s, { emails: s.emails.filter(function (x) { return x.id !== a.id; }) });
        if (e.kind === "challenge") s = patch(s, e.caseId, function (c) { return log(Object.assign(c, { stage: "to_assess", failedRules: undefined }), "Challenge draft discarded"); });
        if (e.kind === "escalation") s = patch(s, e.caseId, function (c) { return log(Object.assign(c, { stage: "challenged" }), "Escalation draft discarded"); });
        return s;
      }
      case "editEmail":
        return Object.assign({}, s, {
          emails: s.emails.map(function (e) { return e.id === a.id ? Object.assign(clone(e), { subject: a.subject, body: a.body }) : e; }),
        });
      case "import":
        return Object.assign({}, s, {
          cases: s.cases.filter(function (c) { return c.week !== a.run.week; }).concat(a.cases),
          imports: s.imports.filter(function (i) { return i.week !== a.run.week; }).concat([a.run]),
        });
      case "setAcronyms":
        return Object.assign({}, s, { acronyms: a.acronyms });
      case "reset":
        return initial();
      default:
        return s;
    }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable – keep working in memory */
    }
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* ignore */
    }
    return initial();
  }

  state = load();

  return {
    get: function () {
      return state;
    },
    dispatch: function (a) {
      state = reduce(state, a);
      save();
      listeners.forEach(function (fn) { fn(); });
    },
    subscribe: function (fn) {
      listeners.push(fn);
    },
  };
})();
