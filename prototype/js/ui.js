/* Shared UI building blocks. Each helper returns an HTML string. */
var UI = (function () {
  var ICONS = {
    "layout-grid": '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    "file-input": '<path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M2 15h10"/><path d="m9 18 3-3-3-3"/>',
    "list-checks": '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    "square-kanban": '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
    send: '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>',
    "file-chart": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 18v-2"/><path d="M12 18v-4"/><path d="M16 18v-6"/>',
    "shield-check": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    "shield-alert": '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
    "rotate-ccw": '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/>',
    "chevrons-up-down": '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    "arrow-up-right": '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
    wand: '<path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
    "chevron-left": '<path d="m15 18-6-6 6-6"/>',
    "chevron-down": '<path d="m6 9 6 6 6-6"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    "check-circle": '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    "x-circle": '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    pencil: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>',
    user: '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    graduation: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    flask: '<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    "list-ordered": '<path d="M10 12h11"/><path d="M10 18h11"/><path d="M10 6h11"/><path d="M4 10h2"/><path d="M4 6h1v4"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
    presentation: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function icon(name, cls) {
    return '<svg class="ico ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  /** <tag attr="…"> builder for data-* attributes and friends. */
  function attrs(obj) {
    if (!obj) return "";
    return Object.keys(obj)
      .filter(function (k) { return obj[k] !== undefined && obj[k] !== null && obj[k] !== false; })
      .map(function (k) { return obj[k] === true ? " " + k : " " + k + '="' + esc(obj[k]) + '"'; })
      .join("");
  }

  function pill(tone, text, cls) {
    return '<span class="pill pill-' + (tone || "neutral") + (cls ? " " + cls : "") + '">' + text + "</span>";
  }

  function button(opts) {
    var variant = opts.variant || "secondary";
    var a = Object.assign({ type: opts.type || "button", class: "btn btn-" + variant + (opts.cls ? " " + opts.cls : ""), "data-action": opts.action, disabled: !!opts.disabled }, opts.attrs || {});
    return "<button" + attrs(a) + ">" + (opts.icon ? icon(opts.icon) : "") + (opts.label != null ? "<span>" + opts.label + "</span>" : "") + "</button>";
  }

  var AVATAR_COLORS = ["#e9d5ff", "#bfdbfe", "#fde68a", "#bbf7d0", "#fecdd3", "#c7d2fe", "#fed7aa", "#a5f3fc"];
  function avatar(name, size) {
    size = size || 26;
    var initials = name.split(" ").map(function (p) { return p[0]; }).slice(0, 2).join("").toUpperCase();
    var color = AVATAR_COLORS[(name.charCodeAt(0) + name.length) % AVATAR_COLORS.length];
    return '<span class="avatar" style="width:' + size + "px;height:" + size + "px;background:" + color + ";font-size:" + size * 0.38 + 'px">' + esc(initials) + "</span>";
  }

  function dot(color) {
    return '<span class="dot" style="background:' + color + '"></span>';
  }

  function cardHead(title, sub, action) {
    return (
      '<div class="card-head"><div class="card-head-text"><h3 class="card-title">' + title + "</h3>" +
      (sub ? '<p class="card-sub">' + sub + "</p>" : "") + "</div>" + (action || "") + "</div>"
    );
  }

  function kpi(o) {
    return (
      '<div class="card kpi"><div class="kpi-top"><span class="kpi-label">' + esc(o.label) + "</span>" +
      (o.href ? '<a class="icon-btn" href="#' + o.href + '" aria-label="Open ' + esc(o.label) + '">' + icon("arrow-up-right") + "</a>" : "") +
      '</div><div class="kpi-value-row"><span class="kpi-value tabular">' + o.value + "</span>" +
      (o.delta ? pill(o.deltaTone || "ok", esc(o.delta)) : "") +
      "</div>" + (o.sub ? '<div class="kpi-sub">' + o.sub + "</div>" : "") + "</div>"
    );
  }

  function pageHead(title, sub, action) {
    return '<div class="page-head"><div><h1 class="page-title">' + esc(title) + "</h1>" + (sub ? '<p class="page-sub">' + sub + "</p>" : "") + "</div>" + (action || "") + "</div>";
  }

  function empty(title, sub) {
    return '<div class="empty"><p class="empty-title">' + esc(title) + "</p>" + (sub ? '<p class="empty-sub">' + esc(sub) + "</p>" : "") + "</div>";
  }

  /* "Needs judgment" deliberately renders nothing – only hard stops and clear cases carry a status pill. */
  function verdictPill(v) {
    if (v === "hard_stop") return pill("bad", "Hard stop");
    if (v === "clear") return pill("ok", "Looks clear");
    return "";
  }

  function outcomePill(c) {
    if (c.outcome === "pass") return pill("ok", "Pass");
    if (c.outcome === "fail") return pill("bad", "Fail");
    if (c.outcome === "exclusion") return pill("neutral", "Exclusion");
    return "";
  }

  function slaPill(c) {
    var s = Insights.slaOf(c);
    if (s.state === "none" || s.state === "due_today" || s.state === "due_soon") return "";
    if (s.state === "overdue") return pill("bad", s.label);
    if (s.state === "awaiting_send") return pill("violet", s.label);
    return pill("ok", "On track");
  }

  function searchBox(id, value, placeholder, inputName) {
    return '<label class="search">' + icon("search") + '<input id="' + id + '" type="search" value="' + esc(value) + '" placeholder="' + esc(placeholder) + '" data-input="' + inputName + '" autocomplete="off"></label>';
  }

  function downloadCsv(name, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\n");
    var url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    esc: esc, icon: icon, attrs: attrs, pill: pill, button: button, avatar: avatar, dot: dot,
    cardHead: cardHead, kpi: kpi, pageHead: pageHead, empty: empty,
    verdictPill: verdictPill, outcomePill: outcomePill, slaPill: slaPill,
    searchBox: searchBox, downloadCsv: downloadCsv,
  };
})();
