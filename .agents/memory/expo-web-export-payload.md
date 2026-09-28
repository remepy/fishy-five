---
name: Expo web export payload traps
description: Why the exported static game carried ~20 MB it never served, and the two non-obvious techniques that removed it.
---

# Expo web export payload traps

## Barrel imports ship every variant

`@expo-google-fonts/*` and `@expo/vector-icons` both re-export their entire
catalog from the package index. Importing from the index puts *every* font
weight and *every* icon family into the static export, even though the browser
only ever requests the ones actually loaded. Import from the specific entry
points instead.

**Why:** this is invisible in development and invisible in the browser network
tab. It only shows up as upload size, so it survives indefinitely unless
someone measures the export directory.

**How to apply:** when an export directory looks far larger than what a session
downloads, diff the exported asset list against what the network tab requests.
The same trap applies to a static `require` of an asset nothing renders: the
file ships in every export regardless.

## Measure the session, not the directory

Directory size badly overstates cost, and "total assets" badly overstates it
too, because the game loads one background out of six per session. The number
worth optimizing is what a single first-time player downloads. Distinguish
further between bytes needed to reach an interactive screen and bytes that
stream in afterwards (audio), since they affect the user differently.

## Audio should never be on the path to interactive

The background track is the largest single download, and nothing needs it to
play the game. Create the `Audio` element lazily — at browser idle, on the
first gesture, or when the player turns music on — instead of awaiting an
asset download during mount.

**Why:** an awaited download at mount competes with the artwork and bundle for
bandwidth on a slow connection, delaying the playable screen for a file with no
gameplay role.

**How to apply:** arm the autoplay-fallback gesture listeners *immediately*,
before the audio exists, so a gesture both triggers the load and satisfies the
browser's autoplay policy. The toggle must also be able to start the load,
since a player can turn music on before the deferred load has fired.

## Flattening alpha is lossless when the backdrop is a known solid color

An image with a large alpha channel that always composites over one solid
color can have that color baked in with no change to the final composited
pixels, which often shrinks it substantially.

**Why:** comparing the flattened file against the *source* gives a terrible
PSNR and looks like a quality disaster. That comparison is wrong. Compare the
final composites — source-over-backdrop versus flattened — which is what the
player actually sees.

**How to apply:** confirm the backdrop is a single opaque color covering the
same rect, and confirm nothing else can show through. The backdrop color is
then baked into the asset: if it ever changes, the assets must be re-derived
from originals. Note that dependency in the docs next to the asset.
