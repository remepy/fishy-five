import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { FISH_LIST } from '@/constants/gameAssets';
import { useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

const USE_NATIVE = Platform.OS !== 'web';
const POPUP_FISH_SIZE = 100;

interface Props {
  topPad: number;
}

export function LevelStartPopup({ topPad }: Props) {
  const { targets, showLevelStart, startGame, placedFish } = useGame();
  const { translations: t, textStyle } = useLocale();

  const entryScale = useRef(targets.map(() => new Animated.Value(0))).current;
  const entryOpacity = useRef(targets.map(() => new Animated.Value(0))).current;
  const exitTranslateY = useRef(targets.map(() => new Animated.Value(0))).current;

  const chromeFade = useRef(new Animated.Value(1)).current;
  const backdropFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!showLevelStart) return;

    targets.forEach((_, i) => {
      entryScale[i].setValue(0);
      entryOpacity[i].setValue(0);
      exitTranslateY[i].setValue(0);
    });
    chromeFade.setValue(1);
    backdropFade.setValue(1);

    // Staggered entry — pop in one by one
    const staggered = targets.map((_, i) =>
      Animated.sequence([
        Animated.delay(i * 120),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(entryScale[i], {
              toValue: 1.2,
              duration: 280,
              useNativeDriver: USE_NATIVE,
            }),
            Animated.timing(entryScale[i], {
              toValue: 1,
              duration: 180,
              useNativeDriver: USE_NATIVE,
            }),
          ]),
          Animated.timing(entryOpacity[i], {
            toValue: 1,
            duration: 280,
            useNativeDriver: USE_NATIVE,
          }),
        ]),
      ])
    );

    Animated.parallel(staggered).start();
  }, [showLevelStart, targets]);

  const handleStart = useCallback(() => {
    // 1. Fade out title + button immediately
    Animated.timing(chromeFade, {
      toValue: 0,
      duration: 200,
      useNativeDriver: USE_NATIVE,
    }).start();

    // 2. Stagger fish downward + fade
    const sweepDown = targets.map((_, i) =>
      Animated.sequence([
        Animated.delay(i * 60),
        Animated.parallel([
          Animated.timing(exitTranslateY[i], {
            toValue: 320,
            duration: 420,
            useNativeDriver: USE_NATIVE,
          }),
          Animated.timing(entryOpacity[i], {
            toValue: 0,
            duration: 420,
            delay: 80,
            useNativeDriver: USE_NATIVE,
          }),
        ]),
      ])
    );

    Animated.sequence([
      Animated.delay(100),
      Animated.parallel(sweepDown),
    ]).start();

    // 3. Fade backdrop after the last fish exits, pause to let things
    // settle, then start the game.
    Animated.sequence([
      Animated.delay(100 + targets.length * 60 + 440),
      Animated.timing(backdropFade, {
        toValue: 0,
        duration: 200,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.delay(1000),
    ]).start(() => startGame());
  }, [targets, startGame, chromeFade, backdropFade, exitTranslateY, entryOpacity]);

  if (!showLevelStart) return null;

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropFade }]}>
      <View style={styles.card}>
        <Animated.View style={[styles.chrome, { opacity: chromeFade }]}>
          <Text style={[styles.title, textStyle]}>{t.levelStart.title}</Text>
          <Text style={[styles.subtitle, textStyle]}>{t.levelStart.subtitle}</Text>
        </Animated.View>

        <View style={styles.row}>
          {targets.slice(0, 3).map((fishId, i) => {
            const fish = FISH_LIST.find(f => f.id === fishId);
            if (!fish) return null;
            const placed = placedFish.find(p => p.fishId === fishId);
            const flipped = placed?.flipped ?? false;
            return (
              <Animated.View
                key={fishId + '_' + i}
                style={{
                  width: POPUP_FISH_SIZE,
                  height: POPUP_FISH_SIZE,
                  transform: [
                    { scale: entryScale[i] },
                    { translateY: exitTranslateY[i] },
                  ],
                  opacity: entryOpacity[i],
                }}
              >
                <Image
                  source={fish.image}
                  style={[styles.fishImg, flipped && { transform: [{ scaleX: -1 }] }]}
                  resizeMode="contain"
                  accessible
                  accessibilityLabel={t.fish[fish.id]}
                />
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.row2}>
          {targets.slice(3).map((fishId, j) => {
            const i = j + 3;
            const fish = FISH_LIST.find(f => f.id === fishId);
            if (!fish) return null;
            const placed = placedFish.find(p => p.fishId === fishId);
            const flipped = placed?.flipped ?? false;
            return (
              <Animated.View
                key={fishId + '_' + i}
                style={{
                  width: POPUP_FISH_SIZE,
                  height: POPUP_FISH_SIZE,
                  transform: [
                    { scale: entryScale[i] },
                    { translateY: exitTranslateY[i] },
                  ],
                  opacity: entryOpacity[i],
                }}
              >
                <Image
                  source={fish.image}
                  style={[styles.fishImg, flipped && { transform: [{ scaleX: -1 }] }]}
                  resizeMode="contain"
                  accessible
                  accessibilityLabel={t.fish[fish.id]}
                />
              </Animated.View>
            );
          })}
        </View>

        <Animated.View style={[styles.chrome, { opacity: chromeFade }]}>
          <TouchableOpacity style={styles.ctaBtn} onPress={handleStart} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={t.levelStart.start}>
            <Text style={[styles.ctaText, textStyle]}>{t.levelStart.start}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 10, 40, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: '#023e8a',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    width: 340,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 200, 255, 0.45)',
    overflow: 'hidden',
  },
  chrome: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#caf0f8',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#90e0ef',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  row2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  fishImg: {
    width: POPUP_FISH_SIZE,
    height: POPUP_FISH_SIZE,
  },
  ctaBtn: {
    backgroundColor: '#00b4d8',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
});
