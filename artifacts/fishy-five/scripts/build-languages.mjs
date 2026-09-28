import { spawnSync } from "node:child_process";
import { readFile, writeFile, rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { GAME_ID, LANGUAGES } from "./game.mjs";

/**
 * One self-contained export per language (spec §4.1).
 *
 * Each build is compiled with its own base URL, so every asset and
 * ./translations.json resolve relative to that page — no shared asset
 * directory, no <base> rewrite, no history juggling. The language is fixed
 * at build time; the game never reads it from the URL.
 */
const root = path.resolve(import.meta.dirname, "..");
const outRoot = path.join(root, "dist", "languages");

await rm(outRoot, { recursive: true, force: true });

for (const { lang, locale, dir } of LANGUAGES) {
  const base = `/games/${GAME_ID}/${lang}/`;
  const output = path.join(outRoot, lang);
  await mkdir(output, { recursive: true });

  const result = spawnSync(
    "pnpm",
    ["exec", "expo", "export", "--platform", "web", "--output-dir", output, "--clear"],
    {
      cwd: root,
      env: { ...process.env, EXPO_BASE_URL: base, EXPO_PUBLIC_GAME_LANGUAGE: lang },
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);

  // This build's copy, and only this build's copy, ships beside its page.
  const strings = JSON.parse(
    await readFile(path.join(root, "translations", `${lang}.json`), "utf8"),
  );
  if (strings.locale !== locale || strings.dir !== dir) {
    throw new Error(`Invalid language metadata in translations/${lang}.json`);
  }
  await writeFile(
    path.join(output, "translations.json"),
    JSON.stringify(strings, null, 2) + "\n",
  );

  // The shell is language-agnostic; stamp the document language for screen
  // readers. Text direction is applied per element from `dir`, never here.
  const page = path.join(output, "index.html");
  const html = await readFile(page, "utf8");
  if (!html.includes('<html lang="en" dir="ltr">')) {
    throw new Error(`Unexpected html element in ${lang}/index.html`);
  }
  await writeFile(page, html.replace('<html lang="en" dir="ltr">', `<html lang="${lang}" dir="ltr">`));

  console.log(`Built ${lang}: ${output} → ${base}`);
}
