/* SunFlow quote funnel.
   - Five short steps; step 3 asks different questions per service.
   - Saves a draft as the visitor types, so a closed tab doesn't lose the lead.
   - Pre-fills from links (?service=…&province=…&budget=…&type=…).
   - Scores and routes each request, then POSTs JSON to SUNFLOW.formEndpoint. */
(function () {
  "use strict";
  var form = document.querySelector("[data-funnel]");
  if (!form) return;
  var $ = function (s, c) { return (c || form).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || form).querySelectorAll(s)); };
  var CFG = window.SUNFLOW || {};
  var DRAFT_KEY = "sf-quote-draft";
  var TOTAL = 5;
  var step = 1;
  var steps = $$("[data-step]");
  var nextBtn = $("[data-qf-next]"), backBtn = $("[data-qf-back]"), errBox = $("[data-qf-err]");
  var nav = $("[data-qf-nav]");
  var store = {
    get: function (k) { try { return JSON.parse(window.localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { window.localStorage.removeItem(k); } catch (e) {} }
  };

  var SERVICE_BRANCH = {
    "commercial-solar": "solar", "residential-solar": "solar", roofing: "roofing",
    luxury: "luxury", insulation: "insulation", unsure: "unsure"
  };
  var STEP3_TITLE = {
    solar: "Tell us about your energy use.", roofing: "What's happening with the roof?",
    luxury: "Tell us about the project.", insulation: "What have you noticed at home?",
    unsure: "Tell us what you're thinking."
  };

  /* ---------- Reading the form ---------- */
  function data() {
    var out = {};
    $$("input, select, textarea").forEach(function (el) {
      if (!el.name || el.name === "website") return;
      if (el.type === "radio") { if (el.checked) out[el.name] = el.value; return; }
      if (el.type === "checkbox") {
        if (el.name === "signs") { out.signs = out.signs || []; if (el.checked) out.signs.push(el.value); return; }
        out[el.name] = el.checked ? el.value : ""; return;
      }
      out[el.name] = el.value.trim();
    });
    return out;
  }
  function setValue(name, value) {
    $$('[name="' + name + '"]').forEach(function (el) {
      if (el.type === "radio") el.checked = el.value === value;
      else if (el.type === "checkbox") el.checked = Array.isArray(value) ? value.indexOf(el.value) > -1 : !!value;
      else el.value = value;
    });
  }
  function branch() { return SERVICE_BRANCH[data().service] || "unsure"; }

  /* ---------- Steps ---------- */
  function show(n, focus) {
    step = n;
    steps.forEach(function (s) { s.classList.toggle("is-active", s.getAttribute("data-step") === String(n)); });
    if (n === 3) {
      var b = branch();
      $$("[data-branch]").forEach(function (el) { el.hidden = el.getAttribute("data-branch") !== b; });
      $("[data-q3-title]").textContent = STEP3_TITLE[b];
    }
    var done = n === "done";
    $("[data-qf-count]").textContent = done ? "Done" : "Step " + n + " of " + TOTAL;
    $("[data-qf-time]").textContent = done ? "Sent" : "≈ " + Math.max(1, Math.ceil((TOTAL - n + 1) * 0.4)) + " min";
    form.querySelector(".qf__bar span").style.width = (done ? 100 : ((n - 1) / TOTAL) * 100 + 4) + "%";
    nav.hidden = done;
    backBtn.hidden = n === 1 || done;
    nextBtn.firstChild.textContent = n === TOTAL ? "Send my request " : "Continue ";
    errBox.textContent = "";
    if (focus) {
      var h = $(".is-active .qf__q");
      if (h) h.focus({ preventScroll: true });
      var top = form.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top) window.scrollTo({ top: top, behavior: "smooth" });
    }
  }

  /* ---------- Validation ---------- */
  function fieldError(el, msg) {
    var wrap = el.closest(".input");
    if (wrap) { wrap.classList.toggle("is-invalid", !!msg); var e = $(".input__err", wrap); if (e) e.textContent = msg || ""; }
    if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
  }
  function validate() {
    var box = $('[data-step="' + step + '"]'), bad = null, msg = "";
    // Required radio groups in this step (only visible ones).
    var groups = {};
    $$("input[type=radio][required], input[type=radio][data-required]", box).forEach(function (r) {
      if (!r.closest("[hidden]")) groups[r.name] = true;
    });
    Object.keys(groups).forEach(function (name) {
      if (!bad && !$('input[name="' + name + '"]:checked', box)) {
        bad = $('input[name="' + name + '"]', box);
        msg = "Please choose an option" + (name === "province" ? " for the province." : name === "property" ? " for the property type." : ".");
      }
    });
    $$("[data-required]:not([type=radio])", box).forEach(function (el) {
      if (el.closest("[hidden]")) return;
      var v = el.type === "checkbox" ? el.checked : el.value.trim(), m = "";
      if (!v) m = el.type === "checkbox" ? "Please agree so we can contact you." : "This one's needed.";
      else if (el.getAttribute("data-type") === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) m = "That email doesn't look right.";
      else if (el.getAttribute("data-type") === "phone" && v.replace(/\D/g, "").length < 10) m = "Please include the area code.";
      fieldError(el, m);
      if (m && !bad) { bad = el; msg = m; }
    });
    errBox.textContent = bad ? msg : "";
    if (bad) bad.focus();
    return !bad;
  }

  /* ---------- Scoring & routing ---------- */
  function score(d) {
    var s = 0;
    if (d.service === "commercial-solar" || d.service === "luxury") s += 3;
    if (d.property === "Business" || d.property === "Municipal / institutional") s += 2;
    s += { "As soon as possible": 3, "1–3 months": 2, "3–6 months": 1 }[d.timeline] || 0;
    if (/\$1,000|\$5,000|Over \$20,000/.test(d.bill || "")) s += 2;
    if (+d.budget >= 500000) s += 2;
    if (d.roofIssue === "Leak or damage") s += 2;
    if (d.province === "Elsewhere") s -= 2;
    return s;
  }
  function priority(s) { return s >= 6 ? "Hot" : s >= 3 ? "Warm" : "Nurture"; }
  function route(d) {
    var r = (CFG.routing || {})[d.service] || (CFG.routing || {}).unsure || { desk: "General enquiries", owner: "SunFlow team", email: CFG.email };
    return r;
  }
  function ref() { return "SF-" + Date.now().toString(36).toUpperCase().slice(-6); }
  function attribution() {
    try { return JSON.parse(window.sessionStorage.getItem("sf-attrib") || "null") || {}; } catch (e) { return {}; }
  }
  var LABEL = { "commercial-solar": "Commercial solar", "residential-solar": "Residential solar", roofing: "Roofing", luxury: "Luxury exteriors", insulation: "Insulation", unsure: "Not sure yet" };

  /* ---------- Submit ---------- */
  function finish(d, r, pri, id, demo) {
    store.del(DRAFT_KEY);
    var first = (d.name || "").split(" ")[0];
    $("[data-done-title]").textContent = first ? "You're in, " + first + "." : "You're in.";
    $("[data-done-text]").textContent = "We've sent your " + LABEL[d.service].toLowerCase() + " request to " + r.owner + " on our " + r.desk + " team. Reference " + id + ".";
    var dl = $("[data-route]");
    dl.innerHTML = "";
    [["Routed to", r.desk + " · " + r.owner], ["Project", LABEL[d.service] + (d.property ? " · " + d.property : "")], ["Location", d.province || "—"], ["Timing", d.timeline || "—"], ["Call time", d.callTime || "Any time"]]
      .forEach(function (row) {
        var div = document.createElement("div"), dt = document.createElement("dt"), dd = document.createElement("dd");
        dt.textContent = row[0]; dd.textContent = row[1]; div.appendChild(dt); div.appendChild(dd); dl.appendChild(div);
      });
    $("[data-demo-note]").hidden = !demo;
    show("done", true);
    if (window.dataLayer) window.dataLayer.push({ event: "quote_submitted", service: d.service, priority: pri });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    if (step < TOTAL) { show(step + 1, true); return; }
    if ($("[name=website]").value) return; // bot
    var d = data(), r = route(d), s = score(d), pri = priority(s), id = ref();
    var payload = {
      reference: id, submittedAt: new Date().toISOString(),
      service: d.service, serviceLabel: LABEL[d.service],
      routing: { desk: r.desk, owner: r.owner, email: r.email },
      priority: pri, score: s,
      contact: { name: d.name, email: d.email, phone: d.phone, postal: d.postal, company: d.company, callTime: d.callTime },
      property: { type: d.property, province: d.province },
      details: {
        bill: d.bill, budget: d.budget, roofType: d.roofType || d.roofTypeR, roofAge: d.roofAge, roofIssue: d.roofIssue,
        ontarioRenovates: d.renovates === "yes", luxuryType: d.luxType, luxuryStage: d.luxStage, team: d.team,
        insulationSigns: d.signs, idea: d.idea, notes: d.notes
      },
      timeline: d.timeline, heardFrom: d.source,
      attribution: attribution(), page: location.pathname
    };
    var demo = !CFG.formEndpoint;
    if (demo) {
      var log = store.get("sf-demo-leads") || [];
      log.push(payload); store.set("sf-demo-leads", log.slice(-20));
      if (window.console) console.info("[SunFlow demo] quote payload", payload);
      finish(d, r, pri, id, true);
      return;
    }
    nextBtn.disabled = true;
    nextBtn.firstChild.textContent = "Sending… ";
    fetch(CFG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(payload) })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); finish(d, r, pri, id, false); })
      .catch(function () {
        errBox.innerHTML = "";
        errBox.appendChild(document.createTextNode("We couldn't send that just now. Please try again, or call us at "));
        var a = document.createElement("a"); a.href = CFG.phoneHref || "tel:+16477069908"; a.textContent = CFG.phone || "647-706-9908"; a.style.textDecoration = "underline";
        errBox.appendChild(a); errBox.appendChild(document.createTextNode("."));
      })
      .then(function () { nextBtn.disabled = false; nextBtn.firstChild.textContent = "Send my request "; });
  });

  backBtn.addEventListener("click", function () { if (step > 1) show(step - 1, true); });

  /* Step 1 is one tap: choosing a service moves on. */
  $$('input[name="service"]').forEach(function (r) {
    r.addEventListener("change", function () { setTimeout(function () { if (step === 1) show(2, true); }, 280); });
  });

  /* Clear field errors as people fix them; save a draft. */
  form.addEventListener("input", function (e) {
    if (e.target.matches("[data-required]")) fieldError(e.target, "");
    errBox.textContent = "";
    var d = data(); delete d.consent;
    store.set(DRAFT_KEY, { d: d, step: step, at: Date.now() });
  });
  form.addEventListener("change", function () { form.dispatchEvent(new Event("input")); });

  /* ---------- Start: draft, then link parameters ---------- */
  var draft = store.get(DRAFT_KEY), params = new URLSearchParams(location.search), start = 1;
  if (draft && draft.d && Date.now() - draft.at < 1000 * 60 * 60 * 24 * 14) {
    Object.keys(draft.d).forEach(function (k) { setValue(k, draft.d[k]); });
    start = Math.min(draft.step || 1, TOTAL);
  }
  var svc = params.get("service");
  if (svc && SERVICE_BRANCH[svc]) {
    if (data().service !== svc) start = 2;
    setValue("service", svc);
    start = Math.max(start, 2);
  }
  if (params.get("province")) setValue("province", params.get("province"));
  if (params.get("budget")) {
    var b = +params.get("budget"), opt = b < 50000 ? "25000" : b < 250000 ? "100000" : b < 1000000 ? "500000" : b <= 3000000 ? "1500000" : "3000000";
    setValue("budget", opt);
    setValue("property", "Business");
  }
  if (params.get("type") === "institutional") setValue("luxType", "Commercial / institutional");
  if (params.get("type") === "residential") setValue("luxType", "High-end residential");
  if (params.get("topic") === "ontario-renovates") { setValue("renovates", true); setValue("province", "Ontario"); }
  show(start, false);
})();
