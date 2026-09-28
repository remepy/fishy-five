import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { useGame } from '@/context/GameContext';

interface Bubble {
  id: string;
  x: number;
  startY: number;
  size: number;
  baseOpacity: number;
  riseFraction: number;
  anim: Animated.Value;
}

interface Props {
  canvasW: number;
  canvasH: number;
  minInitialDelay?: number;
  maxInitialDelay?: number;
}

export function AmbientBubbles(props: Props) {
  const { reducedMotion } = useGame();
  if (reducedMotion) return null;
  return <AmbientBubblesInner {...props} />;
}

function AmbientBubblesInner({ canvasW, canvasH, minInitialDelay = 0, maxInitialDelay = 2000 }: Props) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const nextId = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDelay = useRef(minInitialDelay + Math.random() * (maxInitialDelay - minInitialDelay)).current;

  useEffect(() => {
    function spawnBurst() {
      const count = 1 + Math.floor(Math.random() * 3);
      const centerX = 10 + Math.random() * 80;

      for (let i = 0; i < count; i++) {
        const anim = new Animated.Value(0);
        const id = `amb_${nextId.current++}`;
        const duration = 3500 + Math.random() * 3000;

        const bubble: Bubble = {
          id,
          x: centerX + (Math.random() - 0.5) * 8,
          startY: 75 + Math.random() * 20,
          size: 6 + Math.random() * 14,
          baseOpacity: 0.18 + Math.random() * 0.28,
          riseFraction: 0.35 + Math.random() * 0.25,
          anim,
        };

        setBubbles(prev => [...prev, bubble]);

        const startDelay = i * (150 + Math.random() * 200);
        setTimeout(() => {
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: Platform.OS !== 'web',
          }).start(() => {
            setBubbles(prev => prev.filter(b => b.id !== id));
          });
        }, startDelay);
      }

      const nextDelay = 5000 + Math.random() * 10000;
      timeoutRef.current = setTimeout(spawnBurst, nextDelay);
    }

    timeoutRef.current = setTimeout(spawnBurst, initialDelay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [initialDelay]);

  return (
    <>
      {bubbles.map(bubble => {
        const x = (bubble.x / 100) * canvasW;
        const y = (bubble.startY / 100) * canvasH;
        const rise = canvasH * bubble.riseFraction;

        const translateY = bubble.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -rise],
        });
        const opacity = bubble.anim.interpolate({
          inputRange: [0, 0.15, 0.75, 1],
          outputRange: [0, bubble.baseOpacity, bubble.baseOpacity, 0],
        });
        const scale = bubble.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.7, 1, 1.15],
        });

        return (
          <Animated.View
            key={bubble.id}
            style={[
              styles.bubble,
              {
                left: x - bubble.size / 2,
                top: y - bubble.size / 2,
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                opacity,
                transform: Platform.OS === 'web'
                  ? [{ translateY: translateY as any }, { scale: scale as any }]
                  : [{ translateY }, { scale }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(160, 210, 255, 0.9)',
  },
});
