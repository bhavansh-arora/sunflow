/* SunFlow — site behaviour (no dependencies). Motion lives in motion.js. */
(function () {
  "use strict";
  var doc = document, html = doc.documentElement, body = doc.body;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var money = function (n) { return "$" + Math.round(n).toLocaleString("en-CA"); };

  /* ---------- Ready signal (motion.js waits on this) ---------- */
  var readyFns = [], isReady = false;
  window.SF = {
    whenReady: function (fn) { isReady ? fn() : readyFns.push(fn); },
    money: money
  };
  function ready() { if (isReady) return; isReady = true; readyFns.forEach(function (f) { f(); }); }

  /* ---------- Preloader: first visit per session only ---------- */
  (function preloader() {
    var el = $("#preloader");
    if (!el || !html.classList.contains("is-preloading")) { ready(); return; }
    store.set("sf-loaded", "1");
    var count = $(".preloader__count", el), start = performance.now(), dur = 1300;
    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);
      el.style.setProperty("--p", e);
      el.style.setProperty("--rise", Math.round(e * 100));
      count.textContent = String(Math.round(e * 100)).padStart(3, "0");
      if (t < 1) return requestAnimationFrame(tick);
      el.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }],
        { duration: 900, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" })
        .onfinish = function () { html.classList.remove("is-preloading"); el.style.clipPath = ""; };
      setTimeout(ready, 250);
    }
    requestAnimationFrame(tick);
  })();

  /* ---------- Header: solid on scroll, hides going down ---------- */
  var header = $("#header"), lastY = window.scrollY, ticking = false;
  var actionbar = $(".actionbar");
  function onScroll() {
    var y = window.scrollY;
    if (header) {
      header.classList.toggle("is-scrolled", y > 24);
      if (!body.classList.contains("menu-open")) {
        header.classList.toggle("is-hidden", y > 480 && y > lastY + 4);
        if (y < lastY - 4) header.classList.remove("is-hidden");
      }
    }
    if (actionbar) actionbar.classList.toggle("is-on", y > window.innerHeight * 0.7);
    lastY = y; ticking = false;
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Menu ---------- */
  var menuBtn = $("[data-menu-toggle]"), menu = $("#menu");
  function setMenu(open) {
    body.classList.toggle("menu-open", open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", String(open));
      $(".menu-btn__label", menuBtn).textContent = open ? "Close" : "Menu";
    }
    if (menu) menu.toggleAttribute("inert", !open);
    if (open) { header.classList.remove("is-hidden"); var first = $(".menu__link", menu); if (first) setTimeout(function () { first.focus(); }, 300); }
  }
  if (menu) menu.setAttribute("inert", "");
  if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(!body.classList.contains("menu-open")); });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && body.classList.contains("menu-open")) { setMenu(false); menuBtn.focus(); }
  });
  $$(".menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  window.addEventListener("resize", function () { if (window.innerWidth > 1180 && body.classList.contains("menu-open")) setMenu(false); });

  /* ---------- First-touch attribution (sent with quote requests) ---------- */
  (function attribution() {
    try {
      if (window.sessionStorage.getItem("sf-attrib")) return;
      var p = new URLSearchParams(location.search), a = { landing: location.pathname, referrer: doc.referrer || "direct", at: new Date().toISOString() };
      ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(function (k) { if (p.get(k)) a[k] = p.get(k); });
      window.sessionStorage.setItem("sf-attrib", JSON.stringify(a));
    } catch (e) {}
  })();

  /* ---------- Quote links carry the service the visitor was reading about ---------- */
  var pageService = {
    "commercial-solar": "commercial-solar", "residential-solar": "residential-solar",
    "roofing": "roofing", "luxury-exteriors": "luxury", "insulation": "insulation",
    "spadina-museum": "luxury", "toronto-residence": "luxury", "incentives": "commercial-solar"
  }[body.getAttribute("data-page")];
  if (pageService) {
    $$("[data-quote-link]").forEach(function (a) {
      if (a.getAttribute("href") === "contact.html") a.setAttribute("href", "contact.html?service=" + pageService);
    });
  }

  /* ---------- Live sun over Barrie ---------- */
  (function sunLive() {
    var wrap = $("[data-sun-live]");
    if (!wrap) return;
    var LAT = 44.3894, LON = -79.6903, rad = Math.PI / 180;
    function elevation(date) {
      var d = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
      var g = (357.529 + 0.98560028 * d) * rad;
      var q = 280.459 + 0.98564736 * d;
      var L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * rad;
      var e = (23.439 - 0.00000036 * d) * rad;
      var ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
      var dec = Math.asin(Math.sin(e) * Math.sin(L));
      var gmst = (18.697374558 + 24.06570982441908 * d) % 24;
      var ha = ((gmst * 15 + LON) * rad) - ra;
      return Math.asin(Math.sin(LAT * rad) * Math.sin(dec) + Math.cos(LAT * rad) * Math.cos(dec) * Math.cos(ha)) / rad;
    }
    function nextCross(from, up) {
      for (var m = 5; m < 60 * 26; m += 5) {
        var t = new Date(from.getTime() + m * 60000), el = elevation(t);
        if (up ? el > -0.83 : el < -0.83) return t;
      }
      return null;
    }
    var fmt = function (d) {
      return d.toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" });
    };
    function render() {
      var now = new Date(), el = elevation(now), up = el > -0.83;
      wrap.classList.toggle("is-night", !up);
      var text = $("[data-sun-text]"), label = $("[data-sun-time]");
      if (up) {
        var set = nextCross(now, false);
        label.textContent = "Live · Barrie " + fmt(now);
        text.textContent = "Sun's up · " + Math.max(1, Math.round(el)) + "° high";
        wrap.title = set ? "Sunset at " + fmt(set) : "";
      } else {
        var rise = nextCross(now, true);
        label.textContent = "Live · Barrie " + fmt(now);
        text.textContent = "Sunrise at " + (rise ? fmt(rise) : "dawn");
      }
    }
    render();
    setInterval(render, 30000);
  })();

  /* ---------- Tooltip (charts) ---------- */
  var tip = $(".tip");
  function showTip(el) {
    if (!tip) return;
    var parts = (el.getAttribute("data-tip") || "").split("|");
    tip.innerHTML = "<span></span><b></b>";
    tip.firstChild.textContent = parts[0] || "";
    tip.lastChild.textContent = parts[1] || "";
    var r = el.getBoundingClientRect();
    tip.style.left = Math.min(window.innerWidth - 90, Math.max(90, r.left + r.width / 2)) + "px";
    tip.style.top = r.top + "px";
    tip.classList.add("is-on");
  }
  function hideTip() { if (tip) tip.classList.remove("is-on"); }
  doc.addEventListener("pointerover", function (e) { var t = e.target.closest && e.target.closest("[data-tip]"); if (t) showTip(t); });
  doc.addEventListener("pointerout", function (e) { var t = e.target.closest && e.target.closest("[data-tip]"); if (t) hideTip(); });
  doc.addEventListener("focusin", function (e) { if (e.target.matches("[data-tip]")) showTip(e.target); });
  doc.addEventListener("focusout", function (e) { if (e.target.matches("[data-tip]")) hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });

  /* ---------- Incentive calculator ---------- */
  // First-year return on a $1M commercial system, from SunFlow's 2025 reference proposals.
  var INCENTIVES = {
    on: { pct: 47.44, parts: { itc: 200000, cca: 198800, interest: 15000, energy: 60700 } },
    mb: { pct: 72.52, parts: { itc: 200000, cca: 198700, interest: 15000, grant: 267900, energy: 43600 } }
  };
  var PARTS = [
    { key: "itc", name: "Clean Technology ITC", note: "Federal investment tax credit", color: "#009C95" },
    { key: "cca", name: "Capital Cost Allowance", note: "Accelerated write-off for clean energy", color: "#E0A030" },
    { key: "interest", name: "Tax deduction on interest", note: "On financed systems", color: "#B8478A" },
    { key: "grant", name: "Efficiency Manitoba grant", note: "Manitoba only", color: "#2A5CB8" },
    { key: "energy", name: "Energy value", note: "Year-one hydro savings", color: "#7DBA52" }
  ];
  $$("[data-calc]").forEach(function (calc) {
    var prov = "on";
    var range = $("input[type=range]", calc), bar = $("[data-calc-bar]", calc), legend = $("[data-calc-legend]", calc);
    var pill = $(".seg__pill", calc), link = $("[data-calc-link]", calc);
    bar.innerHTML = ""; legend.innerHTML = "";
    var segs = {}, rows = {};
    PARTS.forEach(function (p) {
      var s = doc.createElement("span");
      s.className = "stackbar__seg"; s.style.background = p.color; s.tabIndex = 0;
      bar.appendChild(s); segs[p.key] = s;
      var li = doc.createElement("li");
      li.innerHTML = '<span class="sw" style="background:' + p.color + '"></span><span></span><b></b>';
      li.children[1].innerHTML = p.name + "<small>" + p.note + "</small>";
      legend.appendChild(li); rows[p.key] = li;
    });
    var rest = doc.createElement("span"); rest.className = "stackbar__rest"; rest.setAttribute("data-tip", "Rest of investment|Recovered through energy savings over time"); bar.appendChild(rest);
    function render() {
      var size = +range.value, d = INCENTIVES[prov], scale = size / 1e6, total = 0;
      range.style.setProperty("--pct", ((size - range.min) / (range.max - range.min) * 100) + "%");
      $("[data-calc-size]", calc).textContent = money(size);
      PARTS.forEach(function (p) {
        var v = (d.parts[p.key] || 0) * scale;
        total += v;
        var on = v > 0;
        segs[p.key].style.width = on ? "calc(" + (v / size * 100) + "% - 2px)" : "0";
        segs[p.key].hidden = !on;
        segs[p.key].setAttribute("data-tip", p.name + "|" + money(v));
        rows[p.key].hidden = !on;
        rows[p.key].querySelector("b").textContent = money(v);
      });
      $("[data-calc-total]", calc).textContent = money(total);
      $("[data-calc-pct]", calc).textContent = (total / size * 100).toFixed(1) + "%";
      bar.setAttribute("aria-label", "First-year return of " + money(total) + " on a " + money(size) + " investment");
      if (link) link.href = "contact.html?service=commercial-solar&province=" + (prov === "on" ? "Ontario" : "Manitoba") + "&budget=" + size;
    }
    $$("[data-prov]", calc).forEach(function (b, i) {
      b.addEventListener("click", function () {
        prov = b.getAttribute("data-prov");
        $$("[data-prov]", calc).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        pill.style.transform = "translateX(" + (i * 100) + "%)";
        render();
      });
    });
    var presets = $$("[data-preset]", calc);
    function syncPresets() { presets.forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-preset") === +range.value)); }); }
    presets.forEach(function (b) { b.addEventListener("click", function () { range.value = b.getAttribute("data-preset"); render(); syncPresets(); }); });
    range.addEventListener("input", function () { render(); syncPresets(); });
    render();
  });

  /* ---------- Services: floating preview follows the cursor ---------- */
  (function servicePreview() {
    var list = $("[data-services]"), box = $(".service-preview");
    if (!list || !box || !fine) return;
    var imgs = {};
    $$("[data-preview]", list).forEach(function (a) {
      var src = a.getAttribute("data-preview");
      if (!imgs[src]) { var i = new Image(); i.src = src; i.alt = ""; i.decoding = "async"; box.appendChild(i); imgs[src] = i; }
    });
    var x = 0, y = 0, cx = 0, cy = 0, raf;
    function loop() { cx += (x - cx) * 0.16; cy += (y - cy) * 0.16; box.style.left = cx + "px"; box.style.top = cy + "px"; raf = requestAnimationFrame(loop); }
    list.addEventListener("pointermove", function (e) { x = e.clientX; y = e.clientY; });
    $$("[data-preview]", list).forEach(function (a) {
      a.addEventListener("pointerenter", function (e) {
        if (!box.classList.contains("is-on")) { cx = x = e.clientX; cy = y = e.clientY; }
        Object.keys(imgs).forEach(function (k) { imgs[k].classList.toggle("is-on", k === a.getAttribute("data-preview")); });
        box.classList.add("is-on");
      });
    });
    list.addEventListener("pointerenter", function () { cancelAnimationFrame(raf); loop(); });
    list.addEventListener("pointerleave", function () { box.classList.remove("is-on"); cancelAnimationFrame(raf); });
  })();

  /* ---------- Cursor ---------- */
  (function cursor() {
    var c = $(".cursor");
    if (!c || !fine || reduce) return;
    var x = -100, y = -100, cx = x, cy = y;
    doc.addEventListener("pointermove", function (e) { x = e.clientX; y = e.clientY; c.classList.add("is-on"); });
    doc.addEventListener("pointerleave", function () { c.classList.remove("is-on"); });
    (function loop() { cx += (x - cx) * 0.2; cy += (y - cy) * 0.2; c.style.transform = "translate(" + cx + "px," + cy + "px)"; requestAnimationFrame(loop); })();
    doc.addEventListener("pointerover", function (e) {
      var v = e.target.closest && e.target.closest("[data-cursor]");
      c.classList.toggle("is-view", !!v);
      if (v) $("span", c).textContent = v.getAttribute("data-cursor-label") || "View";
    });
  })();

  /* ---------- Modal: images & video ---------- */
  var modal = $("#modal"), lastFocus;
  function openModal(node, caption) {
    if (!modal) return;
    lastFocus = doc.activeElement;
    var content = $(".modal__content", modal);
    content.innerHTML = ""; content.appendChild(node);
    $(".modal__caption", modal).textContent = caption || "";
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add("is-open"); });
    body.style.overflow = "hidden";
    $(".modal__close", modal).focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove("is-open");
    var v = $("video", modal); if (v) v.pause();
    var f = $("iframe", modal); if (f) f.src = "about:blank";
    setTimeout(function () { modal.hidden = true; $(".modal__content", modal).innerHTML = ""; }, 400);
    body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  if (modal) {
    modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest("[data-modal-close]")) closeModal(); });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
  }
  $$("[data-lightbox]").forEach(function (fig) {
    fig.setAttribute("tabindex", "0"); fig.setAttribute("role", "button");
    function open() {
      var img = $("img", fig), big = new Image();
      big.src = fig.getAttribute("data-lightbox") || img.currentSrc || img.src; big.alt = img.alt;
      openModal(big, img.alt);
    }
    fig.addEventListener("click", open);
    fig.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  $$("[data-video], [data-youtube]").forEach(function (b) {
    b.addEventListener("click", function () {
      var node, yt = b.getAttribute("data-youtube");
      if (yt) {
        node = doc.createElement("iframe");
        node.src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(yt) + "?autoplay=1&rel=0";
        node.title = b.getAttribute("data-title") || "Video";
        node.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        node.allowFullscreen = true;
      } else {
        node = doc.createElement("video");
        node.src = b.getAttribute("data-video"); node.controls = true; node.autoplay = true; node.playsInline = true;
      }
      openModal(node, b.getAttribute("data-title") || "");
    });
  });

  /* ---------- Filters (projects) ---------- */
  $$("[data-filters]").forEach(function (group) {
    var target = $(group.getAttribute("data-filters"));
    $$("button", group).forEach(function (b) {
      b.addEventListener("click", function () {
        var f = b.getAttribute("data-filter");
        $$("button", group).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        $$("[data-tags]", target).forEach(function (card) {
          card.classList.toggle("is-hidden", f !== "all" && card.getAttribute("data-tags").split(" ").indexOf(f) < 0);
        });
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    });
  });

  /* ---------- Drag-to-scroll rails ---------- */
  $$("[data-drag]").forEach(function (rail) {
    var down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    window.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 4) { moved = true; rail.classList.add("is-dragging"); }
      rail.scrollLeft = sl - dx;
    });
    window.addEventListener("pointerup", function () { down = false; rail.classList.remove("is-dragging"); });
    rail.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    var id = rail.id, step = function () { return rail.clientWidth * 0.6; };
    $$('[data-drag-prev="' + id + '"]').forEach(function (b) { b.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: "smooth" }); }); });
    $$('[data-drag-next="' + id + '"]').forEach(function (b) { b.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: "smooth" }); }); });
  });

  /* ---------- Insulation R-value slider ---------- */
  $$("[data-rvalue]").forEach(function (wrap) {
    var range = $("input", wrap), num = $("[data-r-num]", wrap), layer = $("[data-r-layer]", wrap.parentNode);
    var heat = $$("[data-r-heat]", wrap.parentNode), label = $("[data-r-label]", wrap);
    var snow = $$("[data-r-snow]", wrap.parentNode), ice = $$("[data-r-ice]", wrap.parentNode);
    function render() {
      var r = +range.value, t = (r - 8) / (60 - 8);
      range.style.setProperty("--pct", (t * 100) + "%");
      num.textContent = "R" + r;
      if (layer) layer.setAttribute("height", String(14 + t * 86)), layer.setAttribute("y", String(262 - (14 + t * 86)));
      heat.forEach(function (h, i) { h.style.opacity = String(Math.max(0, 1 - t * 1.15 - (i === 1 ? 0 : 0.1))); });
      snow.forEach(function (n) { n.style.opacity = String(0.15 + t * 0.85); });
      ice.forEach(function (n) { n.style.opacity = String(Math.max(0, 0.9 - t * 1.3)); });
      if (label) label.textContent = r < 25 ? "Heat is pouring out of your attic." : r < 50 ? "Better — but still leaking money." : "Heat stays where you paid for it.";
    }
    range.addEventListener("input", render);
    render();
  });

  /* ---------- Incentive eligibility checker ---------- */
  $$("[data-checker]").forEach(function (box) {
    var answers = {};
    var out = $("[data-checker-out]", box);
    function render() {
      var list = [];
      if (answers.business === "y") list.push("Clean Technology Investment Tax Credit — up to 30% of eligible costs");
      if (answers.business === "y") list.push("Accelerated Capital Cost Allowance — write off clean-energy equipment faster");
      if (answers.mb === "y" && answers.business === "y") list.push("Efficiency Manitoba incentives for commercial solar");
      if (answers.finance === "y" && answers.business === "y") list.push("Tax deduction on interest for financed systems");
      if (answers.home === "y") list.push("Net metering — bank surplus credits for up to 12 months");
      if (answers.urgent === "y") list.push("Ontario Renovates — up to $15,000 for urgent home repairs (eligible households)");
      if (answers.muni === "y") list.push("Municipal Solar Program and power purchase agreements (no upfront capital)");
      var ul = $("ul", out);
      ul.innerHTML = "";
      if (!list.length) { ul.innerHTML = '<li><svg class="icon"><use href="#i-question"/></svg>Answer a few questions to see what you could qualify for.</li>'; return; }
      list.forEach(function (t) {
        var li = doc.createElement("li");
        li.innerHTML = '<svg class="icon"><use href="#i-check"/></svg><span></span>';
        li.lastChild.textContent = t; ul.appendChild(li);
      });
    }
    $$("[data-q]", box).forEach(function (q) {
      var key = q.getAttribute("data-q");
      $$("button", q).forEach(function (b) {
        b.addEventListener("click", function () {
          answers[key] = b.getAttribute("data-a");
          $$("button", q).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          render();
        });
      });
    });
    render();
  });
})();
