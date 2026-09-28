# Static web export

## URL contract

The export is one directory holding both languages, matching the Cyan Game
Bridge URL layout `<gameId>/<lang>/index.html`:

- `en/index.html` + `en/translations.json` for English (`en-US`)
- `he/index.html` + `he/translations.json` for Hebrew (`he-IL`)
- `_expo/` and `assets/` shared by both

The Flutter app decides which language directory to load; the game never
reads the browser or device locale. At runtime the page fetches
`./translations.json` from its own directory and takes locale, text direction
and every string from that file (see `BRIDGE.md`). The root `index.html` Expo
also emits is a development redirect to `/en`; the export script strips it
(along with the sitemap and not-found pages) so the output directory is
exactly what gets uploaded. Both language directories and the shared `_expo/`
and `assets/` must be deployed together: a language directory on its own has
no assets.

Each language entry briefly normalizes the browser history to its canonical
Expo route (`/en`, `/he`) while the deferred router bundle initializes, then
restores the full public object URL. Before doing so it stashes the URL it was
served from in `window.__gamePageUrl`, which is what the translations fetch
resolves against. The bootstrap also maps delayed Expo canonical
`replaceState` writes back to the public object URL and freezes the absolute
asset base before normalization. This lets
`https://cdn.example/games/fishy-five/he/index.html` hydrate as `/he` even
though Expo Router has no runtime basename. The game coordinate system remains
physically left-to-right for both languages; only text follows the
translations file's `dir`.

## Cache policy

- `<lang>/index.html` and `<lang>/translations.json`: `Cache-Control: no-cache`
  (revalidate on every load). A stale page would reference a bundle that no
  longer exists; a stale translations file would show old copy.
- `_expo/**` and `assets/**`: content-hashed, safe to serve as
  `public, max-age=31536000, immutable`.

## Build and host

From `artifacts/wheres-fishy`, run:

```sh
pnpm export:web
```

The upload-ready directory is `static-build/web/`. The build verifies both
language documents and their translations files (same key set, valid locale
and dir, page title matching `app.title`) and rewrites their static references to be relative, so
the directory can be copied under any hosting prefix without a Node server,
SPA fallback, or rewrite rule. Re-run validation without rebuilding with:

```sh
pnpm verify:web-export
```

Upload the contents as ordinary static objects. For S3, serve the game over
HTTPS through CloudFront (recommended) or another HTTPS delivery layer in
front of the bucket; an S3 website endpoint itself is HTTP-only and is not an
appropriate production HTTPS URL. No bucket, distribution, DNS, or upload is
provisioned by this repository.

## Payload size

Measured on the export produced by `pnpm export:web`:

| | Before slimming | Now |
|---|---|---|
| Whole upload directory | 28.0 MiB | 9.2 MiB |
| JS bundle, gzipped | 665 KB | 531 KB |
| `music.mp3` | 4.34 MB | 1.30 MB |
| Backgrounds, each | ~1.2 MB | 572-877 KB |
| Decor artwork | 3.86 MB | not exported |
| Font files in the export | ~10 MB | 446 KB |

What one player actually downloads in a session -- the bundle, the icon fonts,
one background, the fish sprites on screen, and the music track -- went from
roughly 7.7 MB to roughly 3.4 MB, a 56% reduction. Excluding music, which
streams in after the game is already interactive, the bytes needed to reach a
playable screen fell by about 37%.

Where the savings came from:

- **Music.** The track was 212 kbps stereo, far above what a looping
  background loop needs. It is now 64 kbps mono at the same 162 s duration.
- **Backgrounds.** Each one carried an alpha channel averaging ~50%
  transparency, but the image always composites over a solid `#0077b6` water
  rectangle of identical size. Flattening against that exact color is lossless
  in terms of the final composited pixels, and the artwork is flat vector-style
  illustration that re-encodes cleanly. **If the water color in `GameCanvas`
  ever changes, these backgrounds must be re-derived from originals** -- the old
  water color is now baked into them. They were deliberately *not* downscaled:
  the scrollable world is three viewports wide and two tall, so at a 2x device
  pixel ratio the 3360x1440 source is already short of the pixels it is
  displayed at, and this is a game about spotting small fish in detailed art.
- **Fonts.** The app renders entirely in the platform's system font -- nothing
  sets a `fontFamily`. Two Inter weights were being downloaded on every load,
  and first paint was gated behind them, without changing a single glyph. That
  loading was removed.
- **Decor.** `assets/images/decor/` is artwork that nothing renders yet. It was
  converted from PNG to WebP and is no longer `require`d, so it stays in the
  repository without shipping in the export.

Keep the export lean by importing narrowly. `@expo-google-fonts/inter` and
`@expo/vector-icons` both re-export everything from their package index, so
importing from the index pulls every Inter weight and every icon family into
the export -- about 9 MB that no browser ever requests but every upload
carries. Import from the specific entry points instead
(`@expo/vector-icons/Ionicons`). The same applies to `require`: a static
`require` of an unused asset ships that file in every export.

The largest single item left is Ionicons at 390 KB, loaded for two glyphs.
Dropping it would mean redrawing the hint lightbulb with a Feather icon
(Feather is only 56 KB), which is a design decision rather than a compression
one.

Audio playback is subject to browser and embedded-WebView autoplay policy.
The user may need to tap the game before music or sound can start; the Flutter
container should not assume media can autoplay on initial navigation.