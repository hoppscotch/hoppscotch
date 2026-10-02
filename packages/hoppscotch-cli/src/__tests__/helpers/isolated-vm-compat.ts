/**
 * isolated-vm@6.1.2 only ships prebuilt binaries for Node 22 (ABI 127) and
 * Node 24 (ABI 137) — the versions CI runs on. On other Node builds the
 * locally-recompiled binary is incompatible with that Node's V8 internals and
 * new Isolate() segfaults the process (SIGSEGV). Use this flag to skip
 * legacy-sandbox tests rather than crash the Vitest worker on unsupported builds.
 */
export const ISOLATED_VM_COMPATIBLE_ABIS = ["127", "137"];
export const isolatedVmSupported = ISOLATED_VM_COMPATIBLE_ABIS.includes(
  process.versions.modules
);
