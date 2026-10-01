# Cyan Game Bridge binding — `fishy-five`

This document is the game-specific binding for the Cyan Game Bridge v1 spec.
It records the values the app team needs and the choices the game made where
the spec leaves them to the game.

## Identity

| | |
|---|---|
| `gameId` | `fishy-five` |
| `protocolVersion` | `1` |
| Languages | `en` (`en-US`, ltr), `he` (`he-IL`, rtl) |
| URL | `https://<cdn>/games/fishy-five/{lang}/index.html` |
| Rounds per session | 4 |
| Deploy layout | one self-contained directory per language: each carries its own `index.html`, `translations.json`, `_expo/` and `assets/` (spec §4.1) |

## Level catalogue

168 levels, ids `fishy-five-001` … `fishy-five-168`. A level id fully determines the
board (background, fish placement, the five targets) on every device, so the
app can hand the game any ordered list of ids and get the same game back.
The catalogue conceptually wraps: after `fishy-five-168` the app should continue
with `fishy-five-001`. Ids outside this set are accepted and produce a stable
board too, but only the canonical ids should be scheduled.

Each level has exactly one round; the game reports `level_completed` per
level id it was given, in order. Rounds cannot be lost: `outcome` is always
`"won"`.

## Session lifecycle as implemented

1. Page loads, fetches `./translations.json` (no hard-coded copy exists). If
   this fails the game posts `game_error` `translations_unavailable` and
   renders nothing.
2. `game_ready` `{ gameId: "fishy-five", protocolVersion: 1, locale }` where
   `locale` is the value from the translations file.
3. Waits up to 5 s for `session_start`. On timeout: `game_error`
   `session_start_timeout`.
4. `session_start` is checked: schema (`invalid_session_start`), protocol
   (`unsupported_protocol`), `expectedLocale` against the loaded locale
   (`locale_mismatch`). Any failure ends the activity.
5. Plays `levelIds` in order. Between levels the game shows its own success
   screen with a "next round" button. After the last level it posts
   `game_finished` and shows a blank screen — no success screen, the app owns
   the summary.
6. `pause` covers the board with an overlay, silences audio and freezes the
   idle-hint timer; `resume` reverses it. `abort` silences audio, blanks the
   screen and stops all further posting.

If the page is opened without `window.CyanGameBridge` (QA in a browser) the
game plays 4 consecutive levels from a random start, posts nothing, and offers
"play again" at the end.

## Stats

Every `level_completed` carries:

| key | meaning |
|---|---|
| `totalTaps` | fish taps that changed something: correct finds and wrong fish. Re-tapping an already-found fish is not counted. |
| `wrongTaps` | taps on fish that were not a remaining target |
| `hintsUsed` | presses of the hint button. Automatic idle hints (the game nudges after 60 s without input) are not counted. |

`game_finished.stats` is the sum of the above across the session plus
`rounds`, the number of levels completed. No elapsed time is reported (the
app owns timing, BR-04).

## Quit

A quit button is always visible top-left. It opens an in-game confirmation;
confirming posts `game_exit_requested` and the game goes inert. The success
screen also has an "exit" action that does the same.

## Tutorial

`tutorialSeen: true` suppresses the tutorial; `false` shows it. When the app
provides the flag it wins; the game's own stored flag (the only thing it
persists, BR-06) is used only when no host is present. A help button lets the
participant replay the tutorial at any time; the spec has no message for
telling the app the tutorial was seen, so the app must track that itself.

## Accessibility

`reducedMotion: true` removes the ambient rising bubbles and the bubble burst
on a correct tap. Camera pans between quadrants are kept because they carry
information (where the hint is pointing).

## Building and hosting

```
npm run build:languages --workspace @workspace/fishy-five
```

Produces `dist/languages/{he,en}/`, each exported with its own base URL
(`/games/fishy-five/<lang>/`) so every asset and `./translations.json` resolve
relative to that page. Upload the **contents** of each to
`games/fishy-five/{he,en}/` on S3.

Serve `index.html` and `translations.json` as `no-cache`; the content-hashed
`_expo/` and `assets/` as `public, max-age=31536000, immutable`. That is what
lets copy be corrected by replacing one JSON file without a redeploy.

## Notes for reviewers

- Locale never comes from the URL, browser or device: the language is fixed
  at build time and the page fetches the `translations.json` beside it.
- The game world and arrow navigation are physically left-to-right in both
  languages; only text direction follows `dir`.
- The game is a single screen with no router: one export per language, the
  language chosen by `EXPO_PUBLIC_GAME_LANGUAGE` at build time.
- BR-10 (forbidden identifier words) is honoured in game code, file names and
  translation keys. Minified third-party library code in `_expo/` cannot be
  scrubbed and may contain such words in unrelated contexts.
