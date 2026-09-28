import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BubbleAnimation } from '@/components/BubbleAnimation';
import { CompletionModal } from '@/components/CompletionModal';
import { GameCanvas } from '@/components/GameCanvas';
import { GoalPanel } from '@/components/GoalPanel';
import HelpButton from '@/components/HelpButton';
import HintButton from '@/components/HintButton';
import { LevelStartPopup } from '@/components/LevelStartPopup';
import { HintArrow } from '@/components/HintArrow';
import MusicButton from '@/components/MusicButton';
import { MiniMap } from '@/components/MiniMap';
import { NavPad } from '@/components/NavPad';
import QuitButton from '@/components/QuitButton';
import { EndedScreen, PauseOverlay } from '@/components/SessionOverlays';
import { Tutorial, type Rect } from '@/components/Tutorial';
import { TryAgainText } from '@/components/TryAgainText';
import { useBridge } from '@/bridge/BridgeContext';
import {
  GameProvider,
  GRID_COLS,
  GRID_ROWS,
  type FishId,
  type PlacedFish,
  type QuadrantPos,
  useGame,
} from '@/context/GameContext';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { useBubbleSound } from '@/hooks/useBubbleSound';
import { useIdleHint } from '@/hooks/useIdleHint';

const MUSIC = require('../assets/music.mp3');

interface EffectItem {
  id: string;
  type: 'bubble' | 'tryagain';
  x: number;
  y: number;
}

interface HintState {
  sequence: number;
  fishId: FishId | null;
}

const dims = Dimensions.get('window');

function getFishQuadrant(fish: PlacedFish): QuadrantPos {
  return {
    col: Math.min(Math.floor((fish.xPercent / 100) * GRID_COLS), GRID_COLS - 1),
    row: Math.min(Math.floor((fish.yPercent / 100) * GRID_ROWS), GRID_ROWS - 1),
  };
}

function sameQuadrant(a: QuadrantPos, b: QuadrantPos): boolean {
  return a.col === b.col && a.row === b.row;
}

function GameBoard() {
  const insets = useSafeAreaInsets();
  const { paused } = useBridge();
  const [effects, setEffects] = useState<EffectItem[]>([]);
  const effectIdRef = useRef(0);
  const [goalRect, setGoalRect] = useState<Rect | null>(null);
  const [navRect, setNavRect] = useState<Rect | null>(null);
  const { enabled: musicEnabled, toggle: toggleMusic } = useBackgroundMusic(MUSIC, paused);
  const { play: playBubble } = useBubbleSound();

  const screenRef = useRef<View>(null);
  const goalWrapRef = useRef<View>(null);
  const navWrapRef = useRef<View>(null);
  const screenRect = useRef({ left: 0, top: 0, w: dims.width, h: dims.height });

  const measureRelative = useCallback(
    (ref: React.RefObject<View | null>, setter: (r: Rect) => void) => {
      const node = ref.current;
      if (!node) return;
      if (Platform.OS === 'web') {
        const el = node as unknown as HTMLElement;
        const sEl = screenRef.current as unknown as HTMLElement | null;
        if (el?.getBoundingClientRect && sEl?.getBoundingClientRect) {
          const r = el.getBoundingClientRect();
          const sR = sEl.getBoundingClientRect();
          setter({ x: r.left - sR.left, y: r.top - sR.top, width: r.width, height: r.height });
        }
        return;
      }
      const screenNode = screenRef.current;
      if (!screenNode) return;
      // @ts-ignore - measureLayout exists on native View
      node.measureLayout?.(
        screenNode,
        (x: number, y: number, width: number, height: number) => {
          setter({ x, y, width, height });
        },
        () => {}
      );
    },
    []
  );

  const sameRect = (a: Rect | null, b: Rect) =>
    !!a && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

  const remeasureTargets = useCallback(() => {
    measureRelative(goalWrapRef, r =>
      setGoalRect(prev => (sameRect(prev, r) ? prev : r))
    );
    measureRelative(navWrapRef, r =>
      setNavRect(prev => (sameRect(prev, r) ? prev : r))
    );
  }, [measureRelative]);

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', remeasureTargets);
    return () => sub?.remove();
  }, [remeasureTargets]);

  const {
    currentQuadrant,
    foundTargets,
    placedFish,
    recordHintUsed,
    reducedMotion,
    roundKey,
    setCurrentQuadrant,
    targets,
  } = useGame();

  const hintResetKey = `${roundKey}-${currentQuadrant.col}-${currentQuadrant.row}`;
  const idleHintTick = useIdleHint(hintResetKey, paused);
  const hintSequenceRef = useRef(0);
  const lastIdleHintTickRef = useRef(0);
  const [hintState, setHintState] = useState<HintState>({
    sequence: 0,
    fishId: null,
  });

  const remainingTargets = useMemo(
    () =>
      placedFish.filter(
        fish => targets.includes(fish.fishId) && !foundTargets.has(fish.fishId)
      ),
    [placedFish, targets, foundTargets]
  );

  const targetsInQuadrant = useCallback(
    (quadrant: QuadrantPos) =>
      remainingTargets.filter(fish => sameQuadrant(getFishQuadrant(fish), quadrant)),
    [remainingTargets]
  );

  const animateRandomTarget = useCallback((fish: PlacedFish[]) => {
    if (fish.length === 0) return false;
    const selected = fish[Math.floor(Math.random() * fish.length)];
    hintSequenceRef.current += 1;
    setHintState({
      sequence: hintSequenceRef.current,
      fishId: selected.fishId,
    });
    return true;
  }, []);

  useEffect(() => {
    if (idleHintTick === 0) {
      lastIdleHintTickRef.current = 0;
      return;
    }
    if (idleHintTick === lastIdleHintTickRef.current) return;
    lastIdleHintTickRef.current = idleHintTick;

    const localTargets = targetsInQuadrant(currentQuadrant);
    if (animateRandomTarget(localTargets)) return;

    hintSequenceRef.current += 1;
    setHintState({
      sequence: hintSequenceRef.current,
      fishId: null,
    });
  }, [idleHintTick, currentQuadrant, targetsInQuadrant, animateRandomTarget]);

  const handleHintPress = useCallback(() => {
    recordHintUsed();
    const localTargets = targetsInQuadrant(currentQuadrant);
    if (animateRandomTarget(localTargets)) return;
    if (remainingTargets.length === 0) return;

    const grouped = new Map<
      string,
      { quadrant: QuadrantPos; fish: PlacedFish[]; distance: number }
    >();

    remainingTargets.forEach(fish => {
      const quadrant = getFishQuadrant(fish);
      const key = `${quadrant.col}-${quadrant.row}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.fish.push(fish);
        return;
      }
      grouped.set(key, {
        quadrant,
        fish: [fish],
        distance:
          Math.abs(quadrant.col - currentQuadrant.col) +
          Math.abs(quadrant.row - currentQuadrant.row),
      });
    });

    const destinations = Array.from(grouped.values());
    const nearestDistance = Math.min(...destinations.map(item => item.distance));
    const nearest = destinations.filter(item => item.distance === nearestDistance);
    const destination = nearest[Math.floor(Math.random() * nearest.length)];

    setCurrentQuadrant(destination.quadrant);
    animateRandomTarget(destination.fish);
  }, [
    animateRandomTarget,
    currentQuadrant,
    recordHintUsed,
    remainingTargets,
    setCurrentQuadrant,
    targetsInQuadrant,
  ]);

  const measureScreen = useCallback(() => {
    if (Platform.OS === 'web' && screenRef.current) {
      const node = screenRef.current as unknown as HTMLElement;
      if (node.getBoundingClientRect) {
        const rect = node.getBoundingClientRect();
        screenRect.current = { left: rect.left, top: rect.top, w: rect.width, h: rect.height };
      }
    }
  }, []);

  const handleScreenLayout = useCallback((e: any) => {
    const { width, height } = e.nativeEvent.layout;
    screenRect.current.w = width;
    screenRect.current.h = height;
    measureScreen();
  }, [measureScreen]);

  const removeEffect = useCallback((id: string) => {
    setEffects(prev => prev.filter(e => e.id !== id));
  }, []);

  const handleWrongTap = useCallback((pageX: number, pageY: number) => {
    const r = screenRect.current;
    const x = pageX - r.left;
    const y = pageY - r.top;
    const id = `effect_${effectIdRef.current++}`;
    setEffects(prev => [...prev, { id, type: 'tryagain', x, y }]);
  }, []);

  const handleCorrectTap = useCallback(() => {
    playBubble();
    if (reducedMotion) return;
    const r = screenRect.current;
    const x = r.w / 2;
    const y = r.h * 0.4;
    const id = `effect_${effectIdRef.current++}`;
    setEffects(prev => [...prev, { id, type: 'bubble', x, y }]);
  }, [playBubble, reducedMotion]);

  const topPad = Platform.OS === 'web' ? 44 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 0 : insets.bottom;

  return (
    <View
      ref={screenRef}
      onLayout={handleScreenLayout}
      style={[styles.screen, { paddingTop: topPad, paddingBottom: bottomPad }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#023e8a" />

      <View style={styles.gameArea}>
        <GameCanvas
          onWrongTap={handleWrongTap}
          onCorrectTap={handleCorrectTap}
          hintTick={hintState.sequence}
          hintFishId={hintState.fishId}
        />
        <HintArrow hintTick={hintState.sequence} />
      </View>

      <View ref={goalWrapRef} onLayout={() => measureRelative(goalWrapRef, setGoalRect)}>
        <GoalPanel />
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.bottomGroup}>
          <MiniMap />
          <View ref={navWrapRef} onLayout={() => measureRelative(navWrapRef, setNavRect)}>
            <NavPad />
          </View>
        </View>
      </View>

      {effects.map(effect =>
        effect.type === 'bubble' ? (
          <BubbleAnimation
            key={effect.id}
            x={effect.x}
            y={effect.y}
            count={8}
            onComplete={() => removeEffect(effect.id)}
          />
        ) : (
          <TryAgainText
            key={effect.id}
            x={effect.x}
            y={effect.y}
            onDone={() => removeEffect(effect.id)}
          />
        )
      )}

      <CompletionModal />
      <LevelStartPopup topPad={topPad} />
      <Tutorial goalRect={goalRect} navRect={navRect} onRemeasure={remeasureTargets} />
      <QuitButton />
      <MusicButton enabled={musicEnabled} onToggle={toggleMusic} />
      <HintButton onPress={handleHintPress} />
      <HelpButton />
      {paused && <PauseOverlay />}
    </View>
  );
}

/**
 * Entry for a language route. Renders nothing until the host has configured
 * a session (or immediately, standalone), and goes inert once the activity
 * has ended.
 */
export default function GameScreen() {
  const { phase, session } = useBridge();
  if (phase === 'ended') return <EndedScreen />;
  if (phase !== 'active' || !session) return <View style={styles.screen} />;
  return (
    <GameProvider key={session.sessionId} session={session}>
      <GameBoard />
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#023e8a',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bottomBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: 'rgba(0, 20, 60, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(100, 200, 255, 0.3)',
  },
  bottomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
});
