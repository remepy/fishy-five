import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, View } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';

interface BubbleProps {
  x: number;
  onDone: () => void;
}

function Bubble({ x, onDone }: BubbleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const xWobble = useRef(new Animated.Value(0)).current;

  const size = 8 + Math.random() * 14;
  const offsetX = (Math.random() - 0.5) * 40;

  useEffect(() => {
    const dur = 1200 + Math.random() * 600;
    const screenH = Dimensions.get('window').height;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -(screenH * 0.7),
        duration: dur,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: dur * 0.5,
        useNativeDriver: USE_NATIVE,
        delay: dur * 0.5,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.sequence([
        Animated.timing(xWobble, { toValue: 12, duration: 300, useNativeDriver: USE_NATIVE }),
        Animated.timing(xWobble, { toValue: -12, duration: 300, useNativeDriver: USE_NATIVE }),
        Animated.timing(xWobble, { toValue: 8, duration: 300, useNativeDriver: USE_NATIVE }),
        Animated.timing(xWobble, { toValue: 0, duration: 300, useNativeDriver: USE_NATIVE }),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: x + offsetX,
          transform: [{ translateY }, { translateX: xWobble }, { scale }],
          opacity,
        },
      ]}
    />
  );
}

interface Props {
  x: number;
  y: number;
  count?: number;
  onComplete?: () => void;
}

export function BubbleAnimation({ x, y, count = 6, onComplete }: Props) {
  const completedRef = useRef(0);

  const handleBubbleDone = () => {
    completedRef.current += 1;
    if (completedRef.current >= count && onComplete) {
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { left: x - 30, top: y - 20, pointerEvents: 'none' }]}>
      {Array.from({ length: count }).map((_, i) => (
        <Bubble key={i} x={Math.random() * 60} onDone={handleBubbleDone} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 60,
    height: 20,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    backgroundColor: 'rgba(200, 230, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
});
