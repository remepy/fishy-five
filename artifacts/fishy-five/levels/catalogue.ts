import { BG_IMAGES, FISH_LIST } from '@/constants/gameAssets';
import type { FishTranslationKey } from '@/localization/translations';

/**
 * The level catalogue.
 *
 * A level is fully determined by its id: the same `levelId` always yields the
 * same background, the same fish placements and the same five targets, on any
 * device. That is what lets the app own progression (it hands the game an
 * ordered `levelIds` list) while the game stores nothing.
 *
 * Canonical ids are `fishy-five-001` … `fishy-five-168`; the catalogue wraps after the
 * last one. Any other string is accepted and hashed to a seed, so a level
 * pointer authored outside this range still produces a stable board rather
 * than an error.
 */
export const LEVEL_COUNT = 168;
export const GRID_COLS = 3;
export const GRID_ROWS = 2;
export const NUM_TARGETS = 5;

export type FishId = FishTranslationKey;

export interface PlacedFish {
  instanceId: string;
  fishId: FishId;
  xPercent: number;
  yPercent: number;
  flipped: boolean;
}

export interface Level {
  levelId: string;
  bgImage: number;
  placedFish: PlacedFish[];
  targets: FishId[];
}

export function levelIdAt(index: number): string {
  const n = ((index % LEVEL_COUNT) + LEVEL_COUNT) % LEVEL_COUNT;
  return `fishy-five-${String(n + 1).padStart(3, '0')}`;
}

/** Consecutive level ids starting at `startIndex`, wrapping around the catalogue. */
export function levelIdsFrom(startIndex: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => levelIdAt(startIndex + i));
}

// FNV-1a: cheap, stable string hash to seed the generator.
function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: small, deterministic, good enough for board layout.
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePlacements(rng: () => number): PlacedFish[] {
  const occupied: Array<{ x: number; y: number; r: number }> = [];

  function noOverlap(x: number, y: number, r: number) {
    for (const o of occupied) {
      const dx = x - o.x;
      const dy = y - o.y;
      if (Math.sqrt(dx * dx + dy * dy) < r + o.r) return false;
    }
    return true;
  }

  function placeRandom(
    minX: number, maxX: number,
    minY: number, maxY: number,
    radius: number,
    maxAttempts = 40,
  ): { x: number; y: number } | null {
    for (let i = 0; i < maxAttempts; i++) {
      const x = minX + rng() * (maxX - minX);
      const y = minY + rng() * (maxY - minY);
      if (noOverlap(x, y, radius)) {
        occupied.push({ x, y, r: radius });
        return { x, y };
      }
    }
    return null;
  }

  const placedFish: PlacedFish[] = [];
  const allFish = shuffle(FISH_LIST, rng);
  allFish.forEach((fish, idx) => {
    const colBand = idx % GRID_COLS;
    const rowBand = Math.floor(idx / GRID_COLS) % GRID_ROWS;

    const xBase = (colBand / GRID_COLS) * 100;
    const yBase = (rowBand / GRID_ROWS) * 100;
    const xRange = 100 / GRID_COLS;
    const yRange = 100 / GRID_ROWS;

    const margin = 6;
    const pos = placeRandom(
      xBase + margin,
      xBase + xRange - margin,
      yBase + margin,
      yBase + yRange - margin,
      7,
    );

    if (pos) {
      placedFish.push({
        instanceId: fish.id + '_' + idx,
        fishId: fish.id,
        xPercent: pos.x,
        yPercent: pos.y,
        flipped: rng() < 0.5,
      });
    }
  });

  return placedFish;
}

export function generateLevel(levelId: string): Level {
  const rng = seededRandom(hashString(`${levelId}`));
  const bgImage = BG_IMAGES[Math.floor(rng() * BG_IMAGES.length)];
  // Placements first, so targets are only drawn from fish that actually
  // have a position on the canvas.
  const placedFish = generatePlacements(rng);
  const targets = shuffle(placedFish.map(f => f.fishId), rng).slice(0, NUM_TARGETS);
  return { levelId, bgImage, placedFish, targets };
}
