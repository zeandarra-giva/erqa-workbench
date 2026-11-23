/*
 * App core: hash router, rendering and event delegation.
 * Views register themselves with App.register({ match, render, ... }) and declare
 * their behaviour through data-action / data-input / data-change / data-submit attributes.
 */
var App = (function () {
  var views = [];
  var handlers = { click: {}, input: {}, change: {}, submit: {} };
  var keyListeners = [];
  var renderListeners = [];
  var lastPath = null;
  var root;

  function route() {
    var h = location.hash.slice(1) || "/";
    var i = h.indexOf("?");
    return { path: i < 0 ? h : h.slice(0, i), params: new URLSearchParams(i < 0 ? "" : h.slice(i + 1)) };
  }

  function register(view) {
    views.push(view);
  }
  function on(type, name, fn) {
    handlers[type][name] = fn;
  }
  function onKey(fn) {
    keyListeners.push(fn);
  }
  function onRender(fn) {
    renderListeners.push(fn);
  }

  function go(path) {
    if ((location.hash.slice(1) || "/") === path) render();
    else location.hash = path;
  }
  function replace(path) {
    history.replaceState(null, "", "#" + path);
    render();
  }
  function withParams(path, params) {
    var qs = params.toString();
    return path + (qs ? "?" + qs : "");
  }

  function viewFor(path) {
    return views.find(function (v) { return v.match(path); }) || views[0];
  }

  // Keep focus, caret and inner scroll positions across re-renders.
  function snapshot() {
    var a = document.activeElement;
    var focus = a && a.id && root.contains(a) ? { id: a.id, s: a.selectionStart, e: a.selectionEnd, top: a.scrollTop } : null;
    var scrolls = Array.prototype.map.call(document.querySelectorAll("[data-keep-scroll]"), function (el) {
      return [el.getAttribute("data-keep-scroll"), el.scrollTop, el.scrollLeft];
    });
    return { focus: focus, scrolls: scrolls };
  }
  function restore(snap) {
    snap.scrolls.forEach(function (s) {
      var el = document.querySelector('[data-keep-scroll="' + s[0] + '"]');
      if (el) {
        el.scrollTop = s[1];
        el.scrollLeft = s[2];
      }
    });
    if (snap.focus) {
      var el = document.getElementById(snap.focus.id);
      if (el) {
        el.focus({ preventScroll: true });
        try {
          if (snap.focus.s != null) el.setSelectionRange(snap.focus.s, snap.focus.e);
        } catch (e) {
          /* not a text field */
        }
        el.scrollTop = snap.focus.top;
      }
    }
  }

  function render() {
    var r = route();
    var view = viewFor(r.path);
    var same = r.path === lastPath;
    var y = window.scrollY;
    var snap = snapshot();
    root.innerHTML = Shell.render(r, view, view.render(r));
    if (same) {
      restore(snap);
      window.scrollTo(0, y);
    } else {
      window.scrollTo(0, 0);
    }
    lastPath = r.path;
    renderListeners.forEach(function (fn) { fn(r); });
  }

  function delegate(type, attr) {
    document.addEventListener(type, function (e) {
      var el = e.target.closest ? e.target.closest("[" + attr + "]") : null;
      if (!el) return;
      var fn = handlers[type][el.getAttribute(attr)];
      if (!fn) return;
      if (type === "submit" || (type === "click" && !/^(INPUT|SELECT|TEXTAREA|OPTION)$/.test(e.target.tagName))) e.preventDefault();
      fn(el, e);
    });
  }

  function start() {
    root = document.getElementById("app");
    delegate("click", "data-action");
    delegate("input", "data-input");
    delegate("change", "data-change");
    delegate("submit", "data-submit");
    document.addEventListener("keydown", function (e) {
      keyListeners.forEach(function (fn) { fn(e); });
    });
    window.addEventListener("hashchange", render);
    Store.subscribe(render);
    render();
  }

  return {
    register: register, on: on, onKey: onKey, onRender: onRender,
    route: route, go: go, replace: replace, withParams: withParams,
    render: render, start: start,
  };
})();
