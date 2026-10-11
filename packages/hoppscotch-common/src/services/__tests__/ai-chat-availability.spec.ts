import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { makeCollection } from "@hoppscotch/data"

// The sidebar helpers the delete reuses reach services through `getService`.
const holder = vi.hoisted(() => ({
  container: null as null | { bind: (service: never) => unknown },
}))
vi.mock("~/modules/dioc", async () => {
  const { Container } = await import("dioc")
  const fallback = new Container()
  return {
    getService: (service: never) =>
      (holder.container ?? fallback).bind(service),
  }
})

vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

const ai = vi.hoisted(() => ({
  chat: undefined as unknown,
  getChatAvailability: undefined as unknown,
}))
vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: ai },
    auth: {
      getCurrentUser: () => null,
      getCurrentUserStream: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
    },
  },
}))

import { AIChatService } from "../ai-chat.service"
import { restCollectionStore, setRESTCollections } from "~/newstore/collections"

type ToolResult = { content: string; is_error?: boolean }
type Internals = {
  turnGeneration: number
  captureLocalSecret(secret: string): string
  mockServersEnabledError(): string | null
  loadMockServersForWorkspace(): Promise<unknown>
  executeToolCalls(
    calls: { id: string; name: string; input: Record<string, unknown> }[],
    generation: number
  ): Promise<{ toolResults: ToolResult[] }>
}
const inner = (c: AIChatService) => c as unknown as Internals

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))
const chatFn = vi.fn()
const getAvailability = vi.fn()
const on = (enabled: boolean) =>
  E.right({ enabled, models: [], skills: [] }) as never

describe("AIChatService availability and errors", () => {
  let chat: AIChatService

  beforeEach(() => {
    chatFn.mockReset()
    getAvailability.mockReset()
    ai.chat = chatFn
    ai.getChatAvailability = getAvailability
    const c = new TestContainer()
    holder.container = c as never
    chat = c.bind(AIChatService)
  })

  afterEach(() => {
    holder.container = null
  })

  describe("available", () => {
    it("is false until the server says the assistant is on", async () => {
      expect(chat.available.value).toBe(false)

      getAvailability.mockResolvedValueOnce(E.left("NETWORK"))
      await chat.loadAvailability()
      expect(chat.available.value).toBe(false)

      getAvailability.mockResolvedValueOnce(on(true))
      await chat.loadAvailability()
      expect(chat.available.value).toBe(true)
    })

    it("forgets the answer when the session ends", async () => {
      getAvailability.mockResolvedValueOnce(on(true))
      await chat.loadAvailability()
      chat.clearAvailability()

      expect(chat.available.value).toBe(false)
      expect(chat.availabilityKnown.value).toBe(false)
    })

    it("drops a lookup that outlived its session", async () => {
      let answer!: (v: unknown) => void
      getAvailability.mockReturnValueOnce(new Promise((r) => (answer = r)))
      const lookup = chat.loadAvailability()
      chat.clearAvailability()
      answer(on(true))
      await lookup

      expect(chat.available.value).toBe(false)
    })

    it("follows chat alone on a platform with no server switch", () => {
      ai.getChatAvailability = undefined
      expect(chat.available.value).toBe(true)
    })
  })

  describe("chat errors", () => {
    const errorFor = async (code: string) => {
      chatFn.mockResolvedValueOnce(E.left(code))
      await chat.sendMessage("hi", "")
      const last = chat.messages.value.at(-1)
      expect(last?.kind).toBe("error")
      return last?.content
    }

    it.each([
      ["PROVIDER_MISCONFIGURED", "provider_misconfigured"],
      ["PROVIDER_TIMEOUT", "provider_timeout"],
      ["NETWORK", "network"],
      ["RATE_LIMITED", "rate_limited"],
      ["UNAUTHORIZED", "unauthorized"],
      ["CHAT_DISABLED", "chat_disabled"],
      ["CANNOT_RUN_CHAT", "cannot_run_chat"],
      ["toString", "cannot_run_chat"],
    ])("maps %s to its own notice", async (code, key) => {
      getAvailability.mockResolvedValue(on(true))
      expect(await errorFor(code)).toBe(`⚠️ ai_experiments.chat.errors.${key}`)
    })

    it("re-reads availability when the server says the chat is off", async () => {
      getAvailability.mockResolvedValueOnce(on(true))
      await chat.loadAvailability()
      getAvailability.mockResolvedValueOnce(on(false))

      await errorFor("CHAT_DISABLED")
      await tick()

      expect(getAvailability).toHaveBeenCalledTimes(2)
      expect(chat.available.value).toBe(false)
    })

    it("ends a stopped round-trip quietly", async () => {
      chatFn.mockResolvedValueOnce(E.left("ABORTED"))
      await chat.sendMessage("hi", "")

      expect(chat.messages.value.some((m) => m.kind === "error")).toBe(false)
    })
  })

  describe("maskLocalSecrets", () => {
    it("puts a resolved credential back behind its reference", () => {
      const id = inner(chat).captureLocalSecret("f9e8d7c6b5a43210")
      const long = inner(chat).captureLocalSecret("f9e8d7c6b5a43210-extra")

      expect(
        chat.maskLocalSecrets(
          "- X-Auth-Token: f9e8d7c6b5a43210\n?k=f9e8d7c6b5a43210-extra"
        )
      ).toBe(`- X-Auth-Token: <<local-ref:${id}>>\n?k=<<local-ref:${long}>>`)
    })

    it("leaves very short values alone", () => {
      inner(chat).captureLocalSecret("ab")
      expect(chat.maskLocalSecrets("tab: abc")).toBe("tab: abc")
    })
  })

  describe("successful replies go back as successes", () => {
    const run = (name: string, input: Record<string, unknown> = {}) =>
      inner(chat).executeToolCalls(
        [{ id: "t1", name, input }],
        inner(chat).turnGeneration
      )

    it("a confirmed delete", async () => {
      setRESTCollections([
        makeCollection({
          name: "Payments",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
        } as never),
      ])
      const done = run("delete_collection", { collection: "Payments" })
      for (let i = 0; i < 50 && !chat.pendingConfirmation.value; i++)
        await tick()
      expect(chat.pendingConfirmation.value).not.toBeNull()
      chat.resolveConfirmation(true)
      const [result] = (await done).toolResults

      expect(restCollectionStore.value.state).toEqual([])
      expect(result.content).toMatch(/Deleted \*\*Payments\*\*/)
      expect(result.is_error).toBeUndefined()
    })

    // The model only saw the marker; writing it back loses the real value.
    it("refuses input that carries a redacted value", async () => {
      setRESTCollections([])
      const [result] = (
        await run("create_collection", { name: "Keys [REDACTED]" })
      ).toolResults

      expect(restCollectionStore.value.state).toEqual([])
      expect(result.content).toMatch(/redacted; ask the user/)
      expect(result.is_error).toBe(true)
    })

    it("an empty mock server list", async () => {
      inner(chat).mockServersEnabledError = () => null
      inner(chat).loadMockServersForWorkspace = async () => ({ servers: [] })
      const [result] = (await run("list_mock_servers")).toolResults

      expect(result.content).toMatch(/no mock servers/)
      expect(result.is_error).toBeUndefined()
    })
  })
})
