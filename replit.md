# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### Where's Fishy (artifacts/wheres-fishy)
- Mobile game in Hebrew (RTL) built with Expo
- Players find 5 randomly drawn fish from a pool of 38, spread across a 3×2 grid canvas
- Features: bobbing fish animation, bubble effects on correct tap, wiggle on wrong tap, Hebrew completion modal
- Navigation: 4-arrow D-pad controller, mini-map showing current quadrant
- Goal panel: shows 5 target fish on the right side
- Assets: 38 fish PNGs, 24 plant PNGs, 8 rock PNGs, 5 toy PNGs, pebbles background
- No backend required — frontend-only game with pure client-side state
- **Web deployment**: `scripts/build.js` builds native (iOS/Android) Expo Go bundles AND a static web build via `expo export --platform web` into `static-build/web/`; `server/serve.js` routes native Expo Go requests (expo-platform header) to manifests and all browser requests to the web game directly

## Architecture Notes

- Game state managed via React Context (`context/GameContext.tsx`)
- Fish/decor placement uses collision-avoidance algorithm (no overlaps)
- Canvas navigation via Animated.spring slide transitions
- All animations use `Platform.OS !== 'web'` for `useNativeDriver` to support web preview

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
