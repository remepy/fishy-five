import React from 'react';
import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

export default function HelpButton() {
  const colors = useColors();
  const { relaunchTutorial } = useGame();
  const { translations: t } = useLocale();

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={relaunchTutorial}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={t.buttons.help}
      testID="help-button"
    >
      <Feather name="help-circle" size={25} color={colors.cardForeground} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 10,
    right: 10,
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