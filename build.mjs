// Builds the static site: wraps every page in src/pages with the shared layout
// and writes the result to public/. No dependencies; run with `node build.mjs`.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, "src");
const out = join(root, "public");
const SITE = "https://sunflow.ca";

const partial = (name) => {
  const file = join(src, "partials", `${name}.html`);
  if (!existsSync(file)) throw new Error(`Missing partial: ${name}`);
  return readFileSync(file, "utf8");
};

// Front matter lives in a leading HTML comment: `key: value` per line.
function parse(raw) {
  const m = raw.match(/^<!--([\s\S]*?)-->\s*/);
  const meta = {};
  if (m) {
    for (const line of m[1].split("\n")) {
      const i = line.indexOf(":");
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return { meta, body: m ? raw.slice(m[0].length) : raw };
}

const fill = (tpl, vars) =>
  tpl.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, k) => (k in vars ? vars[k] : ""));

// `{{> name}}` pulls in a partial; partials can include partials.
const include = (html, vars, depth = 0) => {
  if (depth > 5) throw new Error("Partial include loop");
  return html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) =>
    include(fill(partial(n), vars), vars, depth + 1)
  );
};

// The closing call-to-action reads these; pages override them in front matter.
const CTA_DEFAULTS = {
  ctaEyebrow: "Don't wait to get started",
  ctaTitle: "Now is the best time to <em>go solar.</em>",
  ctaLead: "Free consultation, a proposal built around your numbers, and a crew that stands behind the work for life.",
  r1: "01 — Funding", r1b: "<strong>Grant funding windows are limited.</strong> Waiting can mean missing out.",
  r2: "02 — Rates", r2b: "<strong>Lock in energy rates now</strong> and protect your future budgets.",
  r3: "03 — Time", r3b: "<strong>Every month you delay</strong> is a month of avoidable utility spend.",
};

const layout = partial("layout");
const pages = readdirSync(join(src, "pages")).filter((f) => f.endsWith(".html"));

for (const file of pages) {
  const { meta, body } = parse(readFileSync(join(src, "pages", file), "utf8"));
  const slug = file.replace(/\.html$/, "");
  const vars = {
    ...CTA_DEFAULTS,
    ...meta,
    title: meta.title || "SunFlow Solar & Exteriors",
    description: meta.description || "",
    nav: meta.nav || "",
    bodyClass: meta.bodyClass || "",
    image: meta.image || "assets/img/rooftop-dealership.webp",
    canonical: slug === "index" ? `${SITE}/` : `${SITE}/${slug}.html`,
    slug,
    year: String(new Date().getFullYear()),
  };
  // Mark the active nav item: any element with data-nav="<nav>" gets aria-current.
  let html = include(fill(layout, { ...vars, content: body }), vars);
  html = fill(html, vars);
  if (vars.nav) {
    html = html.replace(
      new RegExp(`data-nav="${vars.nav}"`, "g"),
      `data-nav="${vars.nav}" aria-current="page"`
    );
  }
  writeFileSync(join(out, file), html);
  console.log("built", file);
}
