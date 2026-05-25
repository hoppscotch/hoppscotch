// IIFE entry: exposes node-forge as globalThis.forge
// Note: the rollup config injects a process stub as `intro` before this runs
import forge from "node-forge"
globalThis.forge = forge

