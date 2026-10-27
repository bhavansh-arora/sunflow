# SunFlow Solar & Exteriors — website

A redesign of [sunflow.ca](https://sunflow.ca): a 15-page static site with a quote form that routes each request to the right person.

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| Commercial solar | `commercial-solar.html` |
| Residential solar | `residential-solar.html` |
| Incentives (calculator and eligibility checker) | `incentives.html` |
| Roofing | `roofing.html` |
| Luxury exteriors | `luxury-exteriors.html` |
| Insulation (R-value slider) | `insulation.html` |
| Projects | `projects.html` |
| Spadina Museum (case study) | `spadina-museum.html` |
| Downtown Toronto residence (case study) | `toronto-residence.html` |
| About | `about.html` |
| Resources (articles, videos, proposals) | `resources.html` |
| Free quote (form) | `contact.html` |
| Privacy | `privacy.html` |
| Not found | `404.html` |

## Folder layout

```
sunflow/
  build.mjs          stitches shared header/footer into every page (Node 18+, no dependencies)
  src/partials/      shared pieces: layout, header, menu, footer, calculator, ROI chart, closing call-to-action
  src/pages/         one file per page (front matter at the top sets title, description, etc.)
  public/            the finished site — this is the folder you deploy
    assets/css/main.css    design system (colours, type, spacing, every component)
    assets/js/main.js      menu, header, live Barrie sun widget, calculator, tooltips, galleries, modals
    assets/js/motion.js    scroll animations (GSAP + ScrollTrigger, bundled in assets/vendor)
    assets/js/funnel.js    the quote form
    assets/js/config.js    form endpoint and who gets which kind of request
    assets/img/            optimized WebP images taken from sunflow.ca
```

Edit files in `src/`, then rebuild:

```bash
cd sunflow
node build.mjs
```

Preview locally:

```bash
cd sunflow/public
python3 -m http.server 8080      # then open http://localhost:8080
```

## Deploying

`public/` is plain HTML, CSS and JS. Upload it to any static host (Netlify, Vercel, Cloudflare Pages, S3, or the existing web host). `404.html` is picked up automatically by Netlify and Cloudflare Pages.

## Connecting the quote form

The form runs in **demo mode** until an endpoint is set. In demo mode, requests are kept in the visitor's browser only, and the confirmation screen says so.

1. Create a webhook that accepts JSON. Make, Zapier or n8n all work. A typical scenario:
   - create an item on SunFlow's monday.com leads board, filling columns from the payload
   - email the person named in `routing.email`
2. Put the webhook URL in `public/assets/js/config.js` → `formEndpoint`.
3. Adjust `routing` in the same file so each service goes to the right person.

Each request is sent as JSON like this:

```json
{
  "reference": "SF-QS7OYB",
  "service": "commercial-solar",
  "routing": { "desk": "Commercial Solar", "owner": "Mike McCann", "email": "mike@sunflow.ca" },
  "priority": "Hot",
  "score": 10,
  "contact": { "name": "…", "email": "…", "phone": "…", "postal": "…", "company": "…", "callTime": "Morning" },
  "property": { "type": "Business", "province": "Ontario" },
  "details": { "bill": "$5,000 – $20,000", "budget": "500000", "roofType": "Flat", "roofAge": "10–20 years" },
  "timeline": "As soon as possible",
  "heardFrom": "Google search",
  "attribution": { "landing": "/commercial-solar.html", "referrer": "https://www.google.com/", "utm_source": "google", "utm_campaign": "…" }
}
```

How the form works:

- **Questions per service.** Solar asks about the hydro bill, budget and roof. Roofing asks what's wrong and offers an Ontario Renovates check. Luxury asks about project type, stage and architect. Insulation asks about warning signs.
- **Priority.** A simple score from service, property type, timeline, bill and budget sorts each request into Hot, Warm or Nurture. The rules are in `score()` in `funnel.js`.
- **Pre-filled from links.** Service pages and the calculator link to `contact.html?service=…&province=…&budget=…`, so visitors skip questions they've already answered.
- **Drafts.** Answers are saved while someone types and restored for up to 14 days.
- **Attribution.** The first page visited, the referrer, UTM tags and `gclid`/`fbclid` are recorded for the session and sent with the request.
- **Spam.** A hidden honeypot field drops bot submissions.

## Content notes

All copy, figures and photos come from sunflow.ca and SunFlow's LinkedIn page. Confirm these before launch:

- The calculator scales the 2025 reference proposals for a $1M system (Ontario $474.4K back, Manitoba $725.2K back). It's labelled as illustrative.
- The $924K ROI case study figures are from the commercial solar page.
- Program details (ITC 20–30%, CCA 75%/50%, net metering for 12 months, Ontario Renovates up to $15K) are worded as on the current site.
- Partner portfolio images on the luxury page are CR Systems' work and are captioned that way.
- Videos and proposal PDFs still load from sunflow.ca. Move them over if the old site is retired.
