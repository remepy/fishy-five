import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';

import { GRID_COLS, GRID_ROWS, useGame } from '@/context/GameContext';

type Direction = 'left' | 'right' | 'up' | 'down';

const BOB_DISTANCE = 14;
const BOB_DURATION = 380;
const BOB_CYCLES = 3;

const ARROW_CHAR: Record<Direction, string> = {
  left: '◀',
  right: '▶',
  up: '▲',
  down: '▼',
};

interface Props {
  hintTick: number;
}

export function HintArrow({ hintTick }: Props) {
  const { currentQuadrant, targets, foundTargets, placedFish } = useGame();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bobAnim = useRef(new Animated.Value(0)).current;
  const [activeDirection, setActiveDirection] = useState<Direction | null>(null);

  const prevTickRef = useRef(0);

  // Direction to the nearest quadrant that has unfound targets,
  // but ONLY when no unfound targets remain in the current quadrant
  // (fish-pulse hint takes priority in that case).
  const direction = useMemo<Direction | null>(() => {
    const remaining = targets.filter(t => !foundTargets.has(t));
    if (remaining.length === 0) return null;

    // Check if any remaining targets are in the current quadrant —
    // if so, the fish-pulse hint handles it; no arrow needed.
    const hasTargetHere = remaining.some(fishId => {
      const fish = placedFish.find(pf => pf.fishId === fishId);
      if (!fish) return false;
      const col = Math.min(Math.floor((fish.xPercent / 100) * GRID_COLS), GRID_COLS - 1);
      const row = Math.min(Math.floor((fish.yPercent / 100) * GRID_ROWS), GRID_ROWS - 1);
      return col === currentQuadrant.col && row === currentQuadrant.row;
    });
    if (hasTargetHere) return null;

    // Find quadrants with remaining targets outside the current one
    const otherQuadrants: Array<{ col: number; row: number }> = [];
    for (const fishId of remaining) {
      const fish = placedFish.find(pf => pf.fishId === fishId);
      if (!fish) continue;
      const col = Math.min(Math.floor((fish.xPercent / 100) * GRID_COLS), GRID_COLS - 1);
      const row = Math.min(Math.floor((fish.yPercent / 100) * GRID_ROWS), GRID_ROWS - 1);
      otherQuadrants.push({ col, row });
    }
    if (otherQuadrants.length === 0) return null;

    const nearest = otherQuadrants.reduce((best, q) => {
      const d = Math.abs(q.col - currentQuadrant.col) + Math.abs(q.row - currentQuadrant.row);
      const bd = Math.abs(best.col - currentQuadrant.col) + Math.abs(best.row - currentQuadrant.row);
      return d < bd ? q : best;
    });

    const dCol = nearest.col - currentQuadrant.col;
    const dRow = nearest.row - currentQuadrant.row;
    return Math.abs(dCol) >= Math.abs(dRow)
      ? dCol > 0 ? 'right' : 'left'
      : dRow > 0 ? 'down' : 'up';
  }, [currentQuadrant, targets, foundTargets, placedFish]);

  const directionRef = useRef(direction);
  useEffect(() => { directionRef.current = direction; }, [direction]);

  useEffect(() => {
    // hintTick reset to 0 — stop any running animation immediately
    if (hintTick === 0) {
      prevTickRef.current = 0;
      fadeAnim.stopAnimation();
      bobAnim.stopAnimation();
      fadeAnim.setValue(0);
      bobAnim.setValue(0);
      setActiveDirection(null);
      return;
    }

    // New tick — start animation if there is a valid direction
    if (hintTick !== prevTickRef.current) {
      prevTickRef.current = hintTick;
      const dir = directionRef.current;
      if (dir === null) return;

      // Stop any in-progress animation before starting fresh
      fadeAnim.stopAnimation();
      bobAnim.stopAnimation();
      fadeAnim.setValue(0);
      bobAnim.setValue(0);

      setActiveDirection(dir);

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(bobAnim, {
              toValue: 1,
              duration: BOB_DURATION,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(bobAnim, {
              toValue: 0,
              duration: BOB_DURATION,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
          { iterations: BOB_CYCLES }
        ),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setActiveDirection(null);
          fadeAnim.setValue(0);
          bobAnim.setValue(0);
        }
      });
    }
  }, [hintTick, fadeAnim, bobAnim]);

  if (!activeDirection) return null;

  const isHorizontal = activeDirection === 'left' || activeDirection === 'right';
  const bobDir = (activeDirection === 'right' || activeDirection === 'down') ? 1 : -1;

  const translateInterp = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, bobDir * BOB_DISTANCE],
  });

  const transform = Platform.OS === 'web'
    ? isHorizontal
      ? [{ translateX: translateInterp as any }]
      : [{ translateY: translateInterp as any }]
    : isHorizontal
      ? [{ translateX: translateInterp }]
      : [{ translateY: translateInterp }];

  const edgeStyle = {
    left:  { left: 0,   top: 0, bottom: 0, width: 64,  alignItems: 'center' as const, justifyContent: 'center' as const },
    right: { right: 0,  top: 0, bottom: 0, width: 64,  alignItems: 'center' as const, justifyContent: 'center' as const },
    up:    { top: 0,  left: 0, right: 0,   height: 64, alignItems: 'center' as const, justifyContent: 'center' as const },
    down:  { bottom: 0, left: 0, right: 0, height: 64, alignItems: 'center' as const, justifyContent: 'center' as const },
  }[activeDirection];

  return (
    <View style={[styles.edgeWrapper, edgeStyle]}>
      <Animated.View style={[styles.bubble, { opacity: fadeAnim, transform }]}>
        <Text style={styles.arrowText}>{ARROW_CHAR[activeDirection]}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  edgeWrapper: {
    position: 'absolute',
    zIndex: 150,
    pointerEvents: 'none',
  } as any,
  bubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 60, 140, 0.75)',
    borderWidth: 2.5,
    borderColor: 'rgba(120, 210, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 26,
    color: '#ffffff',
    lineHeight: 30,
  },
});
