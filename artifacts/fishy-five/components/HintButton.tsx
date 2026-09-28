import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useLocale } from '@/localization/LocaleContext';

interface Props {
  onPress: () => void;
}

export default function HintButton({ onPress }: Props) {
  const colors = useColors();
  const { translations: t } = useLocale();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t.buttons.hint}
      testID="hint-button"
    >
      <Ionicons name="bulb-outline" size={26} color={colors.cardForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 10,
    right: 64,
    zIndex: 250,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,30,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});