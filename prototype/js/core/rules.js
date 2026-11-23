/*
 * ERQA justification pre-screen.
 * The ERQA Challenge Ruleset (Steps 0–4, Policy A/B, decision matrix R1–R13)
 * expressed as transparent, deterministic checks. It only SUGGESTS – the analyst decides.
 */
var Rules = (function () {
  var RULES = [
    { id: "R1", step: 0, title: "Non-English text", condition: 'Justification is written in a non-English language (e.g., Spanish, Portuguese).', category: "hard_stop", reason: "Reviewers do not translate; English submission is mandatory for global auditability.", automation: "high" },
    { id: "R2", step: 1, title: "Generic business process", condition: 'Business Process contains only generic filler (e.g., "BAU", "daily responsibilities", "needed for job").', category: "hard_stop", reason: "Fails to identify what concrete operational, technical, or regulatory work is performed.", automation: "high" },
    { id: "R3", step: 2, title: "No peer comparison", condition: 'Low Commonality provides no peer comparison or states only "small team", "only person who has it", or "everyone needs access".', category: "hard_stop", reason: "Fails to substantiate why peers lack the entitlement or justify least privilege.", automation: "medium" },
    { id: "R4", step: 3, title: "Copy-paste non-answer", condition: "Low Commonality is an uninformative copy-paste of Business Process that ignores peer differentiation.", category: "hard_stop", reason: "Constitutes a non-response for the low commonality field.", automation: "high" },
    { id: "R5", step: 4, title: "Obscure role acronym", condition: "Role is an obscure, unexplained acronym with zero context provided across any field.", category: "hard_stop", reason: "Reviewer cannot ascertain the worker's legitimate business function.", automation: "medium" },
    { id: "R6", step: 4, title: "System name as role", condition: 'Role lists an IT system or entitlement name instead of a human role (e.g., "AD_Group_Member").', category: "hard_stop", reason: "Confuses system access attributes with human organizational roles.", automation: "high" },
    { id: "R7", step: 1, title: "Specific business process", condition: "Business Process clearly states specific operational tasks, applications, or transactions in English.", category: "acceptable", reason: "Explains what business activity requires access.", automation: "medium" },
    { id: "R8", step: 2, title: "Valid peer difference", condition: "Low Commonality explains peer differentiation via specialization, backup, regional scope, or zero peers.", category: "acceptable", reason: "Substantiates why the entitlement is restricted.", automation: "medium" },
    { id: "R9", step: 4, title: "Clear role", condition: 'Role is clear or uses standard industry acronyms (e.g., "DBA", "VP", "AML Analyst").', category: "acceptable", reason: "Job function is immediately understandable.", automation: "medium" },
    { id: "R10", step: 4, title: "Generic role, strong context", condition: 'Role is generic (e.g., "Contractor", "Analyst") but Business Process & Low Commonality provide full detail.', category: "negotiable", reason: "Strong context compensates for broad title.", automation: "human" },
    { id: "R11", step: 4, title: "Internal acronym, clarified", condition: "An internal acronym appears in Role, but surrounding text clarifies what the person does.", category: "negotiable", reason: "Function can be determined from context.", automation: "human" },
    { id: "R12", step: 3, title: "Same text, answers both", condition: "Same text is used in both fields, but substantively answers both process and peer difference.", category: "negotiable", reason: "Dual-purpose statement fulfils both requirements.", automation: "human" },
    { id: "R13", step: 0, title: "Minor English issues", condition: "Minor grammatical, spelling, or regional English phrasing where business intent is clear.", category: "negotiable", reason: "Focus is on substance and clarity of intent.", automation: "human" },
  ];

  var RULE_BY_ID = {};
  RULES.forEach(function (r) {
    RULE_BY_ID[r.id] = r;
  });

  var STEPS = [
    { step: 0, title: "Language check" },
    { step: 1, title: "Business process" },
    { step: 2, title: "Low commonality" },
    { step: 3, title: "Copy-paste duplication" },
    { step: 4, title: "Role & acronym" },
  ];

  var DEFAULT_ACRONYMS = ["DBA", "VP", "AVP", "SVP", "MD", "AML", "KYC", "BA", "QA", "IT", "HR", "CFO", "COO", "CTO", "CIO", "CISO", "PM", "SME", "IAM", "SRE", "UAT", "ETL", "API", "GL", "AP", "AR", "FX", "OPS", "L1", "L2", "L3"];

  // ---------- text helpers ----------
  function norm(s) {
    return (s || "").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
  }
  function tokens(s) {
    return norm(s).split(" ").filter(Boolean);
  }
  function setOf(str) {
    var out = new Set();
    str.split(" ").forEach(function (w) {
      out.add(w);
    });
    return out;
  }

  var EN_STOP = setOf("the a an and or of to for in on with is are be this that it as by from has have their they he she his her who which will can access needs need required work team");
  var ES_PT_STOP = setOf("el la los las de del y o para por en con es son un una su sus que al se lo le como más pero este esta esto ser tiene requiere acceso necesita trabajo equipo personal único unica único realizar gerente banquero também não são uma para com dos das pelo pela");
  var MEANINGLESS = new Set(Array.from(EN_STOP).concat(["bau", "business", "usual", "daily", "responsibilities", "responsibility", "job", "requirement", "requirements", "needed", "work", "role", "function", "duties", "duty", "required", "hybrid", "worker", "for", "his", "her", "their", "carry", "out", "perform", "tasks", "task", "access", "needs", "need"]));
  var GENERIC_BP = ["bau", "business as usual", "daily responsibilities", "daily work", "job requirement", "needed for work", "needed for job", "needed for daily work", "required for role", "required for job", "hybrid worker", "job function"];
  var NON_EXPLANATIONS = ["small team", "only person who has it", "only person with", "everyone needs access", "everyone needs it", "everyone should have", "all team members need", "required for role", "needed for role"];
  var PEER_SIGNALS = /\b(peer|peers|colleague|colleagues|direct reports?|other (team )?members|others in|no other|0 peers|zero peers|only one (on|in) (the|my) team|backup|back-up|covers?|coverage|out of office|ooo|leave|region|regional|specialist|speciali[sz]ed|speciali[sz]ation|dedicated|segregation|maker|checker|least privilege|assigned to support|unlike)\b/i;
  var GENERIC_ROLES = ["contractor", "analyst", "employee", "staff", "consultant", "associate", "user", "fte", "worker", "team member", "support"];

  function looksNonEnglish(text) {
    var t = tokens(text);
    if (t.length < 3) return { nonEnglish: false, sample: "" };
    var es = 0, en = 0, hits = [];
    t.forEach(function (w) {
      if (ES_PT_STOP.has(w) && !EN_STOP.has(w)) {
        es++;
        if (hits.length < 4) hits.push(w);
      } else if (EN_STOP.has(w)) en++;
    });
    var accents = (text.match(/[ñáéíóúãõç]/gi) || []).length;
    var score = es + accents * 0.5;
    return { nonEnglish: score >= 2 && score > en, sample: hits.join(", ") };
  }

  function meaningfulWords(text) {
    return tokens(text).filter(function (w) {
      return !MEANINGLESS.has(w) && w.length > 2;
    });
  }

  function similarity(a, b) {
    var na = norm(a), nb = norm(b);
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    var A = new Set(tokens(a)), B = new Set(tokens(b)), inter = 0;
    A.forEach(function (x) {
      if (B.has(x)) inter++;
    });
    return inter / (A.size + B.size - inter);
  }

  function acronymsIn(text) {
    return Array.from(new Set((text || "").match(/\b[A-Z][A-Z0-9&]{1,6}\b/g) || []));
  }

  function quote(s, max) {
    max = max || 70;
    var t = (s || "").trim();
    return t.length > max ? '"' + t.slice(0, max) + '…"' : '"' + t + '"';
  }

  function finding(rule, step, field, category, confidence, evidence) {
    return { rule: rule, step: step, field: field, category: category, confidence: confidence, evidence: evidence };
  }

  /** Run Steps 0–4 against one justification. Returns verdict + every finding with evidence. */
  function assess(input, allowlist) {
    var f = [];
    var role = input.justRole || "", bp = input.justProcess || "", lc = input.justComm || "";
    var allow = new Set((allowlist || DEFAULT_ACRONYMS).map(function (a) {
      return a.toUpperCase();
    }));

    // Step 0 – language
    var lang = looksNonEnglish(role + " " + bp + " " + lc);
    if (lang.nonEnglish) f.push(finding("R1", 0, "All fields", "hard_stop", "high", "Non-English words detected (" + lang.sample + "). Reviewers do not translate."));

    // Step 1 – business process
    var bpNorm = norm(bp);
    var bpMeaning = meaningfulWords(bp);
    var genericHit = GENERIC_BP.find(function (g) {
      return bpNorm.indexOf(g) !== -1;
    });
    if (!bpNorm) {
      f.push(finding("R2", 1, "Business Process", "hard_stop", "high", "Business Process is blank."));
    } else if (bpMeaning.length < 3) {
      f.push(finding("R2", 1, "Business Process", "hard_stop", genericHit ? "high" : "medium", quote(bp) + " contains only generic filler" + (genericHit ? ' ("' + genericHit + '")' : "") + "; no concrete activity described."));
    } else if (!lang.nonEnglish) {
      f.push(finding("R7", 1, "Business Process", "acceptable", "medium", "Describes specific activity (" + bpMeaning.slice(0, 4).join(", ") + "…)."));
    }

    // Step 2 – low commonality
    var lcNorm = norm(lc);
    var nonExp = NON_EXPLANATIONS.find(function (p) {
      return lcNorm.indexOf(p) !== -1;
    });
    var hasPeerSignal = PEER_SIGNALS.test(lc);
    var sim = similarity(bp, lc);
    var isCopy = sim >= 0.8;
    if (!lcNorm) {
      f.push(finding("R3", 2, "Low Commonality", "hard_stop", "high", "Low Commonality is blank – no peer comparison."));
    } else if (!isCopy) {
      if (nonExp && !hasPeerSignal) {
        f.push(finding("R3", 2, "Low Commonality", "hard_stop", "high", 'States only "' + nonExp + '" – no explanation of why peers lack it.'));
      } else if (!hasPeerSignal || meaningfulWords(lc).length < 3) {
        f.push(finding("R3", 2, "Low Commonality", "hard_stop", "medium", quote(lc) + " gives no peer comparison (no mention of peers, backup, region, specialization or segregation of duties)."));
      } else {
        f.push(finding("R8", 2, "Low Commonality", "acceptable", "medium", "Cites a peer difference (" + (lc.match(PEER_SIGNALS) || [""])[0] + ")."));
      }
    }

    // Step 3 – copy-paste
    if (isCopy && lcNorm) {
      if (hasPeerSignal && meaningfulWords(lc).length >= 6) {
        f.push(finding("R12", 3, "Low Commonality", "negotiable", "medium", "Low Commonality repeats Business Process (" + Math.round(sim * 100) + "% match) but appears to address peers. Analyst discretion."));
      } else {
        f.push(finding("R4", 3, "Low Commonality", "hard_stop", "high", "Low Commonality is a " + Math.round(sim * 100) + "% copy of Business Process and does not explain peer differences."));
      }
    }

    // Step 4 – role & acronym
    var roleTrim = role.trim();
    var roleNorm = norm(role);
    var sysName =
      /[_\\/]|\b(group|portal|ad group|entitlement|server|admin access|role access)\b/i.test(roleTrim) ||
      (!!input.app && roleNorm.length > 3 && norm(input.app).indexOf(roleNorm) !== -1) ||
      (!!input.func && roleNorm.length > 3 && norm(input.func) === roleNorm);
    var roleAcr = acronymsIn(roleTrim);
    var roleWordsNoAcr = roleTrim.replace(/\b[A-Z][A-Z0-9&]{1,6}\b/g, "").replace(/[^A-Za-z]/g, "");
    var unknownAcr = roleAcr.filter(function (a) {
      return !allow.has(a);
    });
    var contextStrong = bpMeaning.length >= 6 && hasPeerSignal;

    if (!roleNorm) {
      f.push(finding("R5", 4, "Role", "hard_stop", "high", "Role is blank."));
    } else if (sysName) {
      f.push(finding("R6", 4, "Role", "hard_stop", "high", quote(roleTrim) + " looks like a system, group or entitlement name, not a job role."));
    } else if (unknownAcr.length && roleWordsNoAcr.length < 3) {
      if (contextStrong) f.push(finding("R11", 4, "Role", "negotiable", "medium", "Role " + quote(roleTrim) + " is an internal acronym (" + unknownAcr.join(", ") + ") but other fields give context. Analyst discretion."));
      else f.push(finding("R5", 4, "Role", "hard_stop", "medium", "Role " + quote(roleTrim) + " is an unexplained acronym (" + unknownAcr.join(", ") + ") with little context elsewhere."));
    } else if (GENERIC_ROLES.indexOf(roleNorm) !== -1) {
      f.push(finding("R10", 4, "Role", "negotiable", "high", "Role " + quote(roleTrim) + " is generic" + (contextStrong ? "; other fields give strong context" : "") + ". Analyst discretion."));
    } else {
      f.push(finding("R9", 4, "Role", "acceptable", "medium", "Role " + quote(roleTrim) + " reads as a job function."));
    }

    var hardStops = f.filter(function (x) {
      return x.category === "hard_stop";
    });
    var negotiables = f.filter(function (x) {
      return x.category === "negotiable";
    });
    return {
      verdict: hardStops.length ? "hard_stop" : negotiables.length ? "review" : "clear",
      findings: f.sort(function (a, b) {
        return a.step - b.step;
      }),
      hardStops: hardStops,
      negotiables: negotiables,
    };
  }

  function uniqueRuleIds(list) {
    return Array.from(new Set(list.map(function (x) {
      return x.rule;
    })));
  }

  return {
    RULES: RULES,
    RULE_BY_ID: RULE_BY_ID,
    STEPS: STEPS,
    DEFAULT_ACRONYMS: DEFAULT_ACRONYMS,
    assess: assess,
    similarity: similarity,
    uniqueRuleIds: uniqueRuleIds,
  };
})();
