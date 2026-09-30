# Eave landing page

Static site: `index.html`, `styles.css`, `main.js`. No build step. GSAP 3.15 + ScrollTrigger and the
fonts (Instrument Serif, Geist, Geist Mono) load from CDNs.

```sh
python3 -m http.server 5391   # then open http://127.0.0.1:5391
```

## The video

The launch video has its own section under the opening (`.demo`, a frame like the hero's, `.clip`): `media/eave.mp4`
(1920 × 1200, 16:10 like the frame) and `media/eave-small.mp4` (1280 × 800, for screens up to 700 px, by the
`<source>`'s `media`), with `media/eave-poster.jpg` until it plays. Muted, so it can play on its own, while it's in
view; the round button in its corner turns the sound on (the song Spotify played during the take, under the effects). With reduced motion it
waits for its play button instead. The hero's frame is where the opening's window lands and shows the drawn room.
It's made in the app's repo (`Tools/promo/`): a take, then `compose.swift` at `--width 1920 --height 1200` and
`sound.swift` (with the recorded song), encoded with ffmpeg (x264, CRF 21, `+faststart`).

The Download links (nav, hero, footer button, footer link, and the privacy page's) point at the newest release:
`https://github.com/userbiznes/eave-releases/releases/latest/download/Eave.dmg`, so they never need changing.
`privacy.html` is the privacy policy (its content matches what the app does; change it, and its date, when that
changes).

## Icons

The favicon is Eave the way this page draws him (`eaveBody` and the "^" eyes in `main.js`), with a
thin cream rim so he shows on dark tabs: `favicon.svg`, `favicon.png` (64 px), `favicon.ico` (32 px)
and `apple-touch-icon.png` (180 px, on the page's cream). `tools/favicon.swift` draws them all.

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
