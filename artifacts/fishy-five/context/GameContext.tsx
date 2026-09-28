import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useBridge, type Session } from '@/bridge/BridgeContext';
import type { RoundStats } from '@/bridge/cyanBridge';
import {
  generateLevel,
  GRID_COLS,
  GRID_ROWS,
  NUM_TARGETS,
  type FishId,
  type PlacedFish,
} from '@/levels/catalogue';

export { GRID_COLS, GRID_ROWS, NUM_TARGETS } from '@/levels/catalogue';
export type { FishId, PlacedFish } from '@/levels/catalogue';
export const TOTAL_QUADRANTS = GRID_COLS * GRID_ROWS;

/**
 * The only thing the game persists across sessions (BR-06). The host's
 * `session_start.tutorialSeen` takes precedence whenever it is present.
 */
const TUTORIAL_SEEN_KEY = 'fishyFive.tutorialSeen';

export type QuadrantPos = { col: number; row: number };

export type TapResult = 'correct' | 'wrong' | 'already_found';

interface GameContextType {
  levelId: string;
  roundIndex: number;
  roundCount: number;
  isLastRound: boolean;
  targets: FishId[];
  foundTargets: Set<FishId>;
  placedFish: PlacedFish[];
  bgImage: number;
  currentQuadrant: QuadrantPos;
  setCurrentQuadrant: (q: QuadrantPos) => void;
  tapFish: (instanceId: string, fishId: FishId) => TapResult;
  recordHintUsed: () => void;
  isRoundComplete: boolean;
  /** Advance to the next round, or (standalone only) start a new session. */
  continueAfterRound: () => void;
  showComplete: boolean;
  showLevelStart: boolean;
  startGame: () => void;
  showTutorial: boolean;
  dismissTutorial: () => void;
  relaunchTutorial: () => void;
  tutorialStep: number;
  advanceTutorial: () => void;
  goBackTutorial: () => void;
  dontShowTutorialAgain: boolean;
  setDontShowTutorialAgain: (v: boolean) => void;
  /** Changes whenever a new board is shown; used to reset per-round timers. */
  roundKey: string;
  reducedMotion: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

const emptyStats = (): RoundStats => ({ totalTaps: 0, wrongTaps: 0, hintsUsed: 0 });

export function GameProvider({
  session,
  children,
}: {
  session: Session;
  children: React.ReactNode;
}) {
  const { reportLevelCompleted, reportGameFinished, restartStandalone } = useBridge();

  const [roundIndex, setRoundIndex] = useState(0);
  const roundCount = session.levelIds.length;
  const isLastRound = roundIndex >= roundCount - 1;
  const levelId = session.levelIds[Math.min(roundIndex, roundCount - 1)];
  const level = useMemo(() => generateLevel(levelId), [levelId]);

  const [foundTargets, setFoundTargets] = useState<Set<FishId>>(new Set());
  const [currentQuadrant, setCurrentQuadrant] = useState<QuadrantPos>({ col: 1, row: 1 });
  const [showComplete, setShowComplete] = useState(false);
  const [showLevelStart, setShowLevelStart] = useState(true);
  // Default to false until we know the tutorial flag, so the tutorial doesn't
  // flash for someone who has already seen it.
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [dontShowTutorialAgain, setDontShowTutorialAgainState] = useState(false);

  const roundStatsRef = useRef<RoundStats>(emptyStats());
  const sessionStatsRef = useRef<RoundStats>(emptyStats());
  const roundReportedRef = useRef(false);
  // Synchronous mirror of `foundTargets` so two taps on the same fish within
  // one frame are counted once, like the find itself.
  const foundRef = useRef<Set<FishId>>(new Set());

  // Resolve the tutorial flag once per session. The host's value is
  // authoritative; the stored flag only matters when no host told us.
  useEffect(() => {
    let cancelled = false;
    if (session.tutorialSeen !== null) {
      setDontShowTutorialAgainState(session.tutorialSeen);
      setShowTutorial(!session.tutorialSeen);
      return;
    }
    AsyncStorage.getItem(TUTORIAL_SEEN_KEY)
      .then(v => {
        if (cancelled) return;
        const seen = v === '1';
        setDontShowTutorialAgainState(seen);
        setShowTutorial(!seen);
      })
      .catch(() => {
        if (!cancelled) setShowTutorial(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.tutorialSeen]);

  const setDontShowTutorialAgain = useCallback((v: boolean) => {
    setDontShowTutorialAgainState(v);
    AsyncStorage.setItem(TUTORIAL_SEEN_KEY, v ? '1' : '0').catch(() => {});
  }, []);

  const finishRound = useCallback(() => {
    if (roundReportedRef.current) return;
    roundReportedRef.current = true;
    const stats = { ...roundStatsRef.current };
    const totals = sessionStatsRef.current;
    totals.totalTaps += stats.totalTaps;
    totals.wrongTaps += stats.wrongTaps;
    totals.hintsUsed += stats.hintsUsed;

    reportLevelCompleted(levelId, stats);
    if (isLastRound) {
      reportGameFinished(levelId, { ...totals, rounds: roundCount });
    }
    // Between rounds the game shows its own success screen (BR-01). After
    // the final round a host takes over; standalone shows the screen anyway
    // so a QA session can be replayed.
    if (!isLastRound || session.mode === 'standalone') {
      setShowComplete(true);
    }
  }, [isLastRound, levelId, roundCount, reportGameFinished, reportLevelCompleted, session.mode]);

  const finishRoundRef = useRef(finishRound);
  finishRoundRef.current = finishRound;

  const tapFish = useCallback((_instanceId: string, fishId: FishId): TapResult => {
    if (foundRef.current.has(fishId)) return 'already_found';
    roundStatsRef.current.totalTaps += 1;

    if (level.targets.includes(fishId)) {
      const next = new Set(foundRef.current);
      next.add(fishId);
      foundRef.current = next;
      setFoundTargets(next);
      if (next.size === NUM_TARGETS) {
        setTimeout(() => finishRoundRef.current(), 600);
      }
      return 'correct';
    }
    roundStatsRef.current.wrongTaps += 1;
    return 'wrong';
  }, [level.targets]);

  const recordHintUsed = useCallback(() => {
    roundStatsRef.current.hintsUsed += 1;
  }, []);

  const isRoundComplete = foundTargets.size === NUM_TARGETS;

  const continueAfterRound = useCallback(() => {
    if (isLastRound) {
      restartStandalone();
      return;
    }
    roundStatsRef.current = emptyStats();
    roundReportedRef.current = false;
    foundRef.current = new Set();
    setFoundTargets(new Set());
    setCurrentQuadrant({ col: 1, row: 1 });
    setShowComplete(false);
    setShowLevelStart(true);
    setRoundIndex(i => i + 1);
  }, [isLastRound, restartStandalone]);

  const advanceTutorial = useCallback(() => {
    setTutorialStep(s => {
      if (s >= 2) {
        setShowTutorial(false);
        return s;
      }
      return s + 1;
    });
  }, []);

  const goBackTutorial = useCallback(() => {
    setTutorialStep(s => {
      const next = Math.max(0, s - 1);
      // Stepping back into the arrow step: reset the camera so the
      // highlighted arrow can be tried again.
      if (next === 1) {
        setCurrentQuadrant({ col: 1, row: 1 });
      }
      return next;
    });
  }, []);

  const startGame = useCallback(() => {
    setShowLevelStart(false);
  }, []);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  const relaunchTutorial = useCallback(() => {
    setShowComplete(false);
    setShowLevelStart(false);
    setCurrentQuadrant({ col: 1, row: 1 });
    setTutorialStep(0);
    setShowTutorial(true);
  }, []);

  const roundKey = `${session.sessionId}:${roundIndex}:${levelId}`;

  const value = useMemo<GameContextType>(() => ({
    levelId,
    roundIndex,
    roundCount,
    isLastRound,
    targets: level.targets,
    foundTargets,
    placedFish: level.placedFish,
    bgImage: level.bgImage,
    currentQuadrant,
    setCurrentQuadrant,
    tapFish,
    recordHintUsed,
    isRoundComplete,
    continueAfterRound,
    showComplete,
    showLevelStart,
    startGame,
    showTutorial,
    dismissTutorial,
    relaunchTutorial,
    tutorialStep,
    advanceTutorial,
    goBackTutorial,
    dontShowTutorialAgain,
    setDontShowTutorialAgain,
    roundKey,
    reducedMotion: session.reducedMotion,
  }), [
    levelId,
    roundIndex,
    roundCount,
    isLastRound,
    level,
    foundTargets,
    currentQuadrant,
    tapFish,
    recordHintUsed,
    isRoundComplete,
    continueAfterRound,
    showComplete,
    showLevelStart,
    startGame,
    showTutorial,
    dismissTutorial,
    relaunchTutorial,
    tutorialStep,
    advanceTutorial,
    goBackTutorial,
    dontShowTutorialAgain,
    setDontShowTutorialAgain,
    roundKey,
    session.reducedMotion,
  ]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
