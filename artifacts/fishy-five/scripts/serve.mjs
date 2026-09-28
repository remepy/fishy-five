/**
 * Serves the built language bundles the way S3 and CloudFront do, for QA.
 *
 *   node scripts/serve.mjs            # port 4173
 *   node scripts/serve.mjs 8080
 *
 * Open:
 *   http://localhost:4173/games/fine-line/he/index.html            standalone
 *   http://localhost:4173/games/fine-line/he/index.html?bridge=1   as the app
 *
 * With ?bridge=1 a stand-in for the Flutter host is injected: it answers
 * game_ready with a session_start and prints every message the game posts,
 * both to the page (bottom-left panel) and to the browser console. Use it to
 * check the message order and the stats a real session would report.
 *
 * Query parameters (all optional, only with bridge=1):
 *   rounds=N          number of rounds, default 3
 *   levels=a,b,c      explicit level IDs, overrides rounds
 *   tutorial=0|1      value of tutorialSeen, default 1
 *   locale=he-IL      expectedLocale, defaults to this build's own locale
 *                     (set it to the other one to check BR-14)
 *   delay=MS          wait before sending session_start, default 50.
 *                     Use delay=6000 to check the five-second timeout.
 *   reducedMotion=1   sets reducedMotion
 *
 * Deliberately no clean-URL rewriting: a redirect from /he/index.html to /he/
 * would break the relative ./translations.json fetch, which is exactly the
 * bug this script exists to avoid reproducing.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { GAME_ID, LANGUAGES, STANDALONE_ROUNDS } from "./game.mjs";

const root = path.resolve(import.meta.dirname, "..", "dist", "languages");
const port = Number(process.argv[2] ?? 4173);
const prefix = `/games/${GAME_ID}/`;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

/** The host stand-in, injected into index.html when ?bridge=1 is present. */
function hostScript(options) {
  return `<script>
(function () {
  var o = ${JSON.stringify(options)};
  var log = [];
  function paint() {
    var el = document.getElementById("__bridge_log");
    if (!el) {
      el = document.createElement("pre");
      el.id = "__bridge_log";
      el.style.cssText = "position:fixed;left:0;bottom:0;z-index:2147483647;margin:0;" +
        "max-height:45vh;max-width:min(560px,100vw);overflow:auto;background:rgba(0,0,0,.82);" +
        "color:#9ae6b4;font:11px/1.45 ui-monospace,Menlo,monospace;padding:8px 10px;" +
        "direction:ltr;text-align:left;white-space:pre-wrap;pointer-events:auto";
      document.body.appendChild(el);
    }
    el.textContent = log.join("\\n");
  }
  function note(line) {
    log.push(line);
    console.log("[host] " + line);
    if (document.body) paint(); else addEventListener("DOMContentLoaded", paint);
  }
  window.CyanGameBridge = {
    postMessage: function (raw) {
      note("← " + raw);
      var m;
      try { m = JSON.parse(raw); } catch (e) { return; }
      if (m.type !== "game_ready") return;
      var data = {
        protocolVersion: 1,
        sessionId: "qa-" + Date.now(),
        expectedLocale: o.locale || m.data.locale,
        levelIds: o.levelIds,
        reducedMotion: o.reducedMotion,
        tutorialSeen: o.tutorialSeen
      };
      setTimeout(function () {
        note("→ session_start " + JSON.stringify(data));
        if (!window.cyanBridge) return note("!! window.cyanBridge is not defined");
        window.cyanBridge.receive({ type: "session_start", data: data });
      }, o.delay);
    }
  };
  // Drive pause/resume/abort by hand from the console:
  //   __host.send("pause")  __host.send("resume")  __host.send("abort", {reason: "call"})
  window.__host = {
    send: function (type, data) {
      note("→ " + type + (data ? " " + JSON.stringify(data) : ""));
      window.cyanBridge.receive(data ? { type: type, data: data } : { type: type });
    }
  };
  note("host stand-in ready");
})();
</script>`;
}

function sessionOptions(url, lang) {
  const q = url.searchParams;
  const catalogueIds = (n) =>
    Array.from({ length: n }, (_, i) => `${GAME_ID}-${String(i + 1).padStart(3, "0")}`);
  const levels = q.get("levels");
  return {
    levelIds: levels
      ? levels.split(",").map((s) => s.trim()).filter(Boolean)
      : catalogueIds(Math.max(1, Number(q.get("rounds") ?? STANDALONE_ROUNDS))),
    tutorialSeen: q.get("tutorial") !== "0",
    reducedMotion: q.get("reducedMotion") === "1",
    locale: q.get("locale") ?? null,
    delay: Number(q.get("delay") ?? 50),
    lang,
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/" || pathname === "/index.html") {
    const links = LANGUAGES.flatMap(({ lang }) => [
      `<li><a href="${prefix}${lang}/index.html">${lang} — standalone</a></li>`,
      `<li><a href="${prefix}${lang}/index.html?bridge=1">${lang} — with the host stand-in</a></li>`,
    ]).join("");
    res.writeHead(200, { "Content-Type": TYPES[".html"] });
    res.end(`<!doctype html><meta charset="utf-8"><title>${GAME_ID} QA</title>
<style>body{font:16px/1.6 system-ui;margin:3rem auto;max-width:34rem}</style>
<h1>${GAME_ID}</h1><ul>${links}</ul>
<p>Add <code>?bridge=1&amp;rounds=3&amp;tutorial=0</code> and friends — see the header of
<code>scripts/serve.mjs</code> for every parameter.</p>`);
    return;
  }

  if (!pathname.startsWith(prefix)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Not found. Builds are served under ${prefix}<lang>/`);
    return;
  }

  const rest = pathname.slice(prefix.length);
  const lang = rest.split("/")[0];
  if (!LANGUAGES.some((l) => l.lang === lang)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Unknown language "${lang}".`);
    return;
  }

  const file = path.join(root, rest);
  if (!file.startsWith(root)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  let body;
  try {
    await stat(file);
    body = await readFile(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(
      `Not found: ${rest}\n\nBuild first:\n  pnpm --filter @workspace/${GAME_ID} build:languages\n`,
    );
    return;
  }

  const ext = path.extname(file);
  const isEntry = ext === ".html" || file.endsWith("translations.json") || file.endsWith("metadata.json");
  // Mirrors the deployed cache policy: copy and the entry page stay fresh,
  // content-hashed assets are immutable.
  const headers = {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": isEntry ? "no-cache" : "public, max-age=31536000, immutable",
  };

  if (ext === ".html" && url.searchParams.get("bridge") === "1") {
    const options = sessionOptions(url, lang);
    // Injected in <head>, before the module script, so the host exists by the
    // time the game looks for it — as the WebView guarantees in production.
    body = Buffer.from(
      body.toString("utf8").replace("</head>", `${hostScript(options)}\n</head>`),
      "utf8",
    );
    delete headers["Cache-Control"];
    headers["Cache-Control"] = "no-store";
  }

  res.writeHead(200, headers);
  res.end(body);
});

server.listen(port, () => {
  console.log(`\n  ${GAME_ID} QA server\n`);
  console.log(`  http://localhost:${port}/`);
  for (const { lang } of LANGUAGES) {
    console.log(`  http://localhost:${port}${prefix}${lang}/index.html`);
    console.log(`  http://localhost:${port}${prefix}${lang}/index.html?bridge=1`);
  }
  console.log("");
});
