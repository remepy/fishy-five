# Fishy Five

A hidden-object game for the Cyan arm of the Remepy Parkinson's daily
protocol. Five named fish to find in an aquarium larger than the screen,
navigated by arrow pad across a 3×3 grid of quadrants. Built with Expo for
web, exported as a static site, hosted on S3/CloudFront and opened full-window
as a WebView by the Flutter app.

`artifacts/fishy-five/BRIDGE.md` is the integration contract: gameId, level
catalogue, stats keys, message flow and hosting layout. Read it before wiring
the game into the app.

## Layout

```
artifacts/fishy-five/
  index.js, App.tsx        entry — one screen, no router
  bridge/                  the Cyan bridge transport and session state
  components/, context/    the game itself
  levels/catalogue.ts      168 levels generated deterministically from their id
  localization/            loads ./translations.json, provides copy and direction
  translations/            he.json, en.json — the only place copy lives
  assets/                  artwork, music, sounds
  public/index.html        the page shell for the web export
  scripts/                 per-language build and the QA server
```

## Working on it

```
pnpm install
pnpm run typecheck
EXPO_PUBLIC_GAME_LANGUAGE=he pnpm --filter @workspace/fishy-five dev
```

There is no bridge in dev, so the game runs standalone: four levels from a
random start, no messages posted.

## Building for S3

```
pnpm --filter @workspace/fishy-five build:languages
```

Writes `dist/languages/he/` and `dist/languages/en/`. Each is a complete,
independent site compiled with its own base URL, so nothing resolves outside
its own language prefix. Upload the contents of each to
`games/fishy-five/{he,en}/`. Cache headers are in BRIDGE.md.

## QA: running a build locally

```
pnpm --filter @workspace/fishy-five build:languages
pnpm --filter @workspace/fishy-five serve
```

Then open http://localhost:4173/ for a menu, or go straight to a build:

- `…/games/fishy-five/he/index.html` — standalone, what QA sees opening a
  build URL.
- `…/games/fishy-five/he/index.html?bridge=1` — with a stand-in for the
  Flutter host: it answers `game_ready` with a `session_start` and prints
  every message the game posts, in a panel bottom-left and in the console.

Parameters on the `?bridge=1` URL: `rounds=N`, `levels=a,b,c`, `tutorial=0`,
`locale=en-US` (to check BR-14 from the Hebrew build), `delay=7000` (to check
the five-second timeout), `reducedMotion=1`. From the console,
`__host.send("pause")`, `"resume"` and `__host.send("abort", {reason: "call"})`
drive the rest of the app-side channel.

The server serves at the real S3 paths with the real cache headers and does no
clean-URL rewriting — a redirect from `/he/index.html` to `/he/` would break
the relative `./translations.json` fetch.

## Conventions

- Levels are addressed by catalogue id (`fishy-five-001`…), never by index.
  The app persists `lastCompletedLevelId`, so ids are permanent once a
  participant has played. A level id fully determines the board.
- All copy lives in `translations/`. Nothing user-facing is hard-coded and
  there are no fallback strings — a missing key fails the load rather than
  rendering itself on screen.
- The document stays `dir="ltr"` in both languages. The aquarium and its
  arrow navigation are physically left-to-right; text direction is applied
  per element from the translations file's `dir`. Setting `dir="rtl"` on the
  document mirrors every flex row, including tap targets over the canvas.
- Hebrew copy is gender-neutral: plural imperatives (`לחצו`), nouns rather
  than singular imperatives.
- No identifier, key, path, asset name or log line may carry arm-identifying
  vocabulary. This is a blinded trial; the word for this arm is "Cyan".
