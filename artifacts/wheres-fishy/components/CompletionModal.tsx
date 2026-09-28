import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useBridge } from '@/bridge/BridgeContext';
import { useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

/**
 * Success screen shown after a round. Between rounds it offers the next
 * round; after the final round of a standalone session it offers a fresh
 * session. In a hosted session the final round never reaches this screen:
 * the host receives `game_finished` and shows its own summary.
 */
export function CompletionModal() {
  const { showComplete, continueAfterRound, isLastRound } = useGame();
  const { requestExit } = useBridge();
  const { translations: t, textStyle } = useLocale();

  const primaryLabel = isLastRound ? t.completion.playAgain : t.completion.nextRound;

  return (
    <Modal visible={showComplete} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, textStyle]}>{t.completion.title}</Text>
          <View style={styles.starRow}>
            {[0, 1, 2].map(i => (
              <Ionicons key={i} name="star" size={32} color="#fbbf24" style={styles.star} />
            ))}
          </View>
          <Text style={[styles.subtitle, textStyle]}>{t.completion.subtitle}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={continueAfterRound}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
            testID="completion-continue"
          >
            <Text style={[styles.primaryBtnText, textStyle]}>{primaryLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={requestExit}
            accessibilityRole="button"
            accessibilityLabel={t.completion.exit}
            testID="completion-exit"
          >
            <Text style={[styles.secondaryBtnText, textStyle]}>{t.completion.exit}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 20, 60, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#023e8a',
    borderRadius: 20,
    padding: 32,
    width: 300,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(100, 200, 255, 0.5)',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#caf0f8',
    textAlign: 'center',
    marginBottom: 12,
  },
  starRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 4,
  },
  star: {
    marginHorizontal: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#90e0ef',
    textAlign: 'center',
    marginBottom: 28,
  },
  primaryBtn: {
    backgroundColor: '#00b4d8',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 20,
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
