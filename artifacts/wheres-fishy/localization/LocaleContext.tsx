import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

import { postToApp, sealBridge } from '@/bridge/cyanBridge';

import { loadTranslations } from './loadTranslations';
import type { TextDirection, Translations } from './translations';

export type { FishTranslationKey, Translations } from './translations';

export interface LocaleContextValue {
  /** The locale the translations file declares, e.g. `he-IL` or `en-US`. */
  locale: string;
  direction: TextDirection;
  isRTL: boolean;
  translations: Translations;
  textStyle: Pick<TextStyle, 'writingDirection'>;
  rowStyle: Pick<ViewStyle, 'flexDirection'>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; value: LocaleContextValue }
  | { status: 'failed' };

/**
 * Fetches `./translations.json` next to the page and provides the copy to the
 * tree. Locale and text direction come from that file only — never from the
 * URL and never from the device. Until it resolves, and if it fails, nothing
 * is rendered: a page with no copy must not show raw keys or an English
 * fallback to a participant. On failure the host is told via `game_error`.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    loadTranslations()
      .then(({ locale, dir, translations }) => {
        if (cancelled) return;
        const isRTL = dir === 'rtl';
        setState({
          status: 'ready',
          value: {
            locale,
            direction: dir,
            isRTL,
            translations,
            textStyle: { writingDirection: dir },
            rowStyle: { flexDirection: isRTL ? 'row-reverse' : 'row' },
          },
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[translations] ${message}`);
        postToApp({
          type: 'game_error',
          data: { code: 'translations_unavailable', message },
        });
        sealBridge();
        setState({ status: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => (state.status === 'ready' ? state.value : null),
    [state],
  );

  if (!value) return null;
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
