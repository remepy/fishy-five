import { Asset } from 'expo-asset';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const BUBBLE_SFX = require('../assets/sounds/bubble-pop.mp3');

/**
 * Loads the bubble-pop sound once and returns a `play()` function.
 * Each call to play() clones the audio element so overlapping pops
 * work correctly when the user taps multiple fish in quick succession.
 * Web-only — no-ops silently on native.
 */
export function useBubbleSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let cancelled = false;

    async function init() {
      const asset = Asset.fromModule(BUBBLE_SFX);
      await asset.downloadAsync();
      if (cancelled) return;

      const audio = new Audio(asset.uri);
      audio.volume = 0.7;
      audioRef.current = audio;
    }

    init();

    return () => {
      cancelled = true;
      if (audioRef.current) {
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  function play() {
    if (Platform.OS !== 'web' || !audioRef.current) return;
    const clone = audioRef.current.cloneNode() as HTMLAudioElement;
    clone.volume = 0.7;
    clone.play().catch(() => {});
  }

  return { play };
}
