const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const vm = require("vm");

const projectRoot = path.resolve(__dirname, "..");
const outputDir = path.resolve(
  projectRoot,
  process.env.WEB_EXPORT_DIR || path.join("static-build", "web"),
);
// One deployable directory per language, each carrying its own page and its
// own translations.json (the Cyan bridge URL layout: <gameId>/<lang>/index.html).
// The root index.html Expo also emits is a dev-only redirect and is not deployed.
const languages = {
  en: { entry: "en/index.html", route: "/en", htmlLang: "en" },
  he: { entry: "he/index.html", route: "/he", htmlLang: "he" },
};
const requiredEntries = Object.values(languages).map((l) => l.entry);
const routesByEntry = Object.fromEntries(
  Object.values(languages).map((l) => [l.entry, l.route]),
);
const htmlLangByEntry = Object.fromEntries(
  Object.values(languages).map((l) => [l.entry, l.htmlLang]),
);
const translationsByEntry = Object.fromEntries(
  Object.values(languages).map((l) => [l.entry, path.posix.join(path.posix.dirname(l.entry), "translations.json")]),
);

function readTranslations(entry) {
  const file = path.join(outputDir, translationsByEntry[entry]);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

function makePrefixPortable() {
  for (const entry of requiredEntries) {
    const file = path.join(outputDir, entry);
    if (!fs.existsSync(file)) continue;

    let html = fs.readFileSync(file, "utf8");
    const depth = entry.split("/").length - 1;
    const base = depth === 0 ? "./" : "../".repeat(depth);
    const routerPath = routesByEntry[entry];
    const routerBootstrap =
      `<script data-expo-prefix-route="${routerPath}">` +
      `(function(){var original=location.pathname+location.search+location.hash;` +
      // The app fetches ./translations.json relative to the page it was served
      // from; stash that URL before the history entry is rewritten below.
      `window.__gamePageUrl=location.href;` +
      `var base=document.querySelector("base");` +
      `if(base)base.href=new URL(base.getAttribute("href"),location.href).href;` +
      `var nativeReplace=history.replaceState.bind(history);` +
      `var canonical="${routerPath}";` +
      `nativeReplace(history.state,"",canonical+location.search+location.hash);` +
      `history.replaceState=function(state,title,url){` +
      `if(url!=null){var parsed=new URL(String(url),location.href);` +
      `if(parsed.pathname===canonical||parsed.pathname===canonical+"/"){nativeReplace(state,title,original);return}}` +
      `nativeReplace(state,title,url)};` +
      `addEventListener("load",function(){nativeReplace(history.state,"",original)},{once:true})})()` +
      `</script>`;

    // A relative base makes root-relative Expo assets portable when the whole
    // directory is copied below an arbitrary HTTPS hosting prefix. Expo Router
    // has no runtime basename, so briefly expose its canonical route while the
    // deferred app bundle initializes, then restore the public object URL.
    html = html.replace(
      /<head>/i,
      `<head><base href="${base}">${routerBootstrap}`,
    );
    html = html.replace(
      /(\b(?:src|href)=["'])\/(?!\/)/g,
      "$1",
    );
    // Document direction stays ltr on purpose: the game world is physically
    // left-to-right in both languages and text direction is applied per
    // element from the translations file's `dir`.
    html = html.replace(
      /<html\s+lang="en"\s+dir="ltr">/,
      `<html lang="${htmlLangByEntry[entry]}" dir="ltr">`,
    );
    const translations = readTranslations(entry);
    if (translations && translations.keys && typeof translations.keys["app.title"] === "string") {
      html = html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${translations.keys["app.title"]}</title>`,
      );
    }
    fs.writeFileSync(file, html);
  }

  // Metro emits web asset registry entries as origin-root paths. Turning
  // those into relative paths makes the document's <base> control them too.
  for (const file of walk(outputDir).filter((name) => name.endsWith(".js"))) {
    const source = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, source.replace(/(["'])\/assets\//g, "$1assets/"));
  }
}

function validate() {
  const failures = [];
  let checkedReferences = 0;
  for (const entry of requiredEntries) {
    const file = path.join(outputDir, entry);
    const depth = entry.split("/").length - 1;
    if (!fs.existsSync(file)) {
      failures.push(`missing ${entry}`);
      continue;
    }

    const html = fs.readFileSync(file, "utf8");
    if (!/<base href=["'](?:\.\/|\.\.\/)+["']>/i.test(html)) {
      failures.push(`${entry} has no relative base`);
    }
    const expectedRoute = routesByEntry[entry];
    if (!html.includes(`data-expo-prefix-route="${expectedRoute}"`)) {
      failures.push(`${entry} has no router prefix bootstrap for ${expectedRoute}`);
    }
    if (
      !html.includes(`var canonical="${expectedRoute}"`) ||
      !html.includes("history.replaceState=function") ||
      !html.includes('addEventListener("load"')
    ) {
      failures.push(`${entry} does not normalize, intercept, and restore its router URL`);
    }
    const translations = readTranslations(entry);
    if (!translations) {
      failures.push(`${translationsByEntry[entry]} is missing or not valid JSON`);
    } else {
      if (typeof translations.locale !== "string" || !translations.locale) {
        failures.push(`${translationsByEntry[entry]} has no locale`);
      }
      if (translations.dir !== "rtl" && translations.dir !== "ltr") {
        failures.push(`${translationsByEntry[entry]} has no valid dir`);
      }
      if (!translations.keys || typeof translations.keys !== "object") {
        failures.push(`${translationsByEntry[entry]} has no keys map`);
      } else if (!html.includes(`<title>${translations.keys["app.title"]}</title>`)) {
        failures.push(`${entry} title does not match its translations app.title`);
      }
    }
    if (!html.includes(`<html lang="${htmlLangByEntry[entry]}" dir="ltr">`)) {
      failures.push(`${entry} has incorrect html lang/dir`);
    }
    if (!html.includes("window.__gamePageUrl=location.href;")) {
      failures.push(`${entry} does not stash the page URL for translations`);
    }
    const bootstrap = html.match(
      /<script data-expo-prefix-route="[^"]+">([\s\S]*?)<\/script>/,
    );
    if (bootstrap) {
      const original = `/arbitrary/hosting/prefix/${entry}?embed=1#game`;
      const calls = [];
      let onLoad;
      const baseElement = {
        href: "",
        getAttribute(name) {
          return name === "href" ? (depth === 0 ? "./" : "../".repeat(depth)) : null;
        },
      };
      const location = {
        pathname: original.split(/[?#]/)[0],
        search: "?embed=1",
        hash: "#game",
        href: `https://cdn.example${original}`,
      };
      const windowObject = {};
      const history = {
        state: {},
        replaceState(_state, _title, url) {
          calls.push(url);
          const parsed = new URL(String(url), location.href);
          location.pathname = parsed.pathname;
          location.search = parsed.search;
          location.hash = parsed.hash;
          location.href = parsed.href;
        },
      };
      vm.runInNewContext(bootstrap[1], {
        URL,
        location,
        history,
        window: windowObject,
        document: {
          querySelector(selector) {
            return selector === "base" ? baseElement : null;
          },
        },
        addEventListener(type, listener) {
          if (type === "load") onLoad = listener;
        },
      });
      if (windowObject.__gamePageUrl !== `https://cdn.example${original}`) {
        failures.push(`${entry} stashed page URL ${windowObject.__gamePageUrl}`);
      }
      if (calls[0] !== `${expectedRoute}?embed=1#game`) {
        failures.push(`${entry} normalized prefixed URL to ${calls[0]}`);
      }
      if (!onLoad) {
        failures.push(`${entry} did not schedule public URL restoration`);
      } else {
        onLoad();
        if (calls[1] !== original) {
          failures.push(`${entry} restored prefixed URL to ${calls[1]}`);
        }
        history.replaceState({}, "", expectedRoute);
        if (calls[2] !== original || location.pathname !== original.split(/[?#]/)[0]) {
          failures.push(`${entry} allowed delayed canonical router rewrite`);
        }
      }
      const expectedBase = new URL(
        depth === 0 ? "./" : "../".repeat(depth),
        `https://cdn.example${original}`,
      ).href;
      if (baseElement.href !== expectedBase) {
        failures.push(`${entry} did not freeze asset base before route normalization`);
      }
    }
    for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)/g)) {
      const reference = match[1];
      if (reference.startsWith("/") && !reference.startsWith("//")) {
        failures.push(`${entry} has root-relative reference ${reference}`);
      }
      if (!/^(?:[a-z]+:|\/\/|#)/i.test(reference)) {
        checkedReferences += 1;
        const baseDirectory = path.resolve(path.dirname(file), depth === 0 ? "./" : "../".repeat(depth));
        const target = path.resolve(baseDirectory, reference.split(/[?#]/)[0]);
        if (!fs.existsSync(target)) {
          failures.push(`${entry} references missing ${reference}`);
        }
      }
    }
  }

  // Every language must ship the same key set: a key present in one file but
  // not another is a raw key on screen for that language's participants.
  const keySets = requiredEntries
    .map((entry) => ({ entry, translations: readTranslations(entry) }))
    .filter(({ translations }) => translations && translations.keys)
    .map(({ entry, translations }) => ({
      entry,
      keys: Object.keys(translations.keys).sort().join("\n"),
    }));
  for (const { entry, keys } of keySets.slice(1)) {
    if (keys !== keySets[0].keys) {
      failures.push(
        `${translationsByEntry[entry]} and ${translationsByEntry[keySets[0].entry]} declare different key sets`,
      );
    }
  }

  for (const file of walk(outputDir).filter((name) => name.endsWith(".js"))) {
    const source = fs.readFileSync(file, "utf8");
    if (/["']\/assets\//.test(source)) {
      failures.push(`${path.relative(outputDir, file)} has root-relative assets`);
    }
    for (const match of source.matchAll(/["'](assets\/[^"']+)["']/g)) {
      checkedReferences += 1;
      const reference = match[1].split(/[?#]/)[0];
      if (!fs.existsSync(path.join(outputDir, reference))) {
        failures.push(`${path.relative(outputDir, file)} references missing ${reference}`);
      }
    }
  }

  for (const extra of ["index.html", "_sitemap.html", "+not-found.html"]) {
    if (fs.existsSync(path.join(outputDir, extra))) {
      failures.push(`${extra} is not deployable and must not be in the export`);
    }
  }

  if (failures.length) {
    throw new Error(`Static export verification failed:\n- ${failures.join("\n- ")}`);
  }
  console.log(
    `Verified ${requiredEntries.length} entries and ${checkedReferences} static references at ${outputDir}`,
  );
}

function exportWeb() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(outputDir), { recursive: true });

  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "expo",
      "export",
      "--platform",
      "web",
      "--output-dir",
      outputDir,
    ],
    {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`expo export exited with code ${result.status}`);
  }

  // Expo also emits pages that have no place in the upload: the dev-only root
  // redirect, the sitemap and the not-found page. Remove them so the output
  // directory is exactly what gets deployed.
  for (const extra of ["index.html", "_sitemap.html", "+not-found.html"]) {
    fs.rmSync(path.join(outputDir, extra), { force: true });
  }

  makePrefixPortable();
}

try {
  if (!process.argv.includes("--validate-only")) exportWeb();
  validate();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}