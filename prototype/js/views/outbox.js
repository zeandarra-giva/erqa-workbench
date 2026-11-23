/* Outbox – template-drafted emails, reviewed and approved in one batch. */
(function () {
  var esc = UI.esc, icon = UI.icon, pill = UI.pill, button = UI.button;
  var KIND = {
    challenge: { label: "Challenge", tone: "info" },
    escalation: { label: "Escalation", tone: null },
    outcome: { label: "Fail notice", tone: "bad" },
  };
  var ui = { tab: "draft", sel: new Set(), activeId: null, flash: null, edit: null };

  function list() {
    return Store.get().emails
      .filter(function (e) { return e.status === ui.tab; })
      .sort(function (a, b) { return (b.sentAt || b.createdAt).localeCompare(a.sentAt || a.createdAt); });
  }
  function active(items) {
    return items.find(function (e) { return e.id === ui.activeId; }) || items[0];
  }
  function kindTag(kind) {
    var k = KIND[kind];
    return k.tone ? pill(k.tone, k.label) : '<span class="muted tiny">' + k.label + "</span>";
  }
  function stamp(iso) {
    return esc((iso || "").replace("T", " ").slice(0, 16));
  }

  function preview(e) {
    if (!ui.edit || ui.edit.id !== e.id) ui.edit = { id: e.id, subject: e.subject, body: e.body };
    var editable = e.status === "draft";
    var dirty = ui.edit.subject !== e.subject || ui.edit.body !== e.body;
    return (
      '<div class="card mail-preview">' +
      '<div class="mail-meta">' +
      '<div class="mail-meta-row"><span class="muted">To</span><span class="strong">' + esc(e.to) + "</span></div>" +
      (e.cc ? '<div class="mail-meta-row"><span class="muted">Cc</span><span>' + esc(e.cc) + "</span></div>" : "") +
      '<div class="mail-meta-row"><span class="muted">Subject</span>' +
      (editable ? '<input id="mail-subject" class="input grow" value="' + esc(ui.edit.subject) + '" data-input="outbox:subject">' : '<span class="strong">' + esc(e.subject) + "</span>") + "</div>" +
      '<div class="mail-meta-row"><span class="muted">Case</span><a class="link" href="#/cases/' + e.caseId + '">' + esc(e.caseId) + " →</a></div></div>" +
      (editable
        ? '<textarea id="mail-body" class="mail-body" data-input="outbox:body">' + esc(ui.edit.body) + "</textarea>"
        : '<pre class="mail-body mail-body-static">' + esc(e.body) + "</pre>") +
      '<div class="mail-foot">' + icon("mail", "muted") + '<span class="tiny muted">' + (editable ? "Draft. Review before sending." : "Sent " + stamp(e.sentAt)) + "</span>" +
      (editable
        ? '<div class="row gap-2 ml-auto">' +
          button({ variant: "ghost", icon: "trash", label: "Discard", action: "outbox:discard" }) +
          (dirty ? button({ label: "Save edits", action: "outbox:save" }) : "") +
          button({ variant: "primary", icon: "send", label: "Approve & send", action: "outbox:send-one" }) + "</div>"
        : "") +
      "</div></div>"
    );
  }

  function render() {
    var s = Store.get();
    var drafts = s.emails.filter(function (e) { return e.status === "draft"; });
    var items = list();
    var current = active(items);

    var listCard =
      '<div class="card mail-list-card">' +
      '<div class="mail-tabs">' +
      ["draft", "sent"].map(function (t) {
        var label = t === "draft" ? "Drafts (" + drafts.length + ")" : "Sent (" + (s.emails.length - drafts.length) + ")";
        return '<button class="seg-btn' + (ui.tab === t ? " active" : "") + '" data-action="outbox:tab" data-tab="' + t + '">' + label + "</button>";
      }).join("") +
      (ui.tab === "draft" && ui.sel.size ? button({ variant: "primary", icon: "send", label: "Send " + ui.sel.size, action: "outbox:send-selected", cls: "btn-sm ml-auto" }) : "") +
      "</div>" +
      '<div class="mail-list scroll-thin" data-keep-scroll="mail-list">' +
      (items.length
        ? items.map(function (e) {
            return (
              '<div class="mail-item' + (current && current.id === e.id ? " active" : "") + '" data-action="outbox:open" data-id="' + e.id + '">' +
              (ui.tab === "draft" ? '<input type="checkbox" aria-label="Select email" data-change="outbox:toggle" data-id="' + e.id + '"' + (ui.sel.has(e.id) ? " checked" : "") + ">" : "") +
              '<div class="grow min-w-0"><div class="row between gap-2"><span class="truncate strong small">' + esc(e.to) + "</span>" + kindTag(e.kind) + "</div>" +
              '<div class="truncate small ink-2">' + esc(e.subject) + '</div><div class="tiny muted">' + stamp(e.sentAt || e.createdAt) + "</div></div></div>"
            );
          }).join("")
        : '<div class="pad-5">' + UI.empty(ui.tab === "draft" ? "No drafts" : "Nothing sent yet", ui.tab === "draft" ? "Challenge a case to draft an email." : "") + "</div>") +
      "</div></div>";

    var flash = ui.flash
      ? '<div class="banner banner-ok"><span>' + esc(ui.flash) + '</span><a class="link-u" href="#/board">See them on the Challenge Board →</a></div>'
      : "";

    return (
      '<div class="container">' +
      UI.pageHead("Outbox", "Challenge, escalation and fail emails are drafted from templates with the case details and the exact rules cited. Approve them as one batch.",
        button({ variant: "primary", icon: "send", label: "Approve & send all (" + drafts.length + ")", action: "outbox:send-all", disabled: !drafts.length, attrs: { "data-tour": "outbox-send" } })) +
      '<div class="banner banner-plain">' + icon("info") + "<span>Prototype: nothing is actually sent. In production this would send from the ERQA shared mailbox, with the case ID in the subject so replies can be matched to the case automatically.</span></div>" +
      flash +
      '<div class="grid grid-outbox" data-tour="outbox">' + listCard + (current ? preview(current) : '<div class="card pad-8">' + UI.empty("Select an email") + "</div>") + "</div></div>"
    );
  }

  function send(ids) {
    Store.dispatch({ type: "sendEmails", ids: ids });
    var n = ids.length;
    ui.flash = n + " email" + (n === 1 ? "" : "s") + " sent (simulated). The case" + (n === 1 ? " has" : "s have") + " moved to “Challenged” (or “Escalated”) and the 7-day clock has started.";
    ui.sel = new Set();
    App.render();
  }
  function currentEmail() {
    return active(list());
  }
  function saveEdits(e) {
    if (ui.edit && ui.edit.id === e.id && (ui.edit.subject !== e.subject || ui.edit.body !== e.body)) {
      Store.dispatch({ type: "editEmail", id: e.id, subject: ui.edit.subject, body: ui.edit.body });
    }
  }

  App.on("click", "outbox:tab", function (el) {
    ui.tab = el.getAttribute("data-tab");
    ui.activeId = null;
    ui.sel = new Set();
    App.render();
  });
  App.on("click", "outbox:open", function (el, e) {
    if (e.target.tagName === "INPUT") return;
    ui.activeId = el.getAttribute("data-id");
    App.render();
  });
  App.on("change", "outbox:toggle", function (el) {
    var id = el.getAttribute("data-id");
    if (el.checked) ui.sel.add(id);
    else ui.sel.delete(id);
    App.render();
  });
  App.on("input", "outbox:subject", function (el) { ui.edit.subject = el.value; App.render(); });
  App.on("input", "outbox:body", function (el) { ui.edit.body = el.value; App.render(); });
  App.on("click", "outbox:save", function () { saveEdits(currentEmail()); });
  App.on("click", "outbox:discard", function () { Store.dispatch({ type: "discardEmail", id: currentEmail().id }); });
  App.on("click", "outbox:send-one", function () {
    var e = currentEmail();
    saveEdits(e);
    send([e.id]);
  });
  App.on("click", "outbox:send-selected", function () { send(Array.from(ui.sel)); });
  App.on("click", "outbox:send-all", function () {
    send(Store.get().emails.filter(function (e) { return e.status === "draft"; }).map(function (e) { return e.id; }));
  });

  App.register({ match: function (p) { return p.indexOf("/outbox") === 0; }, title: "Outbox", icon: "send", render: render });
})();
