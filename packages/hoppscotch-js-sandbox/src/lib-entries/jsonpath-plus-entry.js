// IIFE entry: exposes jsonpath-plus as globalThis.JSONPath
// Usage: JSONPath({ path: '$.store.book[*].author', json: obj })
import { JSONPath } from "jsonpath-plus"
globalThis.JSONPath = JSONPath
// Also expose the whole module for max compat
import * as jsonpathPlus from "jsonpath-plus"
globalThis.jsonpathPlus = jsonpathPlus

