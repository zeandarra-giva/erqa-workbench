/* Sidebar, top bar and mobile navigation wrapped around every screen. */
var Shell = (function () {
  var esc = UI.esc, icon = UI.icon;

  var LOGO =
    '<span class="brand-logo"><svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z"/><path d="M8.5 12l2.3 2.3 4.7-4.8"/></svg></span>';

  function isActive(path, href) {
    var base = href.split("?")[0];
    return base === "/" ? path === "/" : path.indexOf(base) === 0;
  }

  function navLink(path, item) {
    var on = isActive(path, item.href);
    return (
      '<a class="nav-link' + (on ? " active" : "") + '" href="#' + item.href + '">' +
      (on ? '<span class="nav-indicator"></span>' : "") + icon(item.icon) + '<span class="grow">' + esc(item.label) + "</span>" +
      (item.badge ? '<span class="nav-badge tabular">' + item.badge + "</span>" : "") + "</a>"
    );
  }

  function render(route, view, content) {
    var s = Store.get();
    var open = s.cases.filter(function (c) { return c.stage === "challenged" || c.stage === "escalated"; });
    var count = function (state) { return open.filter(function (c) { return Insights.slaOf(c).state === state; }).length; };
    var hardStops = s.cases.filter(function (c) { return c.stage === "to_assess" && Rules.assess(c, s.acronyms).verdict === "hard_stop"; }).length;

    var main = [
      { href: "/", label: "Overview", icon: "layout-grid" },
      { href: "/intake", label: "Weekly Intake", icon: "file-input" },
      { href: "/queue", label: "Assessment Queue", icon: "list-checks", badge: s.cases.filter(function (c) { return c.stage === "to_assess"; }).length },
      { href: "/board", label: "Challenge Board", icon: "square-kanban" },
      { href: "/outbox", label: "Outbox", icon: "send", badge: s.emails.filter(function (e) { return e.status === "draft"; }).length },
      { href: "/reports", label: "HR & Training Reports", icon: "file-chart" },
    ];
    var gov = [{ href: "/rules", label: "Ruleset & Back-test", icon: "shield-check" }];
    var saved = [
      { href: "/board?view=overdue", label: "Overdue responses", color: "#c2262e", n: count("overdue") },
      { href: "/board?view=today", label: "Due today", color: "#e8890c", n: count("due_today") },
      { href: "/queue?verdict=hard_stop", label: "Hard stops to assess", color: "#6d4ae8", n: hardStops },
    ];

    return (
      '<div class="layout">' +
      '<aside class="sidebar">' +
      '<div class="brand">' + LOGO +
      '<div class="brand-text"><div class="brand-name">ERQA Workbench</div><div class="brand-sub">Entitlements Governance</div></div>' +
      '<span class="brand-switch">' + icon("chevrons-up-down") + "</span></div>" +
      '<nav class="side-nav" data-tour="sidebar">' +
      '<div class="nav-label">WORKFLOW</div>' + main.map(function (i) { return navLink(route.path, i); }).join("") +
      '<div class="nav-label">GOVERNANCE</div>' + gov.map(function (i) { return navLink(route.path, i); }).join("") +
      '<div class="nav-label">SAVED VIEWS</div>' +
      saved.map(function (v) {
        return '<a class="saved-link" href="#' + v.href + '">' + UI.dot(v.color) + '<span class="grow">' + esc(v.label) + '</span><span class="tabular muted">' + v.n + "</span></a>";
      }).join("") +
      "</nav>" +
      '<div class="sidebar-foot"><button class="reset-btn" data-action="app:reset">' + icon("rotate-ccw") + "Reset demo data</button></div>" +
      "</aside>" +
      '<div class="main-col">' +
      '<header class="topbar"><span class="icon-circle">' + icon(view.icon) + '</span><span class="topbar-title">' + esc(view.title) + "</span>" +
      '<div class="topbar-right"><span class="chip chip-date">' + icon("calendar") + esc(Dates.fmtDate(Dates.DEMO_TODAY)) + "</span>" +
      '<span class="chip user-chip">' + UI.avatar(Seed.CURRENT_ANALYST, 26) + '<span class="user-name">' + esc(Seed.CURRENT_ANALYST) + "</span></span></div></header>" +
      '<nav class="mobile-nav scroll-thin">' +
      main.concat(gov).map(function (i) {
        return '<a class="mobile-link' + (isActive(route.path, i.href) ? " active" : "") + '" href="#' + i.href + '">' + icon(i.icon) + esc(i.label) + "</a>";
      }).join("") +
      "</nav>" +
      '<main class="content">' + content + "</main>" +
      "</div></div>"
    );
  }

  App.on("click", "app:reset", function () {
    if (window.confirm("Reset all demo data to the original synthetic dataset?")) Store.dispatch({ type: "reset" });
  });

  return { render: render };
})();
