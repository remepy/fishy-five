import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Image, Platform, StyleSheet, TouchableOpacity } from 'react-native';

import { FISH_LIST } from '@/constants/gameAssets';
import type { FishId, PlacedFish } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

const FISH_SIZE = 76;
const USE_NATIVE = Platform.OS !== 'web';

interface Props {
  placedFish: PlacedFish;
  x: number;
  y: number;
  isTarget: boolean;
  isFound: boolean;
  pulseTrigger: number;
  onTap: (instanceId: string, fishId: FishId, screenX: number, screenY: number) => void;
}

export function FishItem({ placedFish, x, y, isTarget, isFound, pulseTrigger, onTap }: Props) {
  const fishData = FISH_LIST.find(f => f.id === placedFish.fishId);
  const { translations: t } = useLocale();
  const bobAnim = useRef(new Animated.Value(0)).current;
  const wiggleAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevTriggerRef = useRef(pulseTrigger);

  useEffect(() => {
    const delay = Math.random() * 2000;
    const duration = 1800 + Math.random() * 800;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, {
          toValue: 1,
          duration,
          useNativeDriver: USE_NATIVE,
          delay,
        }),
        Animated.timing(bobAnim, {
          toValue: 0,
          duration,
          useNativeDriver: USE_NATIVE,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bobAnim]);

  useEffect(() => {
    if (pulseTrigger > 0 && pulseTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = pulseTrigger;
      scaleAnim.setValue(1);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 280, useNativeDriver: USE_NATIVE }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 200, useNativeDriver: USE_NATIVE }),
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 280, useNativeDriver: USE_NATIVE }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 200, useNativeDriver: USE_NATIVE }),
      ]).start();
    }
  }, [pulseTrigger, scaleAnim]);

  const handleTap = useCallback((e: any) => {
    if (isFound) return;
    const { pageX, pageY } = e.nativeEvent;
    onTap(placedFish.instanceId, placedFish.fishId, pageX, pageY);

    if (!isTarget) {
      Animated.sequence([
        Animated.timing(wiggleAnim, { toValue: 1, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(wiggleAnim, { toValue: -1, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(wiggleAnim, { toValue: 1, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(wiggleAnim, { toValue: -1, duration: 60, useNativeDriver: USE_NATIVE }),
        Animated.timing(wiggleAnim, { toValue: 0, duration: 60, useNativeDriver: USE_NATIVE }),
      ]).start();
    }
  }, [isFound, isTarget, onTap, placedFish, wiggleAnim]);

  if (!fishData) return null;

  const bobTranslate = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  const wiggleRotate = wiggleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.fishContainer, { left: x - FISH_SIZE / 2, top: y - FISH_SIZE / 2 }]}
      onPress={handleTap}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={fishData ? t.fish[fishData.id] : undefined}
      accessibilityState={{ disabled: isFound }}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: bobTranslate },
            { rotate: wiggleRotate },
            { scaleX: placedFish.flipped ? Animated.multiply(scaleAnim, -1) as any : scaleAnim },
            { scaleY: scaleAnim },
          ],
        }}
      >
        <Image
          source={fishData.image}
          style={[styles.fishImage, isFound && styles.fishGrey]}
          resizeMode="contain"
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fishContainer: {
    position: 'absolute',
    width: FISH_SIZE,
    height: FISH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fishImage: {
    width: FISH_SIZE,
    height: FISH_SIZE,
  },
  fishGrey: {
    opacity: 0.35,
  },
});
