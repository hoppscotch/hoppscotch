// IIFE entry: exposes chai assertion library as globalThis.chai
// chai@6 uses EventTarget/Event for its plugin event system.
// The rollup config injects EventTarget/Event polyfills via `intro` before this code runs.
import * as chai from "chai"
globalThis.chai = chai
// Also hoist the most-used chai APIs for convenience
globalThis.expect = chai.expect
globalThis.assert = chai.assert

