# Eave landing page

Static site: `index.html`, `styles.css`, `main.js`. No build step. GSAP 3.15 + ScrollTrigger and the
fonts (Instrument Serif, Geist, Geist Mono) load from CDNs.

```sh
python3 -m http.server 5391   # then open http://127.0.0.1:5391
```

## Placeholders

| Placeholder | Where | What |
| --- | --- | --- |
| Video | `index.html`, the `<video>` in `.vframe` | No video yet: give it a `src` (muted, looped). Until then the drawn room with Eave is its poster. |

The Download links (nav, hero, footer button, footer link, and the privacy page's) point at the newest release:
`https://github.com/userbiznes/eave-releases/releases/latest/download/Eave.dmg`, so they never need changing.
`privacy.html` is the privacy policy (its content matches what the app does; change it, and its date, when that
changes).

## Icons

`favicon.png` (64 px), `favicon.ico` (32 px, for browsers that ask for it by default) and `apple-touch-icon.png`
(180 px) are the app icon cropped to its rounded square (from `Eave/Assets.xcassets/AppIcon.appiconset` in the app's
repo, whose `Tools/make-icons.swift` draws it).

## Hosting

GitHub Pages from this repo (`userbiznes/eave-site`, branch `main`), at `eave.ardisusa.com`: the `CNAME` file names
the domain, and GoDaddy's DNS has a CNAME record `eave` → `userbiznes.github.io`. Pushing to `main` publishes.

The feature screenshots are real stills in `screens/`: frames of the running app (from the promo footage, plus the
clipboard and tray captured with `eave-promo/stage/stagectl.py`'s demo state), composited at their true screen
position on the dusk wallpaper. Each frame takes its image's shape via `--ar` on the `<figure>`. An `<img>` whose
src is a `[…]` placeholder shows a labelled stand-in instead of a broken image.

## How it works

- The opening (wall, roof, window, curtains, room, Eave) is drawn in `main.js`. Torn edges are baked
  into SVG paths with seeded noise, so they look the same on every visit and no filters run.
- One pinned ScrollTrigger timeline, measured in screens: the curtains open over the first screen,
  the name fades in, and at 1.45 screens the window shrinks onto `.vframe` while the wall closes in
  (`T0`, `TD` in `main.js`).
- The room in the window and the video poster use the same markup, so the handoff is exact.
- `prefers-reduced-motion` or a window under 500px tall: nothing is pinned. The window sits open
  above the product hero, with the title showing.
- Copying text anywhere on the page shows a "Copied" stamp.
