import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BridgeProvider } from "@/bridge/BridgeContext";
import { postToApp, sealBridge } from "@/bridge/cyanBridge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import GameScreen from "@/components/GameScreen";
import { LocaleProvider, useLocale } from "@/localization/LocaleContext";

const MOBILE_MAX_W = 430;
const MOBILE_ASPECT = 19.5 / 9;

function reportRenderError(error: Error) {
  postToApp({
    type: "game_error",
    data: { code: "render_error", message: `${error.name}: ${error.message}` },
  });
  sealBridge();
}

/** Everything below here has translations and knows its locale. */
function LocalizedApp() {
  const { locale } = useLocale();
  return (
    <BridgeProvider locale={locale}>
      <SafeAreaProvider>
        <ErrorBoundary onError={reportRenderError}>
          <GestureHandlerRootView style={styles.ltrRoot}>
            <GameScreen />
          </GestureHandlerRootView>
        </ErrorBoundary>
      </SafeAreaProvider>
    </BridgeProvider>
  );
}

export default function App() {
  const inner = (
    <LocaleProvider>
      <LocalizedApp />
    </LocaleProvider>
  );

  if (Platform.OS !== "web") return inner;

  return (
    <View style={styles.outer}>
      <View style={styles.phone}>{inner}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100vw" as any,
    height: "100dvh" as any,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#011627",
  },
  phone: {
    width: "100%" as any,
    maxWidth: MOBILE_MAX_W,
    height: "100%" as any,
    maxHeight: MOBILE_MAX_W * MOBILE_ASPECT,
    overflow: "hidden",
    backgroundColor: "#023e8a",
  },
  // The game world and its arrow navigation are physically left-to-right in
  // both languages; only text follows the translations file's `dir`.
  ltrRoot: { flex: 1 },
});
