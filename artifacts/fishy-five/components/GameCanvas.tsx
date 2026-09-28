import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { GRID_COLS, GRID_ROWS, useGame, type FishId } from '@/context/GameContext';
import { AmbientBubbles } from './AmbientBubbles';
import { FishItem } from './FishItem';

interface CanvasSize {
  viewW: number;
  viewH: number;
}

interface Props {
  onWrongTap: (x: number, y: number) => void;
  onCorrectTap: () => void;
  hintTick: number;
  hintFishId: string | null;
}

export function GameCanvas({
  onWrongTap,
  onCorrectTap,
  hintTick,
  hintFishId,
}: Props) {
  const { placedFish, bgImage, currentQuadrant, tapFish, targets, foundTargets } = useGame();
  const [canvasSize, setCanvasSize] = useState<CanvasSize | null>(null);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const prevQuadrant = useRef(currentQuadrant);
  const canvasSizeRef = useRef<CanvasSize | null>(null);

  const handleLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      const size = { viewW: width, viewH: height };
      canvasSizeRef.current = size;
      setCanvasSize(size);
      translateX.setValue(-currentQuadrant.col * width);
      translateY.setValue(-currentQuadrant.row * height);
    }
  }, [currentQuadrant, translateX, translateY]);

  useEffect(() => {
    const size = canvasSizeRef.current;
    if (!size) return;
    if (
      prevQuadrant.current.col !== currentQuadrant.col ||
      prevQuadrant.current.row !== currentQuadrant.row
    ) {
      prevQuadrant.current = currentQuadrant;
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -currentQuadrant.col * size.viewW,
          useNativeDriver: Platform.OS !== 'web',
          tension: 80,
          friction: 10,
        }),
        Animated.spring(translateY, {
          toValue: -currentQuadrant.row * size.viewH,
          useNativeDriver: Platform.OS !== 'web',
          tension: 80,
          friction: 10,
        }),
      ]).start();
    }
  }, [currentQuadrant, translateX, translateY]);

  const handleFishTap = useCallback((instanceId: string, fishId: FishId, screenX: number, screenY: number) => {
    if (foundTargets.has(fishId)) return;
    const result = tapFish(instanceId, fishId);
    if (result === 'correct') {
      onCorrectTap();
    } else if (result === 'wrong') {
      onWrongTap(screenX, screenY);
    }
  }, [tapFish, onWrongTap, onCorrectTap, foundTargets]);

  return (
    <View style={styles.viewport} onLayout={handleLayout}>
      {canvasSize ? (
        <Animated.View
          style={[
            styles.canvas,
            {
              width: canvasSize.viewW * GRID_COLS,
              height: canvasSize.viewH * GRID_ROWS,
              transform: Platform.OS === 'web'
                ? [{ translateX: translateX as any }, { translateY: translateY as any }]
                : [{ translateX }, { translateY }],
            },
          ]}
        >
          {/* Solid water background */}
          <View style={[styles.waterBg, {
            width: canvasSize.viewW * GRID_COLS,
            height: canvasSize.viewH * GRID_ROWS,
          }]} />

          {/* BG scene image */}
          <Image
            source={bgImage}
            style={[styles.bgImage, {
              width: canvasSize.viewW * GRID_COLS,
              height: canvasSize.viewH * GRID_ROWS,
            }]}
            resizeMode="cover"
          />

          {/* Semi-transparent blue overlay */}
          <View
            style={[styles.bgOverlay, {
              width: canvasSize.viewW * GRID_COLS,
              height: canvasSize.viewH * GRID_ROWS,
            }]}
          />

          {/* Ambient bubbles — behind fish */}
          <AmbientBubbles
            canvasW={canvasSize.viewW * GRID_COLS}
            canvasH={canvasSize.viewH * GRID_ROWS}
            minInitialDelay={500}
            maxInitialDelay={3000}
          />

          {placedFish.map(pf => {
            const x = (pf.xPercent / 100) * (canvasSize.viewW * GRID_COLS);
            const y = (pf.yPercent / 100) * (canvasSize.viewH * GRID_ROWS);
            const isTarget = targets.includes(pf.fishId);
            const isFound = foundTargets.has(pf.fishId);

            // Only the selected unfound target in the visible quadrant pulses.
            const fishCol = Math.min(Math.floor((pf.xPercent / 100) * GRID_COLS), GRID_COLS - 1);
            const fishRow = Math.min(Math.floor((pf.yPercent / 100) * GRID_ROWS), GRID_ROWS - 1);
            const inCurrentQuadrant =
              fishCol === currentQuadrant.col && fishRow === currentQuadrant.row;
            const pulseTrigger =
              isTarget &&
              !isFound &&
              inCurrentQuadrant &&
              pf.fishId === hintFishId &&
              hintTick > 0
                ? hintTick
                : 0;

            return (
              <FishItem
                key={pf.instanceId}
                placedFish={pf}
                x={x}
                y={y}
                isTarget={isTarget}
                isFound={isFound}
                pulseTrigger={pulseTrigger}
                onTap={handleFishTap}
              />
            );
          })}

          {/* Ambient bubbles — in front of fish */}
          <AmbientBubbles
            canvasW={canvasSize.viewW * GRID_COLS}
            canvasH={canvasSize.viewH * GRID_ROWS}
            minInitialDelay={4000}
            maxInitialDelay={8000}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  waterBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#0077b6',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 20, 60, 0.4)',
  },
});
