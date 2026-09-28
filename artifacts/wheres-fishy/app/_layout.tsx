import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BridgeProvider } from "@/bridge/BridgeContext";
import { postToApp, sealBridge } from "@/bridge/cyanBridge";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LocaleProvider, useLocale } from "@/localization/LocaleContext";

SplashScreen.preventAutoHideAsync();

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
  const { locale, translations } = useLocale();
  return (
    <BridgeProvider locale={locale}>
      <SafeAreaProvider>
        <ErrorBoundary onError={reportRenderError}>
          <GestureHandlerRootView style={mobileStyles.ltrRoot}>
            <Stack screenOptions={{ headerShown: false, title: translations.app.title }} />
          </GestureHandlerRootView>
        </ErrorBoundary>
      </SafeAreaProvider>
    </BridgeProvider>
  );
}

export default function RootLayout() {
  const pathname = usePathname();
  // The app renders entirely in the platform's system font: nothing sets a
  // fontFamily. Loading a webfont here would cost ~686 KB per session and
  // delay first paint behind it without changing a single glyph.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  // The root route is a development redirect to /en and has no
  // translations.json of its own; render it without waiting for copy.
  if (pathname === "/") {
    return <Stack screenOptions={{ headerShown: false }} />;
  }

  const inner = (
    <LocaleProvider>
      <LocalizedApp />
    </LocaleProvider>
  );

  if (Platform.OS !== "web") return inner;

  return (
    <View style={mobileStyles.outer}>
      <View style={mobileStyles.phone}>{inner}</View>
    </View>
  );
}

const mobileStyles = StyleSheet.create({
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
  ltrRoot: {
    flex: 1,
  },
});
