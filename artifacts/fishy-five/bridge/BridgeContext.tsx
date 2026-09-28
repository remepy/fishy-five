import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { LEVEL_COUNT, levelIdsFrom } from '@/levels/catalogue';

import {
  GAME_ID,
  hasBridge,
  installReceiver,
  isValidSessionStart,
  postToApp,
  PROTOCOL_VERSION,
  sealBridge,
  SESSION_START_TIMEOUT_MS,
  type AppMessage,
  type RoundStats,
  type SessionStats,
} from './cyanBridge';

/** Rounds a standalone (no host) session plays before offering "play again". */
export const STANDALONE_ROUNDS = 4;

export type SessionMode = 'bridged' | 'standalone';

export interface Session {
  mode: SessionMode;
  sessionId: string;
  levelIds: string[];
  reducedMotion: boolean;
  /** `null` when no host told us; the game then falls back to its stored flag. */
  tutorialSeen: boolean | null;
}

/**
 * - `waiting`: `game_ready` posted, `session_start` not yet received.
 * - `active`: a session is configured and the game may run.
 * - `ended`: the activity is over (finished, quit, aborted or errored). The
 *   game renders an inert screen and posts nothing further.
 */
export type SessionPhase = 'waiting' | 'active' | 'ended';

export interface BridgeContextValue {
  phase: SessionPhase;
  paused: boolean;
  session: Session | null;
  reportLevelCompleted: (levelId: string, stats: RoundStats) => void;
  reportGameFinished: (lastCompletedLevelId: string, stats: SessionStats) => void;
  requestExit: () => void;
  reportError: (code: string, message: string) => void;
  /** Standalone only: begin a fresh session with new levels. */
  restartStandalone: () => void;
}

const BridgeContext = createContext<BridgeContextValue | null>(null);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function standaloneSession(): Session {
  const start = Math.floor(Math.random() * LEVEL_COUNT);
  return {
    mode: 'standalone',
    sessionId: `standalone-${Date.now()}`,
    levelIds: levelIdsFrom(start, STANDALONE_ROUNDS),
    reducedMotion: prefersReducedMotion(),
    tutorialSeen: null,
  };
}

export function BridgeProvider({
  locale,
  children,
}: {
  /** The locale the loaded translations file declares. */
  locale: string;
  children: ReactNode;
}) {
  const bridged = useMemo(() => hasBridge(), []);
  const [phase, setPhase] = useState<SessionPhase>(bridged ? 'waiting' : 'active');
  const [paused, setPaused] = useState(false);
  const [session, setSession] = useState<Session | null>(() =>
    bridged ? null : standaloneSession(),
  );
  // Mirrors `phase` synchronously so a message arriving before React has
  // re-rendered (e.g. a host replying from inside postMessage) sees the
  // transition that already happened.
  const phaseRef = useRef(phase);

  const end = useCallback(() => {
    sealBridge();
    phaseRef.current = 'ended';
    setPhase('ended');
    setPaused(false);
  }, []);

  const reportError = useCallback((code: string, message: string) => {
    if (phaseRef.current === 'ended') return;
    postToApp({ type: 'game_error', data: { code, message } });
    end();
  }, [end]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const onMessage = (message: AppMessage) => {
      if (phaseRef.current === 'ended') return;
      switch (message.type) {
        case 'session_start': {
          if (phaseRef.current !== 'waiting') return;
          if (timeout !== undefined) clearTimeout(timeout);
          const data = message.data;
          if (!isValidSessionStart(data)) {
            reportError('invalid_session_start', 'session_start payload failed validation');
            return;
          }
          if (data.protocolVersion !== PROTOCOL_VERSION) {
            reportError(
              'unsupported_protocol',
              `expected protocol ${PROTOCOL_VERSION}, got ${data.protocolVersion}`,
            );
            return;
          }
          if (data.expectedLocale !== locale) {
            reportError(
              'locale_mismatch',
              `build loaded ${locale} but app expected ${data.expectedLocale}`,
            );
            return;
          }
          setSession({
            mode: 'bridged',
            sessionId: data.sessionId,
            levelIds: data.levelIds,
            reducedMotion: data.reducedMotion,
            tutorialSeen: data.tutorialSeen,
          });
          phaseRef.current = 'active';
          setPhase('active');
          return;
        }
        case 'pause':
          setPaused(true);
          return;
        case 'resume':
          setPaused(false);
          return;
        case 'abort':
          end();
          return;
      }
    };

    // The receiver and the timer must both exist before the host is told we
    // are ready: a host may answer synchronously from inside postMessage.
    const uninstall = installReceiver(onMessage);

    if (bridged) {
      timeout = setTimeout(() => {
        reportError(
          'session_start_timeout',
          `no session_start within ${SESSION_START_TIMEOUT_MS} ms of game_ready`,
        );
      }, SESSION_START_TIMEOUT_MS);
      postToApp({
        type: 'game_ready',
        data: { gameId: GAME_ID, protocolVersion: PROTOCOL_VERSION, locale },
      });
    }

    return () => {
      if (timeout !== undefined) clearTimeout(timeout);
      uninstall();
    };
  }, [bridged, locale, end, reportError]);

  const reportLevelCompleted = useCallback((levelId: string, stats: RoundStats) => {
    if (phaseRef.current !== 'active') return;
    postToApp({ type: 'level_completed', data: { levelId, outcome: 'won', stats } });
  }, []);

  const reportGameFinished = useCallback((lastCompletedLevelId: string, stats: SessionStats) => {
    if (phaseRef.current !== 'active') return;
    postToApp({ type: 'game_finished', data: { lastCompletedLevelId, stats } });
    // Standalone keeps running so QA can play again; a host takes over from
    // here and the game must go quiet.
    if (bridged) end();
  }, [bridged, end]);

  const requestExit = useCallback(() => {
    if (phaseRef.current === 'ended') return;
    postToApp({ type: 'game_exit_requested' });
    end();
  }, [end]);

  const restartStandalone = useCallback(() => {
    if (bridged) return;
    setSession(standaloneSession());
    phaseRef.current = 'active';
    setPhase('active');
    setPaused(false);
  }, [bridged]);

  const value = useMemo<BridgeContextValue>(() => ({
    phase,
    paused,
    session,
    reportLevelCompleted,
    reportGameFinished,
    requestExit,
    reportError,
    restartStandalone,
  }), [phase, paused, session, reportLevelCompleted, reportGameFinished, requestExit, reportError, restartStandalone]);

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}

export function useBridge(): BridgeContextValue {
  const context = useContext(BridgeContext);
  if (!context) throw new Error('useBridge must be used inside BridgeProvider');
  return context;
}
