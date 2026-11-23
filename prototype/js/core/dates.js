/* Calendar helpers. All date math uses calendar days ("7 calendar days" policy). */
var Dates = (function () {
  // Fixed demo date so the synthetic data always tells the same story.
  var DEMO_TODAY = "2026-11-24";
  var DAY = 86400000;

  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function toDate(iso) {
    return new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  }
  function isoDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function addDays(iso, n) {
    var d = toDate(iso);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }
  function daysBetween(fromIso, toIso) {
    return Math.round((toDate(toIso.slice(0, 10)).getTime() - toDate(fromIso.slice(0, 10)).getTime()) / DAY);
  }
  function daysLeft(dueIso) {
    return daysBetween(DEMO_TODAY, dueIso);
  }
  /** Monday of an ISO week. */
  function isoWeekStart(year, week) {
    var jan4 = new Date(year, 0, 4);
    var dow = (jan4.getDay() + 6) % 7;
    var monday = new Date(year, 0, 4 - dow);
    monday.setDate(monday.getDate() + (week - 1) * 7);
    return isoDate(monday);
  }
  function isoWeekOf(iso) {
    var d = toDate(iso.slice(0, 10));
    var target = new Date(d);
    var dow = (d.getDay() + 6) % 7;
    target.setDate(d.getDate() - dow + 3);
    var year = target.getFullYear();
    var firstThursday = new Date(year, 0, 4);
    var week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
    return { year: year, week: week };
  }
  function fmtDate(iso) {
    if (!iso) return "—";
    return toDate(iso.slice(0, 10)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function fmtShort(iso) {
    if (!iso) return "—";
    return toDate(iso.slice(0, 10)).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  function nowStamp() {
    var t = new Date();
    return DEMO_TODAY + "T" + pad(t.getHours()) + ":" + pad(t.getMinutes()) + ":00";
  }

  return {
    DEMO_TODAY: DEMO_TODAY,
    toDate: toDate,
    isoDate: isoDate,
    addDays: addDays,
    daysBetween: daysBetween,
    daysLeft: daysLeft,
    isoWeekStart: isoWeekStart,
    isoWeekOf: isoWeekOf,
    fmtDate: fmtDate,
    fmtShort: fmtShort,
    nowStamp: nowStamp,
  };
})();

var Model = {
  EXCLUSION_TYPES: ["Entitlement not visible anymore", "Commonality is not low anymore"],
  FAIL_REASON_LABEL: {
    no_action: "No action",
    insufficient: "Acted – still insufficient",
    revoked: "Access revoked",
  },
  STAGE_LABEL: { to_assess: "To assess", challenged: "Challenged", escalated: "Escalated", closed: "Closed" },
};
