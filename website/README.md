# Mark Anthony Bespoke — website

Static site for Mark Anthony Bespoke, 528 Chapel St, Unit A, New Haven CT.
Plain HTML, CSS and JavaScript. No build step, no server, no dependencies, no secrets.

```
index.html               Home
craft/index.html         The Craft — what bespoke means here, the commission timeline
commissions/index.html   What can be commissioned; cloth; price (TK)
book/index.html          Scheduling (Acuity embed)
visit/index.html         The rooms, location, what to expect on arrival
assets/css/site.css      All styles. Colour and type tokens at the top.
assets/js/site.js        Menu, carousel, scroll reveals, Acuity config + embed
assets/img/              Logos (SVG) and the Chapel Street sign photograph
.nojekyll                Tells GitHub Pages to serve files as-is
```

## 1. Before launch: fill the [TK] placeholders

Anything not confirmed is marked on the page in a highlighted `TK:` tag, so nothing
unverified goes live by accident. Search for them:

```
grep -rn "TK:" --include=*.html .
```

Open items include: the visit intervals in the timeline, Mark's background, the house cut,
how to name the workshop publicly, the cloth merchant list, price guidance (if any), hours,
parking, door/arrival instructions, phone number, Instagram, cancellation notice period,
wedding lead time.

## 2. Connect Acuity

All Acuity settings live in one block at the top of `assets/js/site.js`:

```js
var ACUITY = {
  ownerId: 'ACUITY_OWNER_ID',
  types: {
    consultation: { id: 'ACUITY_TYPE_ID_CONSULTATION', ... },
    fitting:      { id: 'ACUITY_TYPE_ID_FITTING', ... },
    collection:   { id: 'ACUITY_TYPE_ID_COLLECTION', ... }
  },
  ...
};
```

1. In Acuity, create three appointment types: **Initial consultation (90 min)**,
   **Fitting (45 min)**, **Collection (30 min)**.
2. **Owner ID:** Acuity → *Business Settings → Scheduling Page* → copy your scheduling link.
   The number after `owner=` is the owner ID.
3. **Appointment type IDs:** Acuity → *Appointment Types* → open each type → *Direct link*.
   The number after `appointmentType=` is that type's ID.
4. Replace the four placeholder strings, then commit. Nothing else needs changing.
5. In Acuity's confirmation email template, add what the website promises: the address,
   what to bring, parking.

Until the IDs are added, `/book` shows a "calendar connects once the Acuity account IDs are
added" note and the embed script is not loaded.

**How it works:**
- Each appointment type has an anchor on `/book`: `book/#consultation`, `book/#fitting`,
  `book/#collection`. Links anywhere on the site use these, so each button lands on the right
  calendar.
- One iframe is built only when the calendar area comes within 400px of the viewport.
  Acuity's `embed.js` is loaded once at that point.
- Its height is reserved in CSS (`.scheduler__frame`: 1100px on mobile, 900px from 768px up),
  so nothing jumps when it loads. If Acuity's form runs taller for your setup, raise both
  numbers.
- Below the frame, a fallback link opens the same calendar on Acuity's own site.
- Acuity's internals can't be styled from this page. Colours inside the calendar are set in
  Acuity under *Scheduling Page → Appearance*. Use ink `#1b3a2d` and gold `#a98b52` so the
  handoff matches.

## 3. Deploy to GitHub Pages

```
cd website
git init
git add .
git commit -m "Mark Anthony Bespoke site"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

Then on GitHub, open the repo → *Settings → Pages* → *Source: Deploy from a branch* →
`main` / `/ (root)` → Save. The site appears at `https://<you>.github.io/<repo>/` within a
minute or two. All paths are relative, so the repo subpath works unchanged.

**Custom domain (markanthonybespoke.com):** in *Settings → Pages → Custom domain*, enter the
domain. GitHub adds a `CNAME` file. At your DNS provider, add the four GitHub Pages `A` records
for the apex and a `CNAME` for `www` pointing to `<you>.github.io`. Then tick *Enforce HTTPS*.

## 4. Photography

Every image slot that still needs a photograph is a styled placeholder with the correct aspect
ratio, descriptive `aria-label`, and an HTML comment saying what belongs there. Search
`<!-- PHOTO:` to find them. To swap one in, replace the placeholder `<div class="ph" ...>` with:

```html
<img src="../assets/img/your-photo.jpg" width="1200" height="1500" loading="lazy"
     alt="Describe what's in the photograph">
```

(Use `assets/img/...` without `../` on the home page.)

- **Size:** export 4:5 portrait at 1200×1500, JPEG quality ~75–80. Aim for under 150KB each.
- **Carousel:** the four hero slides are in `index.html`. The first slide is the only image
  loaded eagerly, so keep it light.
- **The sign photograph** is only 352×440px, from the rendering. It will look soft on
  high-density phone screens. Replace it with a full-resolution shot once the sign is up.

## 5. Design tokens

At the top of `assets/css/site.css`. Measured contrast on paper `#fbfaf7`:

| Token | Value | Ratio | Use |
|---|---|---|---|
| `--ink` | `#1b3a2d` | 11.9:1 | headings, dark fields |
| `--body` | `#33322d` | 12.2:1 | body text |
| `--muted` | `#6b695f` | 5.3:1 | secondary text (brief's `#7c7a70` measured 4.1:1, under AA) |
| `--accent` | `#a98b52` | 3.1:1 | rules, ornaments, text ≥ 24px only |
| `--accent-text` | `#85683a` | 5.0:1 | small gold text (eyebrows, labels) |
| `--gilt` | `#c8a232` | 5.1:1 on ink | logo gold; dark fields only |

The logo files use `#162d20` / `#c8a232`. The brief's ink `#1b3a2d` is a touch lighter.
Both sit together without clashing. To align them exactly, change `--ink` to `#162d20`.

Type: Playfair Display (display), EB Garamond (body), Inter (labels and buttons), all from
Google Fonts.

## 6. Review mode

Add `?review=1` to any page URL to show a gold tag on each section (H-01, C-03, S-02…).
The tags match the rows of the "Mark Anthony Bespoke — Website Review" doc. Review mode lasts
for the browser session; `?review=0` turns it off. Visitors without the parameter see nothing
different. The tags are `data-review` attributes and can stay in the HTML after launch.

## 7. Editing shared parts

The header, footer and closing booking block repeat on each page. That's the price of having
no build step. If you change one, change all five pages. Each block is marked by its class:
`site-header`, `closing`, `site-footer`.
