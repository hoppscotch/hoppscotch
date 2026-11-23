import { beforeEach, describe, expect, it, vi } from "vitest"
import * as E from "fp-ts/Either"
import { TestContainer } from "dioc/testing"
import type { StoreFile } from "@hoppscotch/kernel"
import { Store } from "~/kernel/store"
import { KernelInterceptorNativeStore } from "../store"

vi.mock("~/kernel/store", () => ({
  Store: {
    init: vi.fn(async () => E.right(undefined)),
    get: vi.fn(async () =>
      E.right({
        version: "v1",
        domains: { "*": { version: "v1" } },
        clientCerts: [],
        lastUpdated: "",
      })
    ),
    set: vi.fn(async () => E.right(undefined)),
    watch: vi.fn(async () => ({ on: vi.fn() })),
  },
}))

const file: StoreFile = {
  include: true,
  name: "client.pem",
  size: 1,
  lastModified: 0,
  content: new Uint8Array([1]),
}

const request = (url: string) => ({
  id: 1,
  url,
  method: "GET" as const,
  version: "HTTP/1.1" as const,
})

describe("native client certificate registry", () => {
  beforeEach(() => vi.mocked(Store.set).mockClear())

  it("uses hostname without port while leaving legacy settings unchanged", async () => {
    const store = new TestContainer().bind(KernelInterceptorNativeStore)
    await store.onServiceInit()
    const legacy = { kind: "pem" as const, cert: file, key: file }
    await store.saveDomainSettings("*", {
      version: "v1",
      security: {
        verifyPeer: true,
        certificates: { client: legacy, ca: [file] },
      },
    })
    await store.saveClientCerts([
      {
        id: "api",
        hostname: "api.example.com",
        kind: "pem",
        cert: { ...file, content: new Uint8Array([2]) },
        key: file,
      },
    ])

    const matched = await store.completeRequest(
      request("https://api.example.com:8443")
    )
    const unrelated = await store.completeRequest(
      request("https://other.example.com")
    )

    expect(matched.security?.certificates?.client).toEqual({
      kind: "pem",
      cert: new Uint8Array([2]),
      key: file.content,
    })
    expect(matched.security?.certificates?.ca).toEqual([file.content])
    expect(unrelated.security?.certificates?.client).toEqual({
      kind: "pem",
      cert: file.content,
      key: file.content,
    })
    expect(store.getDomainSettings("*").security?.certificates?.client).toEqual(
      legacy
    )
  })

  it("does not keep unsaved registry changes after a failed write", async () => {
    const store = new TestContainer().bind(KernelInterceptorNativeStore)
    await store.onServiceInit()
    vi.mocked(Store.set).mockRejectedValueOnce(new Error("disk full"))

    await expect(
      store.saveClientCerts([
        {
          id: "one",
          hostname: "example.com",
          kind: "pem",
          cert: file,
          key: file,
        },
      ])
    ).rejects.toThrow("disk full")
    expect(store.getClientCerts()).toEqual([])
  })

  it("retains legacy certificates when removing them cannot be persisted", async () => {
    const store = new TestContainer().bind(KernelInterceptorNativeStore)
    await store.onServiceInit()
    const legacy = { kind: "pem" as const, cert: file, key: file }
    await store.saveDomainSettings("*", {
      version: "v1",
      security: { certificates: { client: legacy } },
    })
    vi.mocked(Store.set).mockRejectedValueOnce(new Error("disk full"))

    await expect(
      store.saveDomainSettings("*", {
        version: "v1",
        security: { certificates: {} },
      })
    ).rejects.toThrow("disk full")
    expect(store.getDomainSettings("*").security?.certificates?.client).toEqual(
      legacy
    )
  })
})
