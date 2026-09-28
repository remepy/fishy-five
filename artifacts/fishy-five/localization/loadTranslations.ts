import { buildTranslations, TranslationsError } from './translations';

/**
 * Resolves `translations.json` next to the page that is running.
 *
 * Each language is its own self-contained export served under its own prefix
 * (`/games/fishy-five/<lang>/`), so a plain page-relative URL is correct and
 * needs no <base> or history juggling.
 */
export function translationsUrl(): string {
  return new URL('./translations.json', window.location.href).href;
}

export async function loadTranslations() {
  let response: Response;
  try {
    response = await fetch(translationsUrl(), { cache: 'no-cache' });
  } catch (error) {
    throw new TranslationsError(
      `translations fetch failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!response.ok) {
    throw new TranslationsError(`translations fetch returned HTTP ${response.status}`);
  }
  let raw: unknown;
  try {
    raw = await response.json();
  } catch (error) {
    throw new TranslationsError(
      `translations parse failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return buildTranslations(raw);
}
