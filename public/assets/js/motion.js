/* SunFlow — motion layer. GSAP + ScrollTrigger, native scrolling.
   If GSAP is missing or reduced motion is on, every page still reads fully. */
(function () {
  "use strict";
  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var SF = window.SF || { whenReady: function (fn) { fn(); } };

  if (reduce || !gsap || !ST) { html.classList.add("motion-off"); html.classList.remove("is-preloading"); return; }
  gsap.registerPlugin(ST);
  html.classList.add("has-gsap");
  var EASE = "expo.out";

  /* Split text into masked words; keeps <em>/<span> styling intact. */
  function splitWords(el) {
    var out = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "split-w";
            var i = document.createElement("span"); i.textContent = part;
            w.appendChild(i); frag.appendChild(w); out.push(i);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    })(el);
    return out;
  }

  /* Statement: each word lights up as it scrolls past. */
  $$("[data-statement]").forEach(function (el) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { var s = document.createElement("span"); s.className = "w"; s.textContent = part; frag.appendChild(s); }
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("inline-img")) walk(n);
        else if (n.nodeType === 1) n.classList.add("w");
      });
    })(el);
    var words = $$(".w", el);
    ST.create({
      trigger: el, start: "top 80%", end: "bottom 45%", scrub: true,
      onUpdate: function (self) {
        var n = Math.round(self.progress * words.length);
        words.forEach(function (w, i) { w.classList.toggle("is-on", i < n); });
      }
    });
  });

  SF.whenReady(function () {
    /* ---------- Hero (home) ---------- */
    var heroTitle = $("[data-hero-title]");
    if (heroTitle) {
      var lines = $$(".line", heroTitle);
      lines.forEach(function (l) {
        var inner = document.createElement("span");
        inner.style.display = "inline-block";
        while (l.firstChild) inner.appendChild(l.firstChild);
        l.appendChild(inner);
        l.style.overflow = "hidden"; l.style.paddingBottom = ".06em"; l.style.marginBottom = "-.06em";
      });
      var tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.fromTo("[data-hero-img]", { scale: 1.18 }, { scale: 1.06, duration: 2.4 }, 0)
        .fromTo(lines.map(function (l) { return l.firstChild; }), { yPercent: 115 }, { yPercent: 0, duration: 1.4, stagger: 0.12 }, 0.1)
        .fromTo("[data-hero-fade]", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.1 }, 0.5);
      gsap.to("[data-hero-img]", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
      gsap.to(".hero__content", { yPercent: -18, autoAlpha: 0.2, ease: "none", scrollTrigger: { trigger: ".hero", start: "40% top", end: "bottom top", scrub: true } });
    }

    /* ---------- Inner page hero ---------- */
    var ph = $(".page-hero");
    if (ph) {
      var t = $("[data-page-title]", ph);
      var words = t ? splitWords(t) : [];
      gsap.timeline({ defaults: { ease: EASE } })
        .fromTo(words, { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: 0.05 }, 0.05)
        .fromTo($$("[data-hero-fade]", ph), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.35);
    }
    $$("[data-clip]").forEach(function (el) {
      gsap.fromTo(el, { clipPath: "inset(12% 6% 12% 6% round 28px)" }, {
        clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none",
        scrollTrigger: { trigger: el, start: "top 95%", end: "top 30%", scrub: true }
      });
      var img = $("img", el);
      if (img) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* ---------- Headings: words rise in ---------- */
    $$("[data-split]").forEach(function (el) {
      var w = splitWords(el);
      gsap.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 1.2, ease: EASE, stagger: 0.04, scrollTrigger: { trigger: el, start: "top 88%" } });
    });

    /* ---------- Fade-up blocks ---------- */
    ST.batch("[data-reveal]", {
      start: "top 90%",
      onEnter: function (els) { gsap.to(els, { autoAlpha: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.09, overwrite: true }); }
    });

    /* ---------- Parallax images ---------- */
    $$("[data-parallax]").forEach(function (img) {
      gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: "none", scrollTrigger: { trigger: img.parentNode, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* ---------- Count-ups ---------- */
    $$("[data-count]").forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-count")), dec = +(el.getAttribute("data-decimals") || 0);
      var pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
      var o = { v: 0 };
      gsap.to(o, {
        v: end, duration: 2, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
        onUpdate: function () { el.textContent = pre + o.v.toLocaleString("en-CA", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; }
      });
    });

    /* ---------- ROI timeline & bars ---------- */
    $$("[data-timeline]").forEach(function (tl) {
      gsap.fromTo($(".timeline__bar", tl), { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: tl, start: "top 80%", end: "bottom 50%", scrub: true } });
      gsap.from($$(".timeline__step", tl), { autoAlpha: 0, y: 30, duration: 1, ease: EASE, stagger: 0.12, scrollTrigger: { trigger: tl, start: "top 80%" } });
    });
    $$("[data-bars]").forEach(function (b) {
      gsap.from($$(".bars__fill", b), { scaleX: 0, duration: 1.6, ease: "expo.inOut", stagger: 0.12, scrollTrigger: { trigger: b, start: "top 80%" } });
      gsap.from($$(".bars__val", b), { autoAlpha: 0, duration: 0.8, delay: 0.9, stagger: 0.12, scrollTrigger: { trigger: b, start: "top 80%" } });
    });

    /* ---------- Horizontal impacts (desktop pins, mobile stacks) ---------- */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 901px)", function () {
      $$("[data-hscroll]").forEach(function (sec) {
        var track = $(".hscroll__track", sec);
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        gsap.to(track, {
          x: function () { return -dist(); }, ease: "none",
          scrollTrigger: { trigger: sec, start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
        });
      });
    });

    /* ---------- CTA sun rises ---------- */
    $$("[data-sunrise]").forEach(function (s) {
      gsap.fromTo(s, { yPercent: 22, scale: 0.85 }, { yPercent: 0, scale: 1, ease: "none", scrollTrigger: { trigger: s.closest("section"), start: "top bottom", end: "bottom bottom", scrub: true } });
    });

    /* ---------- Footer wordmark ---------- */
    var fw = $(".footer__word svg");
    if (fw) gsap.fromTo(fw, { yPercent: 40, autoAlpha: 0.2 }, { yPercent: 0, autoAlpha: 1, ease: "none", scrollTrigger: { trigger: ".footer", start: "top 90%", end: "bottom bottom", scrub: true } });

    /* Images that load late change layout — keep triggers accurate. */
    window.addEventListener("load", function () { ST.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  });
})();
