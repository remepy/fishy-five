import { Redirect } from "expo-router";

/**
 * Development convenience only. Deployed URLs always point at a language
 * directory (`en/index.html`, `he/index.html`), each of which carries its own
 * `translations.json`; the root has no copy of its own to load.
 */
export default function Index() {
  return <Redirect href="/en" />;
}
