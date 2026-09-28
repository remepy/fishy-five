import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet } from 'react-native';
import { useLocale } from '@/localization/LocaleContext';

const USE_NATIVE = Platform.OS !== 'web';

interface Props {
  x: number;
  y: number;
  onDone: () => void;
}

export function TryAgainText({ x, y, onDone }: Props) {
  const { translations: t, textStyle } = useLocale();
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: 1200,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE }),
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: USE_NATIVE, delay: 200 }),
      ]),
      Animated.spring(scale, {
        toValue: 1.2,
        friction: 4,
        useNativeDriver: USE_NATIVE,
      }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.Text
      style={[
        styles.text,
        textStyle,
        {
          left: x - 70,
          top: y - 30,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      {t.common.tryAgain}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    color: '#ff6b6b',
    fontSize: 26,
    fontWeight: '900',
    writingDirection: 'rtl',
    textAlign: 'center',
    width: 140,
    zIndex: 999,
  },
});
