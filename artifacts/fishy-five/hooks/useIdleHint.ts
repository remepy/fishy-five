import { useEffect, useRef, useState } from 'react';

const IDLE_TIMEOUT = 60_000;
const COOLDOWN_DURATION = 30_000;

/**
 * Returns a `hintTick` counter that increments after IDLE_TIMEOUT ms of no
 * user interaction, then every COOLDOWN_DURATION ms thereafter.
 *
 * Crucially, the tick is computed at render time: if the resetKey has changed
 * since the last tick fired, the returned value is 0 immediately — no async
 * delay — preventing hints from firing the moment a new quadrant is entered.
 */
export function useIdleHint(resetKey: string, paused = false): number {
  // Track both the count AND the resetKey that was active when it was set.
  const [tickState, setTickState] = useState({ key: resetKey, count: 0 });

  const lastInteractionRef = useRef(Date.now());
  const phaseRef = useRef<'idle' | 'cooldown'>('idle');
  const cooldownStartRef = useRef(0);
  const tickCountRef = useRef(0);
  const resetKeyRef = useRef(resetKey);
  const pausedRef = useRef(paused);

  // While paused the clock does not advance; on resume the idle window
  // starts over so a hint never fires the instant the game reappears.
  useEffect(() => {
    pausedRef.current = paused;
    if (!paused) {
      lastInteractionRef.current = Date.now();
      phaseRef.current = 'idle';
    }
  }, [paused]);

  // Keep resetKeyRef current so the interval can stamp ticks with the right key.
  useEffect(() => {
    resetKeyRef.current = resetKey;
  }, [resetKey]);

  // Reset on resetKey change (quadrant navigation or new game).
  useEffect(() => {
    lastInteractionRef.current = Date.now();
    phaseRef.current = 'idle';
    tickCountRef.current = 0;
    setTickState({ key: resetKey, count: 0 });
  }, [resetKey]);

  // Reset on any pointer interaction.
  useEffect(() => {
    const onInteraction = () => {
      lastInteractionRef.current = Date.now();
      phaseRef.current = 'idle';
    };
    document.addEventListener('pointerdown', onInteraction);
    return () => document.removeEventListener('pointerdown', onInteraction);
  }, []);

  // Single polling loop — all mutable state lives in refs.
  useEffect(() => {
    const interval = setInterval(() => {
      if (pausedRef.current) return;
      const now = Date.now();
      if (phaseRef.current === 'idle') {
        if (now - lastInteractionRef.current >= IDLE_TIMEOUT) {
          phaseRef.current = 'cooldown';
          cooldownStartRef.current = now;
          tickCountRef.current += 1;
          const count = tickCountRef.current;
          const key = resetKeyRef.current;
          setTickState({ key, count });
        }
      } else {
        if (now - cooldownStartRef.current >= COOLDOWN_DURATION) {
          cooldownStartRef.current = now;
          tickCountRef.current += 1;
          const count = tickCountRef.current;
          const key = resetKeyRef.current;
          setTickState({ key, count });
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // If the resetKey has changed since the tick was stamped, return 0 immediately
  // at render time — before the async reset effect has had a chance to run.
  return tickState.key === resetKey ? tickState.count : 0;
}
