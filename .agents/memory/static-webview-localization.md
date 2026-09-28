---
name: Static WebView localization
description: Deployment and language constraints for the Flutter-hosted game
---
Flutter, not the game or browser, determines language and opens the corresponding static S3 entry. Hebrew uses one plural form of address without gender variants.

**Why:** The host app owns the user's locale and the game is a remotely loaded WebView, not a standalone native localization flow.

**How to apply:** Keep URL selection authoritative and keep aquarium navigation literal rather than mirroring physical left/right for Hebrew.

Static-export routing must preserve the full public object URL after React initializes, not merely restore it on the window load event.

**Why:** Browser verification showed Expo Router can write its canonical path after load, dropping a hosting prefix and breaking reloads. Relative asset bases must also be resolved before temporarily changing history.

**How to apply:** When changing export or routing, verify a nested-prefix URL remains intact after settling and reload the current location, rather than navigating again to the intended entry URL.