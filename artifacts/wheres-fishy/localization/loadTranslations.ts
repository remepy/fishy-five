import { buildTranslations, TranslationsError } from './translations';

declare global {
  interface Window {
    /**
     * Set by the static-export bootstrap before it rewrites the history entry
     * to Expo Router's canonical route. It is the public object URL the page
     * was actually served from, which is the only reliable anchor for
     * page-relative fetches while the router is initialising.
     */
    __gamePageUrl?: string;
  }
}

/**
 * Resolves `translations.json` next to the page that is running, regardless of
 * whether the page URL is `.../he/index.html`, `.../he/` or `.../he`.
 *
 * The document <base> is deliberately not used: the static export points it
 * one directory up so shared assets resolve, which is exactly the wrong
 * anchor for a per-language file.
 */
export function translationsUrl(): string {
  const pageHref =
    typeof window !== 'undefined' && window.__gamePageUrl
      ? window.__gamePageUrl
      : window.location.href;
  const page = new URL(pageHref);
  let dir = page.pathname.replace(/\/index\.html$/i, '/');
  if (!dir.endsWith('/')) dir += '/';
  return new URL(`${dir}translations.json`, page.origin).href;
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
