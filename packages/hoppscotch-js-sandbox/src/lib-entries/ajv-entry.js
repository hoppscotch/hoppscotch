// IIFE entry: exposes Ajv@6 as globalThis.Ajv
// We use ajv@6 (aliased as 'ajv6') because the embedded QuickJS engine in faraday-cage
// does not support the large Unicode character classes that ajv@8 generates.
// ajv@6 provides full JSON Schema draft-07 support (same as Postman's sandbox).
// The banner in rollup config defines require$$0 to satisfy uri.js CJS factory pattern.
import Ajv from "ajv6"
globalThis.Ajv = Ajv
globalThis.ajv = Ajv


