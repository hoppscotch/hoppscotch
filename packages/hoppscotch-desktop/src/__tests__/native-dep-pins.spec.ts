import { describe, expect, it } from "vitest"

import desktopManifest from "../../src-tauri/Cargo.toml?raw"
import desktopLock from "../../src-tauri/Cargo.lock?raw"
import vendoredPluginManifest from "../../plugin-workspace/tauri-plugin-relay/Cargo.toml?raw"
import vendoredRelayManifest from "../../plugin-workspace/relay/Cargo.toml?raw"
import agentManifest from "../../../hoppscotch-agent/src-tauri/Cargo.toml?raw"
import agentLock from "../../../hoppscotch-agent/src-tauri/Cargo.lock?raw"
import kernelPackage from "../../../hoppscotch-kernel/package.json?raw"

// The desktop app reads the host trust store through `relay`, which it gets
// transitively from `tauri-plugin-relay`, while the agent depends on `relay`
// directly and `plugin-workspace` vendors copies of both repos. Each of those
// pins a revision on its own, so a bump that misses one builds that app
// against a `relay` that never reads the keychain or the Windows stores.

const manifestRev = (manifest: string, crate: string) => {
  const match = manifest.match(
    new RegExp(`^${crate}\\s*=\\s*\\{[^}]*\\brev\\s*=\\s*"([0-9a-f]{40})"`, "m")
  )
  expect(match, `${crate} is pinned by rev`).not.toBeNull()
  return match![1]
}

const lockRevs = (lock: string, crate: string) => {
  const pattern = new RegExp(
    `name = "${crate}"\\nversion = "[^"]+"\\nsource = "git\\+[^"#]+#([0-9a-f]{40})"`,
    "g"
  )
  const revs = [...lock.matchAll(pattern)].map((m) => m[1])
  expect(revs, `${crate} resolves from git`).not.toHaveLength(0)
  return new Set(revs)
}

describe("native dependency pins", () => {
  it("resolves tauri-plugin-relay at the commit the desktop manifest and the kernel name", () => {
    const rev = manifestRev(desktopManifest, "tauri-plugin-relay")
    const kernel = JSON.parse(kernelPackage)

    expect(kernel.dependencies["@hoppscotch/plugin-relay"]).toBe(
      `github:CuriousCorrelation/tauri-plugin-relay#${rev}`
    )
    expect(lockRevs(desktopLock, "tauri-plugin-relay")).toEqual(new Set([rev]))
  })

  it("resolves relay at the vendored tauri-plugin-relay pin in the desktop app and the agent", () => {
    const rev = manifestRev(vendoredPluginManifest, "relay")

    expect(manifestRev(agentManifest, "relay")).toBe(rev)
    expect(lockRevs(desktopLock, "relay")).toEqual(new Set([rev]))
    expect(lockRevs(agentLock, "relay")).toEqual(new Set([rev]))
  })

  it("resolves curl at the vendored relay pin in the desktop app and the agent", () => {
    const rev = manifestRev(vendoredRelayManifest, "curl")

    // `curl-sys` supplies the bundled roots `relay` falls back to when the
    // host trust store returns no anchors, so it has to match `curl`.
    expect(manifestRev(vendoredRelayManifest, "curl-sys")).toBe(rev)
    for (const lock of [desktopLock, agentLock]) {
      expect(lockRevs(lock, "curl")).toEqual(new Set([rev]))
      expect(lockRevs(lock, "curl-sys")).toEqual(new Set([rev]))
    }
  })
})
