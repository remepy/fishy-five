import { Asset } from 'expo-asset';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Fallback delay before the music is fetched, for browsers without
 * requestIdleCallback. The point is to let the artwork and the bundle the
 * player actually needs to start playing win the bandwidth race first.
 */
const LOAD_DELAY_MS = 2000;

/**
 * Background music for the web build. The track is the single largest asset
 * in the game, so it is never fetched during mount: loading is deferred until
 * the browser reports an idle moment (or the player interacts, or turns the
 * music on), which means the game is interactive well before the music
 * arrives. Web-only — no-ops on native.
 */
/**
 * `suspended` is the host-driven override: while true (paused or aborted) the
 * track is silent regardless of the player's own toggle, and it resumes by
 * itself when the flag clears if the player left the music on.
 */
export function useBackgroundMusic(moduleId: number, suspended = false) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const suspendedRef = useRef(suspended);
  suspendedRef.current = suspended;
  /** Tracks the previous `enabled` value so the effect below can tell a real
   *  off→on toggle apart from its own first run at mount. */
  const prevEnabledRef = useRef(true);
  /** Set by the mount effect so the toggle can kick off a deferred load. */
  const ensureAudioRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let cancelled = false;
    let creating = false;
    let listening = false;

    const tryPlay = () => {
      const audio = audioRef.current;
      if (!audio || !enabledRef.current || suspendedRef.current) return;
      audio
        .play()
        .then(removeInteractionListeners)
        // Autoplay blocked: wait for the first gesture and try again.
        .catch(addInteractionListeners);
    };

    const onInteraction = () => {
      if (!enabledRef.current) return;
      ensureAudio();
      tryPlay();
    };

    function addInteractionListeners() {
      if (listening || cancelled) return;
      listening = true;
      document.addEventListener('pointerdown', onInteraction);
      document.addEventListener('keydown', onInteraction);
    }

    function removeInteractionListeners() {
      if (!listening) return;
      listening = false;
      document.removeEventListener('pointerdown', onInteraction);
      document.removeEventListener('keydown', onInteraction);
    }

    function attach(uri: string) {
      if (cancelled || audioRef.current) return;
      const audio = new Audio(uri);
      audio.loop = true;
      audio.volume = 0.5;
      audioRef.current = audio;
      tryPlay();
    }

    function ensureAudio() {
      if (cancelled || creating || audioRef.current) return;
      creating = true;
      const asset = Asset.fromModule(moduleId);
      if (asset.uri) {
        attach(asset.uri);
        return;
      }
      asset
        .downloadAsync()
        .then(() => {
          const uri = asset.localUri ?? asset.uri;
          if (uri) attach(uri);
        })
        .catch(() => {
          creating = false;
        });
    }

    ensureAudioRef.current = ensureAudio;

    // A gesture before the track is loaded should both start the fetch and
    // satisfy the browser's autoplay policy.
    addInteractionListeners();

    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const startLoad = () => {
      if (enabledRef.current) ensureAudio();
    };
    let idleHandle: number | undefined;
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    if (typeof w.requestIdleCallback === 'function') {
      idleHandle = w.requestIdleCallback(startLoad, { timeout: LOAD_DELAY_MS });
    } else {
      timeoutHandle = setTimeout(startLoad, LOAD_DELAY_MS);
    }

    const onVisibility = () => {
      if (!audioRef.current) return;
      if (document.hidden) {
        audioRef.current.pause();
      } else if (enabledRef.current && !suspendedRef.current) {
        audioRef.current.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      ensureAudioRef.current = () => {};
      if (idleHandle !== undefined && typeof w.cancelIdleCallback === 'function') {
        w.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
      removeInteractionListeners();
      document.removeEventListener('visibilitychange', onVisibility);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [moduleId]);

  useEffect(() => {
    enabledRef.current = enabled;
    const wasEnabled = prevEnabledRef.current;
    prevEnabledRef.current = enabled;

    const audio = audioRef.current;
    if (!enabled) {
      audio?.pause();
      return;
    }
    // First run: music is on by default, so there is nothing to react to.
    // The deferred loader owns the initial load — starting it here would
    // fetch the track during mount, which is exactly what we are avoiding.
    if (wasEnabled === enabled) return;
    if (!audio) {
      // Turned on before the track finished loading (or before the deferred
      // load started): fetch it now and let it play when it arrives.
      ensureAudioRef.current();
      return;
    }
    if (!suspendedRef.current) audio.play().catch(() => {});
  }, [enabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (suspended) {
      audio.pause();
    } else if (enabledRef.current) {
      audio.play().catch(() => {});
    }
  }, [suspended]);

  const toggle = () => setEnabled(v => !v);

  return { enabled, toggle };
}
