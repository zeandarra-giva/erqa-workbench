/* Challenge Board – kanban of cases an analyst has challenged, from email approval to resolution. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill;
  var ui = { q: "" };
  var VIEWS = [
    { k: "all", label: "All cases" },
    { k: "today", label: "Due today" },
    { k: "overdue", label: "Overdue" },
  ];

  function isJustSent(c) {
    return (c.stage === "challenged" && c.challengeSentAt === Dates.DEMO_TODAY) || (c.stage === "escalated" && c.escalationSentAt === Dates.DEMO_TODAY);
  }

  function card(c) {
    var sla = Insights.slaOf(c);
    var n = (c.failedRules || []).length;
    var when = sla.due ? "Due " + Dates.fmtShort(sla.due) : c.closedAt ? "Closed " + Dates.fmtShort(c.closedAt) : "W" + c.week;
    return (
      '<a class="kcard" href="#/cases/' + c.id + '">' +
      '<div class="kcard-top"><div class="min-w-0">' + (isJustSent(c) ? pill("info", "Just sent", "mb-1") : "") +
      '<div class="kcard-app">' + esc(c.app) + '</div><div class="kcard-func mono">' + esc(c.func) + "</div></div>" +
      (c.stage === "closed" ? UI.outcomePill(c) : UI.slaPill(c)) + "</div>" +
      '<div class="kcard-meta"><span class="row gap-1">' + icon("shield-alert", "muted") + n + " rule" + (n === 1 ? "" : "s") + '</span><span class="faint">·</span><span class="row gap-1">' + icon("calendar", "muted") + esc(when) + "</span></div>" +
      '<div class="kcard-foot">' + UI.avatar(c.reviewer.name, 26) + '<span class="grow truncate">' + esc(c.reviewer.name) + '</span><span class="icon-btn">' + icon("more") + "</span></div></a>"
    );
  }

  function render(route) {
    var s = Store.get();
    var view = route.params.get("view") || "all";
    var q = ui.q.toLowerCase();
    var cs = s.cases.filter(function (c) {
      if (q && ![c.id, c.app, c.reviewer.name, c.func].some(function (v) { return v.toLowerCase().indexOf(q) !== -1; })) return false;
      var st = Insights.slaOf(c).state;
      if (view === "overdue") return st === "overdue";
      if (view === "today") return st === "due_today";
      return true;
    });

    var cols = [
      { key: "await", title: "Email awaiting approval", color: "#6d4ae8", items: cs.filter(function (c) { return Insights.slaOf(c).state === "awaiting_send"; }), hint: "Drafted, not sent yet. Approve in the Outbox and the case moves to Challenged." },
      { key: "chal", title: "Challenged", color: "#2f62f5", items: cs.filter(function (c) { return c.stage === "challenged" && c.challengeSentAt; }), hint: "Email sent · reviewer has 7 days to respond" },
      { key: "esc", title: "Escalated", color: "#e8890c", items: cs.filter(function (c) { return c.stage === "escalated" && c.escalationSentAt; }), hint: "Manager · 7 days" },
      {
        key: "closed", title: "Resolved (last 14 days)", color: "#15803d", hint: "",
        items: view === "all" ? cs.filter(function (c) { return c.stage === "closed" && !!c.challengeSentAt && c.closedAt && Dates.daysBetween(c.closedAt, Dates.DEMO_TODAY) <= 14; }) : [],
      },
    ];

    var drafts = s.emails.filter(function (e) { return e.status === "draft"; }).length;
    var toolbar =
      '<div class="toolbar mb-4">' + UI.searchBox("board-q", ui.q, "Search case, app or reviewer…", "board:q") +
      '<div class="segmented">' +
      VIEWS.map(function (v) {
        return '<button class="seg-btn' + (view === v.k ? " active" : "") + '" data-action="board:view" data-v="' + v.k + '">' + (v.k !== "all" ? icon("filter") : "") + v.label + "</button>";
      }).join("") + "</div>" +
      '<a class="btn btn-secondary ml-auto" href="#/outbox">' + icon("mail", "violet") + "<span>Outbox</span>" + pill("violet", drafts + " drafts") + "</a></div>";

    var board =
      '<div class="board scroll-thin" data-tour="board" data-keep-scroll="board">' +
      cols.map(function (col) {
        var items = col.items.slice().sort(function (a, b) {
          var la = Insights.slaOf(a).left, lb = Insights.slaOf(b).left;
          return (Number(isJustSent(b)) - Number(isJustSent(a))) || ((la == null ? 99 : la) - (lb == null ? 99 : lb));
        });
        var overdue = col.items.filter(function (c) { return Insights.slaOf(c).state === "overdue"; }).length;
        return (
          '<section class="kcol"><div class="kcol-head">' + UI.dot(col.color) + '<span class="kcol-title grow">' + col.title + "</span>" +
          pill("neutral", col.items.length + " cases") + (overdue ? pill("bad", overdue + " overdue") : "") + "</div>" +
          '<div class="kcol-list scroll-thin" data-keep-scroll="col-' + col.key + '">' +
          (items.length ? items.map(card).join("") : '<p class="kcol-empty">No cases</p>') + "</div>" +
          (col.hint ? '<p class="kcol-hint">' + col.hint + "</p>" : "") + "</section>"
        );
      }).join("") + "</div>";

    return (
      "<div>" +
      UI.pageHead("Challenge Board", "Only cases an analyst has challenged, from email approval to resolution. Undecided cases stay in the Assessment Queue.") +
      toolbar + board + "</div>"
    );
  }

  App.on("input", "board:q", function (el) { ui.q = el.value; App.render(); });
  App.on("click", "board:view", function (el) {
    var v = el.getAttribute("data-v");
    App.replace(v === "all" ? "/board" : "/board?view=" + v);
  });

  App.register({ match: function (p) { return p.indexOf("/board") === 0; }, title: "Challenge Board", icon: "square-kanban", render: render });
})();
