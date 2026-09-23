import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"

const chatFn = vi.fn()

// modules/i18n resolves PersistenceService at module scope, which is circular
// when the service graph is imported from a test rather than from the app.
vi.mock("~/modules/i18n", () => ({
  getI18n: () => (key: string) => key,
  APP_LANGUAGES: [],
  changeAppLanguage: () => {},
}))

vi.mock("~/platform", () => ({
  platform: {
    experiments: { aiExperiments: { chat: (...a: unknown[]) => chatFn(...a) } },
    auth: {
      getCurrentUser: () => null,
      getCurrentUserStream: () => ({ subscribe: () => ({ unsubscribe() {} }) }),
    },
  },
}))

import { AIChatService } from "../ai-chat.service"

/** A chat round-trip the test resolves by hand. */
const deferred = () => {
  let resolve!: (v: unknown) => void
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}

/** Runs one TYPING_TICK_MS frame (fake timers); returns the part-typed reply. */
const firstFrame = async (chat: AIChatService) => {
  await vi.advanceTimersByTimeAsync(16)
  const typing = chat.messages.value.at(-1)
  expect(typing?.pending).toBe(true)
  expect(typing?.content).not.toBe("")
  return typing!
}

/** Reaches past `private` to assert the security properties directly. */
type Internals = {
  localSecretValues: Map<string, string>
  captureLocalSecret(secret: string): string
  resolveLocalSecrets(input: unknown, resolved: Map<string, string>): unknown
  executeToolCalls(
    calls: unknown[],
    generation: number
  ): Promise<{ replies: string[] }>
}
const inner = (c: AIChatService) => c as unknown as Internals

describe("AIChatService teardown", () => {
  let chat: AIChatService

  beforeEach(() => {
    chatFn.mockReset()
    chat = new TestContainer().bind(AIChatService)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("clear vs reset", () => {
    it("clear() refuses while a reply is arriving, reset() does not", async () => {
      const round = deferred()
      chatFn.mockReturnValue(round.promise)

      const turn = chat.sendMessage("hello there", "")
      await Promise.resolve()
      expect(chat.isStreaming.value).toBe(true)

      chat.clear()
      expect(chat.messages.value.length).toBeGreaterThan(0)

      chat.reset()
      expect(chat.messages.value).toEqual([])
      expect(chat.isStreaming.value).toBe(false)

      round.resolve(E.right({ content: "hi", tool_calls: [] }))
      await turn
      expect(chat.messages.value).toEqual([])
      expect(chat.lastTurnStatus.value).toBe("idle")
    })

    it("clear() still empties an idle conversation", async () => {
      chatFn.mockResolvedValue(E.right({ content: "hi", tool_calls: [] }))
      await chat.sendMessage("hello", "")
      expect(chat.messages.value.length).toBeGreaterThan(0)

      chat.clear()
      expect(chat.messages.value).toEqual([])
      expect(chat.lastTurnStatus.value).toBe("idle")
    })
  })

  describe("secret references", () => {
    it("reset() drops the client-local secret values", async () => {
      const round = deferred()
      chatFn.mockReturnValue(round.promise)
      const turn = chat.sendMessage(
        "authorization: Bearer supersecrettoken",
        ""
      )
      await Promise.resolve()

      expect(inner(chat).localSecretValues.size).toBeGreaterThan(0)
      chat.reset()
      expect(inner(chat).localSecretValues.size).toBe(0)

      round.resolve(E.right({ content: "done", tool_calls: [] }))
      await turn
      expect(inner(chat).localSecretValues.size).toBe(0)
    })

    // A turn abandoned mid-batch can still resolve a reference it captured
    // earlier. If reset re-minted ids, that lookup would hit the NEXT session's
    // credential and write it wherever the abandoned tool was headed.
    it("never re-mints a reference id across a reset", () => {
      const first = inner(chat).captureLocalSecret("sk_live_AAAAAAAAAAAAAAAA")
      chat.reset()
      const second = inner(chat).captureLocalSecret("sk_live_BBBBBBBBBBBBBBBB")

      expect(second).not.toBe(first)

      // The stale reference must resolve to nothing, not to the new secret.
      const stale = { value: `Bearer <<local-ref:${first}>>` }
      const resolved = inner(chat).resolveLocalSecrets(stale, new Map()) as {
        value: string
      }
      expect(resolved.value).not.toContain("BBBBBBBBBBBBBBBB")
    })
  })

  describe("an abandoned turn stops writing", () => {
    it("discards the round-trip it was awaiting", async () => {
      const round = deferred()
      chatFn.mockReturnValue(round.promise)
      const turn = chat.sendMessage("set the method to POST", "")
      await Promise.resolve()

      chat.reset()
      round.resolve(
        E.right({
          content: "",
          tool_calls: [
            { id: "t1", name: "set_method", input: { method: "POST" } },
          ],
        })
      )
      await turn

      expect(chat.lastTurnTools.value).toEqual([])
      expect(chat.messages.value).toEqual([])
      expect(chat.lastTurnStatus.value).toBe("idle")
    })

    it("stops streaming text into a conversation that is gone", async () => {
      vi.useFakeTimers()
      chatFn.mockResolvedValue(
        E.right({ content: "one two three four five six", tool_calls: [] })
      )
      const turn = chat.sendMessage("hello", "")
      const typing = await firstFrame(chat)
      const shown = typing.content

      chat.reset()
      await vi.runAllTimersAsync()
      await turn

      expect(typing.content).toBe(shown)
      expect(chat.messages.value).toEqual([])
      expect(chat.lastTurnStatus.value).toBe("idle")
    })

    it("executes no tool call once the turn is stale", async () => {
      const { replies } = await inner(chat).executeToolCalls(
        [{ id: "t1", name: "set_method", input: { method: "POST" } }],
        -1 // a generation that can never be current
      )
      expect(replies).toEqual([])
    })

    it("does not clear isStreaming for the turn that replaced it", async () => {
      const first = deferred()
      chatFn.mockReturnValue(first.promise)
      const abandoned = chat.sendMessage("first message", "")
      await Promise.resolve()

      chat.reset()

      const second = deferred()
      chatFn.mockReturnValue(second.promise)
      const current = chat.sendMessage("second message", "")
      await Promise.resolve()
      expect(chat.isStreaming.value).toBe(true)

      // The abandoned turn finishes last and must not touch the live turn.
      first.resolve(E.right({ content: "stale", tool_calls: [] }))
      await abandoned
      expect(chat.isStreaming.value).toBe(true)

      second.resolve(E.right({ content: "live", tool_calls: [] }))
      await current
      expect(chat.isStreaming.value).toBe(false)
    })
  })

  describe("offline fallback", () => {
    it("abandons its reply when the conversation is reset", async () => {
      const platform = (await import("~/platform")).platform as unknown as {
        experiments?: { aiExperiments?: { chat?: unknown } }
      }
      const saved = platform.experiments!.aiExperiments!.chat
      platform.experiments!.aiExperiments!.chat = undefined
      try {
        vi.useFakeTimers()
        const turn = chat.sendMessage("set the url to https://example.com", "")
        const typing = await firstFrame(chat)
        const shown = typing.content

        chat.reset()
        await vi.runAllTimersAsync()
        await turn
        expect(typing.content).toBe(shown)
        expect(chat.lastTurnStatus.value).toBe("idle")
        expect(chat.messages.value).toEqual([])
      } finally {
        platform.experiments!.aiExperiments!.chat = saved
      }
    })
  })
})
