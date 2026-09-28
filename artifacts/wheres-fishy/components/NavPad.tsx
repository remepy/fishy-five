import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { GRID_COLS, GRID_ROWS, QuadrantPos, useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

export function NavPad() {
  const { translations: t } = useLocale();
  const {
    currentQuadrant,
    setCurrentQuadrant,
    showTutorial,
    tutorialStep,
    advanceTutorial,
  } = useGame();

  const move = useCallback((dc: number, dr: number) => {
    setCurrentQuadrant({
      col: Math.max(0, Math.min(GRID_COLS - 1, currentQuadrant.col + dc)),
      row: Math.max(0, Math.min(GRID_ROWS - 1, currentQuadrant.row + dr)),
    });
  }, [currentQuadrant, setCurrentQuadrant]);

  const canUp = currentQuadrant.row > 0;
  const canDown = currentQuadrant.row < GRID_ROWS - 1;
  const canLeft = currentQuadrant.col > 0;
  const canRight = currentQuadrant.col < GRID_COLS - 1;

  const handleLeft = useCallback(() => {
    move(-1, 0);
    if (showTutorial && tutorialStep === 1) {
      // Fade in step 3 immediately, concurrent with the slide animation.
      advanceTutorial();
    }
  }, [move, showTutorial, tutorialStep, advanceTutorial]);

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {/* Top row: up arrow centered over the middle slot */}
        <View style={styles.row}>
          <View style={styles.placeholder} />
          <NavBtn onPress={() => move(0, -1)} disabled={!canUp} icon="arrow-up" label={t.buttons.moveUp} />
          <View style={styles.placeholder} />
        </View>
        {/* Bottom row: left, down, right */}
        <View style={styles.row}>
          <NavBtn onPress={handleLeft} disabled={!canLeft} icon="arrow-left" label={t.buttons.moveLeft} />
          <NavBtn onPress={() => move(0, 1)} disabled={!canDown} icon="arrow-down" label={t.buttons.moveDown} />
          <NavBtn onPress={() => move(1, 0)} disabled={!canRight} icon="arrow-right" label={t.buttons.moveRight} />
        </View>
      </View>
    </View>
  );
}

interface NavBtnProps {
  onPress: () => void;
  disabled: boolean;
  icon: 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right';
  label: string;
}

function NavBtn({ onPress, disabled, icon, label }: NavBtnProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
    >
      <Feather name={icon} size={26} color={disabled ? 'rgba(255,255,255,0.25)' : '#ffffff'} />
    </TouchableOpacity>
  );
}

const BTN_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    backgroundColor: 'rgba(0, 100, 200, 0.85)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(100, 200, 255, 0.5)',
  },
  btnDisabled: {
    backgroundColor: 'rgba(0, 50, 100, 0.4)',
    borderColor: 'rgba(100, 200, 255, 0.15)',
  },
  placeholder: {
    width: BTN_SIZE,
    height: BTN_SIZE,
  },
});
