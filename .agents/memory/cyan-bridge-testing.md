---
name: Cyan bridge e2e testing
description: How to exercise the Flutter-host bridge of the Where's Fishy static export from a browser tester without a real host.
---
- Serve `static-build/web` under a nested prefix (e.g. `/games/fishy-five/`) with a throwaway static server started with `run_in_background`; `/tmp` scripts do not survive a workspace restart, so recreate them.
- Fake host via Playwright `addInitScript`: define `window.CyanGameBridge.postMessage` that records parsed messages; drive the game with `window.cyanBridge.receive(...)`. A host replying synchronously from inside `postMessage` is a valid case — the timer must be armed before `game_ready` is posted.
- Testers reliably lose fish that sit off-viewport: tell them hint → wait ~700 ms → tap the fish whose accessibility label matches an unchecked name in the Targets panel, and never click outside the viewport.
- The `session_start` 5 s window is real: a tester that "gets set up" before sending it will hit `session_start_timeout`; tell them to send it immediately after load.
