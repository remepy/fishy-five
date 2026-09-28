import React, { useCallback, useEffect, useRef, useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { FISH_LIST } from '@/constants/gameAssets';
import { useGame } from '@/context/GameContext';
import { useLocale } from '@/localization/LocaleContext';

const USE_NATIVE = Platform.OS !== 'web';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Props {
  goalRect: Rect | null;
  navRect: Rect | null;
  onRemeasure?: () => void;
}

const MASK_COLOR = 'rgba(0, 8, 30, 0.78)';
const STEP3_MASK_COLOR = 'rgba(0, 8, 30, 0.65)';

// NavPad grid is 3 cols x 2 rows of 56px buttons with 4px gaps.
// The down arrow sits in the bottom row, middle column. Within the
// navWrap (which sizes to its content), the down arrow's local rect is:
const NAV_BTN = 56;
const NAV_GAP = 4;
const LEFT_ARROW_OFFSET_X = 0;
const LEFT_ARROW_OFFSET_Y = NAV_BTN + NAV_GAP; // 60 (bottom row)

export function Tutorial({ goalRect, navRect, onRemeasure }: Props) {
  const { translations: t, textStyle } = useLocale();
  const {
    showTutorial,
    showLevelStart,
    targets,
    dismissTutorial,
    tutorialStep,
    advanceTutorial,
    goBackTutorial,
    currentQuadrant,
    setCurrentQuadrant,
    dontShowTutorialAgain,
    setDontShowTutorialAgain,
  } = useGame();

  const active = showTutorial && !showLevelStart;
  useEffect(() => {
    if (!active || !onRemeasure) return;
    let raf = 0;
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      onRemeasure();
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [active, onRemeasure]);

  // Measured height (callout + arrow) for the step-2 textbox so we can
  // anchor it to the bottom of the gameboard precisely.
  const [step2WrapHeight, setStep2WrapHeight] = useState(0);

  // Step-3 fade-in animation
  const step3Opacity = useRef(new Animated.Value(0)).current;

  // When the user finishes the tutorial we slide the board back to the
  // center-bottom quadrant in the background while step 3 fades out over
  // 1000ms, then actually dismiss the overlay.
  const handleFinishTutorial = useCallback(() => {
    setCurrentQuadrant({ col: 1, row: 1 });
    Animated.timing(step3Opacity, {
      toValue: 0,
      duration: 1000,
      easing: Easing.in(Easing.ease),
      useNativeDriver: USE_NATIVE,
    }).start(() => dismissTutorial());
  }, [setCurrentQuadrant, dismissTutorial, step3Opacity]);
  useEffect(() => {
    if (tutorialStep === 2) {
      step3Opacity.setValue(0);
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(step3Opacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE,
        }),
      ]).start();
    } else {
      step3Opacity.setValue(0);
    }
  }, [tutorialStep, step3Opacity]);

  // Step 1 textbox fades in when the step becomes active AND its anchor
  // (goalRect) has been measured — otherwise the fade would run while the
  // view is unmounted and the textbox would appear to blink in.
  const step1Opacity = useRef(new Animated.Value(0)).current;
  const step1Ready = tutorialStep === 0 && goalRect != null;
  useEffect(() => {
    step1Opacity.stopAnimation();
    if (step1Ready) {
      step1Opacity.setValue(0);
      Animated.timing(step1Opacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: USE_NATIVE,
      }).start();
    } else {
      step1Opacity.setValue(0);
    }
  }, [step1Ready, step1Opacity]);

  // Step 2 textbox fades in on entry, and fades out immediately when the
  // user clicks the left arrow (detected via currentQuadrant moving off
  // the middle column while still on tutorialStep === 1).
  const step2Opacity = useRef(new Animated.Value(0)).current;
  const leftClickedInStep2 =
    tutorialStep === 1 && currentQuadrant.col !== 1;
  useEffect(() => {
    step2Opacity.stopAnimation();
    if (tutorialStep !== 1) {
      step2Opacity.setValue(0);
      return;
    }
    if (leftClickedInStep2) {
      Animated.timing(step2Opacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: USE_NATIVE,
      }).start();
    } else {
      step2Opacity.setValue(0);
      Animated.timing(step2Opacity, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.ease),
        useNativeDriver: USE_NATIVE,
      }).start();
    }
  }, [tutorialStep, leftClickedInStep2, step2Opacity]);

  // Restart the pulse loop from zero whenever we (re-)enter step 2 so the
  // highlighted arrow starts pulsing from a clean small state — important
  // when the user steps back into step 2 from step 3.
  const pulseResetKey = tutorialStep === 1 ? currentQuadrant.col : -1;

  // Pulse animation for tap indicator + blinking down arrow
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: USE_NATIVE,
        }),
      ])
    );
    pulse.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseResetKey]);

  if (!showTutorial || showLevelStart) return null;

  const step = tutorialStep;
  const isStep1 = step === 0;
  const isStep2 = step === 1;
  const isStep3 = step === 2;

  const sampleFish =
    FISH_LIST.find(f => !targets.includes(f.id)) ?? FISH_LIST[0];

  // Compute left-arrow rect in screen coordinates from navRect.
  const leftArrow: Rect | null = navRect
    ? {
        x: navRect.x + LEFT_ARROW_OFFSET_X,
        y: navRect.y + LEFT_ARROW_OFFSET_Y,
        width: NAV_BTN,
        height: NAV_BTN,
      }
    : null;

  // Step 2 needs taps to pass through to the real left arrow under the
  // mask cutout. Steps 1 and 3 should fully block underlying gameplay.
  const rootPointerEvents = isStep2 ? 'box-none' : 'auto';

  return (
    <View style={styles.root} pointerEvents={rootPointerEvents}>
      {/* === Step 1: full mask with cutout for goal panel === */}
      {isStep1 && goalRect && (
        <>
          <CutoutMask rect={goalRect} padding={6} />
          <HighlightRing rect={goalRect} padding={6} />
          <Animated.View
            style={[
              styles.calloutWrap,
              {
                bottom: undefined,
                top: Math.max(80, goalRect.y - 230),
                left: 0,
                right: 0,
                opacity: step1Opacity,
              },
            ]}
          >
            <CalloutCard>
              <Text style={[styles.calloutText, textStyle]}>{t.tutorial.findFish}</Text>
              <View style={styles.btnRow}>
                <PrimaryBtn label={t.tutorial.understood} onPress={advanceTutorial} />
              </View>
            </CalloutCard>
            <CurvedArrow />
          </Animated.View>
        </>
      )}

      {/* === Step 2: mask only target bar + nav area, leave gameboard + minimap visible === */}
      {isStep2 && goalRect && navRect && leftArrow && (
        <Step2Mask
          goalRect={goalRect}
          navRect={navRect}
          arrowRect={leftArrow}
        />
      )}
      {isStep2 && leftArrow && (
        <Animated.View style={{ opacity: step2Opacity }} pointerEvents="none">
          <PulsingRing rect={leftArrow} pulse={pulse} />
        </Animated.View>
      )}
      {isStep2 && goalRect && (
        <Animated.View
          onLayout={e => setStep2WrapHeight(e.nativeEvent.layout.height)}
          style={[
            styles.calloutWrap,
            {
              left: 0,
              right: 0,
              opacity: step2Opacity,
              // Anchor wrap so its bottom sits 12px above the goal panel.
              // Until measured, render off-screen to avoid a flash.
              top:
                step2WrapHeight > 0
                  ? goalRect.y - step2WrapHeight - 12
                  : -9999,
            },
          ]}
        >
          <CalloutCard>
            <Text style={[styles.calloutText, textStyle]}>
              {t.tutorial.navigation}
            </Text>
            <ButtonRow onBack={goBackTutorial} />
          </CalloutCard>
          <DownArrow />
        </Animated.View>
      )}

      {/* === Step 3: full mask, sample fish + tap indicator === */}
      {isStep3 && (
        <Animated.View
          pointerEvents="none"
          style={[styles.fullMask, { opacity: step3Opacity }]}
        />
      )}
      {isStep3 && (
        <Animated.View
          style={[styles.step3Wrap, { opacity: step3Opacity }]}
          pointerEvents="box-none"
        >
          <View style={styles.step3FishWrap}>
            <Image
              source={sampleFish.image}
              style={styles.step3Fish}
              resizeMode="contain"
              accessible
              accessibilityLabel={t.fish[sampleFish.id]}
            />
            <TapIndicator pulse={pulse} />
          </View>
          <CalloutCard>
            <Text style={[styles.calloutText, textStyle]}>{t.tutorial.tapFish}</Text>
            <ButtonRow onBack={goBackTutorial}>
              <PrimaryBtn label={t.tutorial.start} onPress={handleFinishTutorial} />
            </ButtonRow>
            <SkipTutorialToggle
              value={dontShowTutorialAgain}
              onChange={setDontShowTutorialAgain}
            />
          </CalloutCard>
        </Animated.View>
      )}
    </View>
  );
}

// === Sub-components ===

function CutoutMask({ rect, padding }: { rect: Rect; padding: number }) {
  const x = rect.x - padding;
  const y = rect.y - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;
  return (
    <>
      <View pointerEvents="none" style={[styles.maskBlock, { top: 0, left: 0, right: 0, height: y }]} />
      <View pointerEvents="none" style={[styles.maskBlock, { top: y + h, left: 0, right: 0, bottom: 0 }]} />
      <View pointerEvents="none" style={[styles.maskBlock, { top: y, left: 0, width: x, height: h }]} />
      <View pointerEvents="none" style={[styles.maskBlock, { top: y, left: x + w, right: 0, height: h }]} />
    </>
  );
}

function Step2Mask({
  goalRect,
  navRect,
  arrowRect,
}: {
  goalRect: Rect;
  navRect: Rect;
  arrowRect: Rect;
}) {
  const ARROW_PAD = 8;
  // The bottom-bar mask starts a little to the left of the nav grid so that
  // the minimap (sitting to the left of the nav pad, with a 30px gap)
  // remains fully visible.
  const bottomBarLeft = Math.max(0, navRect.x - 15);
  const goalBottom = goalRect.y + goalRect.height;

  const arrowTop = arrowRect.y - ARROW_PAD;
  const arrowBottom = arrowRect.y + arrowRect.height + ARROW_PAD;
  const arrowLeft = arrowRect.x - ARROW_PAD;
  const arrowRight = arrowRect.x + arrowRect.width + ARROW_PAD;

  return (
    <>
      {/* Target bar (goal panel) — full-width strip */}
      <View
        pointerEvents="none"
        style={[
          styles.maskBlock,
          { top: goalRect.y, left: 0, right: 0, height: goalRect.height },
        ]}
      />
      {/* Bottom-bar: above the down-arrow cutout (also covers the up arrow row) */}
      <View
        pointerEvents="none"
        style={[
          styles.maskBlock,
          {
            top: goalBottom,
            left: bottomBarLeft,
            right: 0,
            height: Math.max(0, arrowTop - goalBottom),
          },
        ]}
      />
      {/* Left of the down arrow (covers the left arrow) */}
      <View
        pointerEvents="none"
        style={[
          styles.maskBlock,
          {
            top: arrowTop,
            left: bottomBarLeft,
            width: Math.max(0, arrowLeft - bottomBarLeft),
            height: arrowBottom - arrowTop,
          },
        ]}
      />
      {/* Right of the down arrow (covers the right arrow) */}
      <View
        pointerEvents="none"
        style={[
          styles.maskBlock,
          {
            top: arrowTop,
            left: arrowRight,
            right: 0,
            height: arrowBottom - arrowTop,
          },
        ]}
      />
      {/* Below the down arrow */}
      <View
        pointerEvents="none"
        style={[
          styles.maskBlock,
          {
            top: arrowBottom,
            left: bottomBarLeft,
            right: 0,
            bottom: 0,
          },
        ]}
      />
    </>
  );
}

function HighlightRing({ rect, padding }: { rect: Rect; padding: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: rect.x - padding,
        top: rect.y - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2,
        borderRadius: 14,
        borderWidth: 3,
        borderColor: '#00d4ff',
      }}
    />
  );
}

function PulsingRing({ rect, pulse }: { rect: Rect; pulse: Animated.Value }) {
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const PAD = 6;
  return (
    <>
      {/* Static inner highlight ring (always visible) */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: rect.x - PAD,
          top: rect.y - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 16,
          borderWidth: 3,
          borderColor: '#00d4ff',
        }}
      />
      {/* Outer pulsing ring */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: rect.x - PAD,
          top: rect.y - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderRadius: 16,
          borderWidth: 3,
          borderColor: '#00d4ff',
          opacity,
          transform: [{ scale }],
        }}
      />
    </>
  );
}

function DownArrow() {
  const stroke = '#00d4ff';
  return (
    <View style={styles.downArrowWrap} pointerEvents="none">
      <Svg width={32} height={48} viewBox="0 0 32 48">
        <Path
          d="M 16 4 L 16 38"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 6 30 L 16 44 L 26 30"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function SkipTutorialToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const { translations: t, rowStyle, textStyle } = useLocale();
  return (
    <TouchableOpacity
      style={[styles.skipToggle, rowStyle]}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityLabel={t.tutorial.dontShowAgain}
      accessibilityState={{ checked: value }}
    >
      <Feather
        name={value ? 'check-square' : 'square'}
        size={18}
        color="#caf0f8"
      />
      <Text style={[styles.skipToggleLabel, textStyle]}>{t.tutorial.dontShowAgain}</Text>
    </TouchableOpacity>
  );
}

function ButtonRow({
  children,
  onBack,
}: {
  children?: React.ReactNode;
  onBack: () => void;
}) {
  const { rowStyle } = useLocale();
  return (
    <View style={[styles.btnRowSplit, rowStyle]}>
      <TextBackBtn onPress={onBack} />
      <View style={styles.btnRowCenterSlot}>{children}</View>
    </View>
  );
}

function TextBackBtn({ onPress }: { onPress: () => void }) {
  const { translations: t, isRTL, rowStyle, textStyle } = useLocale();
  return (
    <TouchableOpacity
      style={[styles.textBackBtn, rowStyle]}
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={t.common.back}
    >
      <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} color="#caf0f8" />
      <Text style={[styles.textBackLabel, textStyle]}>{t.common.back}</Text>
    </TouchableOpacity>
  );
}

function CurvedArrow() {
  const stroke = '#00d4ff';
  return (
    <View style={styles.arrowWrap} pointerEvents="none">
      <Svg width={70} height={90} viewBox="0 0 70 90">
        <Path
          d="M 12 4 C 12 30, 58 36, 58 70"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 50 64 L 58 78 L 66 64"
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function CalloutCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.callout}>{children}</View>;
}

function PrimaryBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { textStyle } = useLocale();
  return (
    <TouchableOpacity style={styles.primaryBtn} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.primaryBtnText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const { textStyle } = useLocale();
  return (
    <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}>
      <Text style={[styles.secondaryBtnText, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TapIndicator({ pulse }: { pulse: Animated.Value }) {
  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] });
  return (
    <View style={styles.tapIndicator} pointerEvents="none">
      <Animated.View
        style={[
          styles.tapRing,
          { transform: [{ scale: ringScale }], opacity: ringOpacity },
        ]}
      />
      <View style={styles.tapDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  fullMask: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: STEP3_MASK_COLOR,
  },
  maskBlock: {
    position: 'absolute',
    backgroundColor: MASK_COLOR,
  },
  calloutWrap: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  arrowWrap: {
    marginTop: -4,
  },
  downArrowWrap: {
    marginTop: 4,
    alignItems: 'center',
  },
  textBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 4,
  },
  textBackLabel: {
    color: '#caf0f8',
    fontSize: 16,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  skipToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 6,
  },
  skipToggleLabel: {
    color: '#caf0f8',
    fontSize: 14,
    writingDirection: 'rtl',
  },
  callout: {
    backgroundColor: '#023e8a',
    borderWidth: 2,
    borderColor: 'rgba(100, 200, 255, 0.55)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    maxWidth: 360,
    width: '92%',
    alignItems: 'center',
  },
  calloutText: {
    color: '#caf0f8',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 14,
    lineHeight: 24,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  btnRowSplit: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  btnRowCenterSlot: {
    flex: 1,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#00b4d8',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 110,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(100, 200, 255, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#caf0f8',
    fontSize: 16,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
  step3Wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 28,
  },
  step3FishWrap: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step3Fish: {
    width: 130,
    height: 130,
  },
  tapIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: -10,
    bottom: -10,
  },
  tapRing: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#00d4ff',
  },
  tapDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00d4ff',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});
