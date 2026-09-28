import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useLocale } from '@/localization/LocaleContext';

interface Props {
  enabled: boolean;
  onToggle: () => void;
}

export default function MusicButton({ enabled, onToggle }: Props) {
  const colors = useColors();
  const { translations: t } = useLocale();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onToggle}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={enabled ? t.buttons.musicOn : t.buttons.musicOff}
      accessibilityState={{ checked: enabled }}
      testID="music-button"
    >
      <View style={[styles.iconWrap, enabled ? null : styles.iconMuted]}>
        <Ionicons name="musical-notes-outline" size={26} color={colors.cardForeground} />
        {!enabled && (
          <View style={[styles.slash, { backgroundColor: colors.cardForeground }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 10,
    left: 64,
    zIndex: 200,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  iconWrap: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconMuted: {
    opacity: 0.55,
  },
  slash: {
    position: 'absolute',
    width: 30,
    height: 2,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }],
  },
});
