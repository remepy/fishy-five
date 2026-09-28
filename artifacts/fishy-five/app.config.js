const base = require("./app.json");

/**
 * The base URL is per-language: each export is served from
 * /games/<gameId>/<lang>/, so every asset and the bundle must resolve under
 * that prefix. scripts/build-languages.mjs sets EXPO_BASE_URL per build.
 */
module.exports = () => ({
  ...base.expo,
  experiments: {
    ...base.expo.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? "",
  },
});
