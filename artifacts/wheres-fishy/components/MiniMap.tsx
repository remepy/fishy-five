import React, { useCallback } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';

import { GRID_COLS, GRID_ROWS, QuadrantPos, useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

const MAP_W = 120;
const MAP_H = 80;
const CELL_W = MAP_W / GRID_COLS;
const CELL_H = MAP_H / GRID_ROWS;

export function MiniMap() {
  const { currentQuadrant, setCurrentQuadrant, bgImage } = useGame();
  const { translations: t } = useLocale();

  const handleCellPress = useCallback((col: number, row: number) => {
    setCurrentQuadrant({ col, row });
  }, [setCurrentQuadrant]);

  return (
    <View style={styles.container}>
      <View
        style={[styles.map, { width: MAP_W, height: MAP_H }]}
      >
        {/* Faint background preview matching the real aquarium */}
        <Image
          source={bgImage}
          style={styles.bgPreview}
          resizeMode="cover"
          fadeDuration={0}
        />
        {Array.from({ length: GRID_ROWS }).map((_, row) =>
          Array.from({ length: GRID_COLS }).map((_, col) => {
            const isActive =
              currentQuadrant.col === col && currentQuadrant.row === row;
            return (
              <TouchableOpacity
                key={`${col}_${row}`}
                activeOpacity={0.6}
                onPress={() => handleCellPress(col, row)}
                accessibilityRole="button"
                accessibilityLabel={t.buttons.minimapCell(col + 1, row + 1)}
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.cell,
                  isActive && styles.cellActive,
                  {
                    left: col * CELL_W,
                    top: row * CELL_H,
                    width: CELL_W,
                    height: CELL_H,
                  },
                ]}
              />
            );
          })
        )}
        {/* Highlight ring drawn on top so it's never clipped by cell borders */}
        <View
          style={[
            styles.viewport,
            {
              left: currentQuadrant.col * CELL_W,
              top: currentQuadrant.row * CELL_H,
              width: CELL_W,
              height: CELL_H,
            },
          ]}
          pointerEvents="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    backgroundColor: 'rgba(0, 30, 80, 0.85)',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(100, 200, 255, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  bgPreview: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 0.35,
  },
  cell: {
    position: 'absolute',
    borderWidth: 0.5,
    borderColor: 'rgba(100, 200, 255, 0.35)',
    backgroundColor: 'transparent',
  },
  cellActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.22)',
  },
  viewport: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#00d4ff',
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
});
