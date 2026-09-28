import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { FISH_LIST } from '@/constants/gameAssets';
import { useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

export function GoalPanel() {
  const { targets, foundTargets, placedFish } = useGame();
  const { translations: t, textStyle } = useLocale();

  return (
    <View style={styles.panel}>
      {targets.map(fishId => {
        const fish = FISH_LIST.find(f => f.id === fishId);
        const placed = placedFish.find(p => p.fishId === fishId);
        const isFound = foundTargets.has(fishId);
        if (!fish) return null;
        const flipped = placed?.flipped ?? false;
        return (
          <View
            key={fishId}
            style={styles.goalItem}
            accessible
            accessibilityLabel={t.goals.fishAccessibility(t.fish[fish.id], isFound)}
          >
            <Image
              source={fish.image}
              style={[
                styles.goalImg,
                isFound && styles.foundImg,
                flipped && { transform: [{ scaleX: -1 }] },
              ]}
              resizeMode="contain"
            />
            {isFound && (
              <View style={styles.checkBadge}>
                <View style={styles.checkMark} />
              </View>
            )}
          </View>
        );
      })}
       <Text style={[styles.title, textStyle]}>{t.goals.title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    backgroundColor: 'rgba(0, 50, 120, 0.85)',
    borderTopWidth: 1.5,
    borderColor: 'rgba(100, 200, 255, 0.4)',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 4,
  },
  title: {
    color: '#caf0f8',
    fontSize: 13,
    fontWeight: '700',
    writingDirection: 'rtl',
    marginHorizontal: 4,
  },
  goalItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 80,
  },
  goalImg: {
    width: '100%' as any,
    height: 76,
  },
  foundImg: {
    opacity: 0.3,
  },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    width: 10,
    height: 6,
    borderLeftWidth: 2.5,
    borderBottomWidth: 2.5,
    borderColor: '#ffffff',
    transform: [{ rotate: '-45deg' }, { translateY: -1 }],
  },
});
