import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useLocale } from '@/localization/LocaleContext';

/**
 * Shown while the host has paused the game. Sits above everything and eats
 * every touch so the board cannot change while it is not being watched.
 */
export function PauseOverlay() {
  const { translations: t, textStyle } = useLocale();
  return (
    <View style={styles.cover} pointerEvents="auto" testID="pause-overlay">
      <Text style={[styles.pauseText, textStyle]}>{t.pause.title}</Text>
    </View>
  );
}

/**
 * Shown once the activity is over. Intentionally blank: the host closes the
 * page (or shows its own summary) at this point, and nothing the game could
 * say here should be read by a participant.
 */
export function EndedScreen() {
  return <View style={styles.ended} testID="ended-screen" />;
}

const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 10, 40, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  pauseText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#caf0f8',
    textAlign: 'center',
  },
  ended: {
    flex: 1,
    backgroundColor: '#023e8a',
  },
});
