import { registerRootComponent } from "expo";

import App from "./App";

// A single-screen game needs no router: the language is fixed at build time
// (one export per language, see scripts/build-languages.mjs), not chosen by
// a route.
registerRootComponent(App);
