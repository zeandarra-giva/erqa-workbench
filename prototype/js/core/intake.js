/* Intake pipeline: replaces ".txt on shared drive → MS Access queries → manual upload".
   Cleans the raw weekly extract and creates cases, entirely in the browser. */
var Intake = (function () {
  var COUNTRY_MAP = {
    usa: "United States", us: "United States", "u.s.": "United States", "united states": "United States", "united states of america": "United States",
    mex: "Mexico", mexico: "Mexico", "méxico": "Mexico",
    ind: "India", india: "India",
    uk: "United Kingdom", gbr: "United Kingdom", "united kingdom": "United Kingdom", "great britain": "United Kingdom",
    bra: "Brazil", brazil: "Brazil", brasil: "Brazil",
    sgp: "Singapore", singapore: "Singapore",
    pol: "Poland", poland: "Poland",
    phl: "Philippines", philippines: "Philippines",
  };
  var KNOWN_COUNTRIES = ["United States", "Mexico", "India", "United Kingdom", "Brazil", "Singapore", "Poland", "Philippines"];
  var PLACEHOLDERS = new Set(["- select -", "-select-", "select", "n/a", "na", "null", "#n/a"]);

  function parseDate(v) {
    var s = v.trim();
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return Dates.isoDate(new Date(+m[3], +m[1] - 1, +m[2]));
    return null;
  }
  function stripHtml(s) {
    return s.replace(/<[^>]*>/g, " ").replace(/\{\{[^}]*\}\}/g, " ").replace(/\s+/g, " ").trim();
  }

  /** A realistic, deliberately messy raw extract for the next weekly drop (synthetic). */
  function generateRawDrop(existing, week) {
    var r = Seed.rng(9000 + week);
    var pool = existing.filter(function (c) { return c.week >= 44; });
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var variants = {
      "United States": ["USA", "United States", "US"],
      Mexico: ["MEX", "Mexico", "México"],
      India: ["IND", "India"],
      "United Kingdom": ["UK", "United Kingdom", "GBR"],
      Brazil: ["BRA", "Brasil"],
    };
    var rows = [];
    for (var i = 0; i < 14; i++) {
      var src = pick(pool), donor = pick(pool);
      var day = 16 + (i % 6);
      rows.push({
        "Signoff ID": String(9100000 + Math.floor(r() * 90000)),
        "EERS Reviewer": src.reviewer.name,
        "Reviewer SOEID": src.reviewer.id,
        "Reviewer Manager": src.reviewerManager.name,
        "Reviewer Manager SOEID": src.reviewerManager.id,
        "Manager or Delegate": src.managerOrDelegate,
        "Review Type": r() < 0.4 ? "" : src.reviewType,
        Worker: src.worker.name,
        "Worker SOEID": src.worker.id,
        "App Name": src.app,
        "App ID": src.appId,
        Function: src.func,
        Entitlement: r() < 0.35 ? 'For full details, <a href="https://intranet.example/ent?id=' + src.appId + '">click here</a> ' + src.entitlement : src.entitlement,
        Environment: src.environment,
        "SOA Country": pick(variants[src.country] || [src.country]),
        "SOA Region": src.region,
        "SOA Sector": src.sector,
        "Managed Segment": src.segment,
        "Template Name": donor.template,
        FREQUENCY: donor.frequency,
        JUST_ROLE: donor.justRole,
        JUST_PROCESS: donor.justProcess,
        JUST_COMM: donor.justComm,
        "Date of EERS Review": r() < 0.6 ? "2026-11-" + day + " 00:00:00.0000000" : "11/" + day + "/2026",
        "IAM Revocation": "- Select -",
        Escalation: "- Select -",
        "Def revo verified": "- Select -",
      });
    }
    // duplicates that used to be removed by hand
    rows.push(Object.assign({}, rows[2]));
    rows.push(Object.assign({}, rows[7]));
    return rows;
  }

  function run(raw, week, existing, analysts) {
    var issues = [];
    var seen = new Set(existing.map(function (c) { return c.signoffId; }));
    var stats = { placeholders: 0, countries: 0, dates: 0, html: 0, dups: 0 };
    var cases = [];
    var at = Dates.nowStamp();
    var monday = Dates.isoWeekStart(2026, week);

    raw.forEach(function (row, idx) {
      var sid = (row["Signoff ID"] || "").trim();
      var note = function (type, detail) { issues.push({ row: idx + 1, signoffId: sid, type: type, detail: detail }); };
      if (seen.has(sid)) {
        stats.dups++;
        note("duplicate", "Duplicate sign-off ID removed");
        return;
      }
      seen.add(sid);

      var clean = {};
      Object.keys(row).forEach(function (k) {
        var t = (row[k] == null ? "" : String(row[k])).trim();
        if (PLACEHOLDERS.has(t.toLowerCase())) {
          clean[k] = "";
          stats.placeholders++;
        } else clean[k] = t;
      });

      var rawCountry = clean["SOA Country"];
      var country = COUNTRY_MAP[rawCountry.toLowerCase()] || rawCountry;
      if (country !== rawCountry) {
        stats.countries++;
        note("country", '"' + rawCountry + '" → "' + country + '"');
      }
      var date = parseDate(clean["Date of EERS Review"]);
      if (date) stats.dates++;
      else note("date", 'Unparseable date "' + clean["Date of EERS Review"] + '"');
      var ent = clean.Entitlement;
      if (/<[^>]+>/.test(ent)) {
        ent = stripHtml(ent);
        stats.html++;
        note("html", "HTML stripped from entitlement description");
      }
      if (!clean["Review Type"]) note("missing", "Review Type is empty – flagged for data owner");

      var c = {
        id: "JR-" + week + "-" + String(cases.length + 1).padStart(3, "0"),
        signoffId: sid,
        year: 2026,
        week: week,
        reviewDate: date || monday,
        reviewer: { id: clean["Reviewer SOEID"], name: clean["EERS Reviewer"] },
        reviewerManager: { id: clean["Reviewer Manager SOEID"], name: clean["Reviewer Manager"] },
        managerOrDelegate: clean["Manager or Delegate"] === "Delegate" ? "Delegate" : "Manager",
        reviewType: clean["Review Type"] || "Semi-annual",
        worker: { id: clean["Worker SOEID"], name: clean.Worker },
        app: clean["App Name"],
        appId: clean["App ID"],
        func: clean.Function,
        entitlement: ent,
        environment: clean.Environment === "UAT" ? "UAT" : "PROD",
        country: country,
        region: clean["SOA Region"],
        sector: clean["SOA Sector"],
        segment: clean["Managed Segment"],
        template: clean["Template Name"],
        frequency: clean.FREQUENCY,
        justRole: clean.JUST_ROLE,
        justProcess: clean.JUST_PROCESS,
        justComm: clean.JUST_COMM,
        analyst: analysts[cases.length % analysts.length],
        stage: "to_assess",
        audit: [{ at: at, actor: "Intake pipeline", action: "Imported from weekly sample W" + week }],
      };
      var a = Rules.assess(c);
      c.audit.push({ at: at, actor: "Rules engine", action: "Pre-screen: " + a.verdict.replace("_", " "), detail: a.hardStops.map(function (h) { return h.rule; }).join(", ") || undefined });
      cases.push(c);
    });

    return {
      cases: cases,
      issues: issues,
      run: {
        id: "IMP-" + week, year: 2026, week: week, at: at,
        rawRows: raw.length,
        duplicatesRemoved: stats.dups,
        placeholdersCleaned: stats.placeholders,
        countriesNormalized: stats.countries,
        datesParsed: stats.dates,
        htmlStripped: stats.html,
        casesCreated: cases.length,
      },
    };
  }

  return { generateRawDrop: generateRawDrop, run: run, KNOWN_COUNTRIES: KNOWN_COUNTRIES };
})();
