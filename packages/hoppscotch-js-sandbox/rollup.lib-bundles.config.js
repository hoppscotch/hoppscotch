/**
 * Rollup config for building third-party library IIFE bundles.
 * These bundles are injected into the QuickJS VM at runtime via evalCode().
 * Each bundle sets a global on globalThis (e.g. globalThis._ for lodash).
 *
 * Run: pnpm run build:lib-bundles
 * Output: src/lib-bundles/ (committed to repo, imported via ?raw in Vite)
 */

import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import json from "@rollup/plugin-json"
import terser from "@rollup/plugin-terser"

const production = process.env.NODE_ENV === "production"

/** Standard plugins used for all bundles */
const plugins = [
  json(),
  resolve({ browser: true, preferBuiltins: false }),
  commonjs({ transformMixedEsModules: true }),
  ...(production ? [terser({ format: { comments: false } })] : []),
]

// Note: We use ajv@6 (aliased as 'ajv6') instead of ajv@8 for the IIFE bundle because
// the embedded QuickJS engine in faraday-cage does not support the large Unicode character
// classes that ajv@8's regex patterns produce after Babel transpilation.
// ajv@6 provides full JSON Schema draft-07 support (same as Postman's sandbox).

const libs = [
  // ── Phase 1 ──────────────────────────────────────────────────────────────
  {
    input: "src/lib-entries/lodash-entry.js",
    output: { file: "src/lib-bundles/lodash.iife.js", format: "iife", name: "__lodashBundle" },
    plugins,
  },
  {
    input: "src/lib-entries/uuid-entry.js",
    output: { file: "src/lib-bundles/uuid.iife.js", format: "iife", name: "__uuidBundle" },
    plugins,
  },
  // ── Phase 2 ──────────────────────────────────────────────────────────────
  {
    input: "src/lib-entries/moment-entry.js",
    output: { file: "src/lib-bundles/moment.iife.js", format: "iife", name: "__momentBundle" },
    plugins,
  },
  {
    input: "src/lib-entries/xml2js-entry.js",
    output: { file: "src/lib-bundles/xml2js.iife.js", format: "iife", name: "__xml2jsBundle" },
    plugins,
  },
  {
    input: "src/lib-entries/cheerio-entry.js",
    output: { file: "src/lib-bundles/cheerio.iife.js", format: "iife", name: "__cheerioBundle" },
    plugins,
  },
  // ── Phase 3 ──────────────────────────────────────────────────────────────
  {
    input: "src/lib-entries/crypto-js-entry.js",
    output: { file: "src/lib-bundles/crypto-js.iife.js", format: "iife", name: "__cryptoJsBundle" },
    plugins,
  },
  {
    input: "src/lib-entries/node-forge-entry.js",
    output: {
      file: "src/lib-bundles/node-forge.iife.js",
      format: "iife",
      name: "__nodeForgeBundle",
      // Inject stubs before the IIFE body so node-forge finds what it needs inside QuickJS
      // node-forge probes: process.versions.node (Node detection) and window (browser detection)
      intro: [
        "if(typeof process==='undefined'){try{globalThis.process={versions:{},env:{},browser:true};}catch(e){}}",
        "if(typeof window==='undefined'){try{globalThis.window=globalThis;}catch(e){}}",
      ].join("\n"),
    },
    plugins,
  },
  // ── Phase 4 ──────────────────────────────────────────────────────────────
  {
    input: "src/lib-entries/tv4-entry.js",
    output: { file: "src/lib-bundles/tv4.iife.js", format: "iife", name: "__tv4Bundle" },
    plugins,
  },
  {
    // ajv@6 bundled as IIFE — sets globalThis.Ajv, globalThis.ajv
    // ajv-formats is now a hand-written shim (separate bundle below)
    input: "src/lib-entries/ajv-entry.js",
    output: {
      file: "src/lib-bundles/ajv.iife.js",
      format: "iife",
      name: "__ajvBundle",
      banner: "var require$$0 = (typeof require !== 'undefined') ? require : function(){return {};};",
    },
    plugins,
  },
  {
    // ajv-formats: hand-written inline shim (no npm deps) — sets globalThis.ajvFormats
    // Avoids URI.js bundling issues that prevent the npm ajv-formats from working in QuickJS
    input: "src/lib-entries/ajv-formats-entry.js",
    output: { file: "src/lib-bundles/ajv-formats.iife.js", format: "iife", name: "__ajvFormatsBundle" },
    plugins,
  },
  // ── Phase 5 ──────────────────────────────────────────────────────────────
  {
    // chai@6 uses EventTarget/Event for its plugin system — polyfill before bundle runs
    input: "src/lib-entries/chai-entry.js",
    output: {
      file: "src/lib-bundles/chai.iife.js",
      format: "iife",
      name: "__chaiBundle",
      intro: [
        // window stub
        "if(typeof window==='undefined'){try{globalThis.window=globalThis;}catch(e){}}",
        // Full EventTarget polyfill (chai@6 calls events.dispatchEvent())
        "if(typeof EventTarget==='undefined'){try{globalThis.EventTarget=class EventTarget{constructor(){this.__L={};}addEventListener(t,l){if(!this.__L[t])this.__L[t]=[];this.__L[t].push(l);}removeEventListener(t,l){if(this.__L[t])this.__L[t]=this.__L[t].filter(x=>x!==l);}dispatchEvent(e){(this.__L[e.type]||[]).forEach(l=>l.call(this,e));return true;}};}catch(e){}}",
        // Event stub (chai's PluginEvent extends Event)
        "if(typeof Event==='undefined'){try{globalThis.Event=class Event{constructor(t,o){this.type=t;this.bubbles=!!(o&&o.bubbles);this.cancelable=!!(o&&o.cancelable);}};}catch(e){}}",
        // CustomEvent stub
        "if(typeof CustomEvent==='undefined'){try{globalThis.CustomEvent=class CustomEvent extends Event{constructor(t,o){super(t,o);this.detail=(o&&o.detail)||null;}};}catch(e){}}",
      ].join("\n"),
    },
    plugins,
  },
  {
    input: "src/lib-entries/jsonpath-plus-entry.js",
    output: { file: "src/lib-bundles/jsonpath-plus.iife.js", format: "iife", name: "__jsonpathPlusBundle" },
    plugins,
  },
  {
    // form-data: The npm form-data package requires Node.js streams — not available in QuickJS.
    // Instead, this bundle exposes the native sandbox FormData (already injected by the URL polyfill).
    // If FormData isn't available, falls back to a minimal polyfill that supports append/get/getHeaders.
    input: "src/lib-entries/form-data-entry.js",
    output: {
      file: "src/lib-bundles/form-data.iife.js",
      format: "iife",
      name: "__formDataBundle",
    },
    plugins,
  },
]

export default libs

