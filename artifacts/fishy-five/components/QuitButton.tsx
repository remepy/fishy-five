import React, { useState } from 'react';
import Feather from '@expo/vector-icons/Feather';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useBridge } from '@/bridge/BridgeContext';
import { useColors } from '@/hooks/useColors';
import { useLocale } from '@/localization/LocaleContext';

/**
 * The always-visible quit button (BR-07). The host draws no chrome around
 * the page, so this is the participant's only way out. A confirmation step
 * guards against the accidental taps a tremor produces near the screen edge.
 */
export default function QuitButton() {
  const colors = useColors();
  const { requestExit } = useBridge();
  const { translations: t, textStyle } = useLocale();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.btn}
        onPress={() => setConfirming(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t.quit.label}
        testID="quit-button"
      >
        <Feather name="x" size={26} color={colors.cardForeground} />
      </TouchableOpacity>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={[styles.title, textStyle]}>{t.quit.confirmTitle}</Text>
            <Text style={[styles.body, textStyle]}>{t.quit.confirmBody}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setConfirming(false)}
              accessibilityRole="button"
              accessibilityLabel={t.quit.confirmNo}
              testID="quit-cancel"
            >
              <Text style={[styles.primaryBtnText, textStyle]}>{t.quit.confirmNo}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                setConfirming(false);
                requestExit();
              }}
              accessibilityRole="button"
              accessibilityLabel={t.quit.confirmYes}
              testID="quit-confirm"
            >
              <Text style={[styles.secondaryBtnText, textStyle]}>{t.quit.confirmYes}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    top: 10,
    left: 10,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 60, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#023e8a',
    borderRadius: 20,
    padding: 28,
    width: 300,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 200, 255, 0.5)',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#caf0f8',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#90e0ef',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#00b4d8',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#90e0ef',
    fontSize: 16,
    fontWeight: '600',
  },
});
