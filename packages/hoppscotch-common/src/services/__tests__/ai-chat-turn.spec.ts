import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { makeCollection } from "@hoppscotch/data"

const chatFn = vi.fn()
const mockServers = vi.fn()

// Same module-scope circularity the teardown spec works around.
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
    backend: {
      getMyMockServers: () => () => mockServers(),
      getTeamMockServers: () => () => mockServers(),
    },
  },
}))

import { AIChatService } from "../ai-chat.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { WorkspaceService } from "~/services/workspace.service"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { TeamAccessRole } from "~/helpers/backend/graphql"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { restCollectionStore, setRESTCollections } from "~/newstore/collections"
import { applySetting } from "~/newstore/settings"
import { bindAction, unbindAction } from "~/helpers/actions"

type ToolCall = { id: string; name: string; input: Record<string, unknown> }
type ToolResult = { content: string; is_error?: boolean }

type Internals = {
  turnGeneration: number
  executeToolCalls(
    calls: ToolCall[],
    generation: number
  ): Promise<{ replies: string[]; toolResults: ToolResult[] }>
}
const inner = (c: AIChatService) => c as unknown as Internals

const deferred = <T = unknown>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

const reply = (tool_calls: ToolCall[], content = "") =>
  E.right({ content, tool_calls, trace_id: "t" })

const collection = (name: string, requests: unknown[] = []) =>
  makeCollection({
    name,
    folders: [],
    requests: requests as never,
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: [],
    description: null,
    preRequestScript: "",
    testScript: "",
  })

const names = () => restCollectionStore.value.state.map((c) => c.name)

/** The tool results the model got back on the given (0-based) round-trip. */
const resultsSentOn = (call: number) => {
  const messages = chatFn.mock.calls[call][0] as { content: ToolResult[] }[]
  return messages[messages.length - 1].content
}

/** Stands in for pages/index.vue, the only page binding it. */
const openWorkspace = () => {}

const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

describe("AIChatService turn lifecycle", () => {
  let chat: AIChatService
  let tabs: WorkspaceTabsService
  let workspace: WorkspaceService

  const enterTeam = (teamName = "Acme") =>
    workspace.changeWorkspace({
      type: "team",
      teamID: "team_1",
      teamName,
      role: TeamAccessRole.Owner,
    })

  beforeEach(() => {
    chatFn.mockReset()
    mockServers.mockReset()
    const c = new TestContainer()
    chat = c.bind(AIChatService)
    tabs = c.bind(WorkspaceTabsService)
    workspace = c.bind(WorkspaceService)
    // No backend here: skip the team tree load a switch triggers.
    vi.spyOn(c.bind(TeamCollectionsService), "changeTeamID").mockImplementation(
      () => {}
    )
    setRESTCollections([collection("Staging")])
    bindAction("rest.request.open", openWorkspace)
  })

  afterEach(() => {
    unbindAction("rest.request.open", openWorkspace)
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("context per step", () => {
    it("re-reads the context for the pinned tab before every step", async () => {
      setRESTCollections([
        collection("API", [
          {
            ...getDefaultRESTRequest(),
            name: "Create User",
            method: "POST",
            endpoint: "https://api.example/users",
          },
        ]),
      ])
      const start = tabs.currentActiveTab.value.id
      const context = vi.fn((tabId: string | null) => `ctx:${tabId}`)
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "open_request",
              input: { request: "Create User" },
            },
          ])
        )
        .mockResolvedValueOnce(reply([], "done"))

      await chat.sendMessage("open Create User", context)

      const opened = tabs.currentActiveTab.value.id
      expect(opened).not.toBe(start)
      expect(chatFn.mock.calls.map((c) => c[1])).toEqual([
        `ctx:${start}`,
        `ctx:${opened}`,
      ])
      // The model also learns what opened without waiting a step.
      expect(resultsSentOn(1)[0].content).toContain(
        "`POST https://api.example/users`"
      )
    })
  })

  describe("workspace pin", () => {
    it("refuses a workspace tool after the user switched mid-reply", async () => {
      enterTeam()
      const round = deferred()
      chatFn
        .mockReturnValueOnce(round.promise)
        .mockResolvedValueOnce(reply([], "done"))
      const turn = chat.sendMessage("delete the Staging collection", "")
      await Promise.resolve()

      workspace.changeWorkspace({ type: "personal" })
      round.resolve(
        reply([
          {
            id: "1",
            name: "delete_collection",
            input: { collection: "Staging" },
          },
        ])
      )
      await turn

      expect(chat.pendingConfirmation.value).toBeNull()
      expect(names()).toEqual(["Staging"])
      const [result] = resultsSentOn(1)
      expect(result.content).toMatch(/workspace changed/)
      expect(result.is_error).toBe(true)
    })

    it("follows a switch the turn made itself", async () => {
      enterTeam()
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "switch_workspace",
              input: { workspace: "personal" },
            },
            { id: "2", name: "create_collection", input: { name: "New" } },
          ])
        )
        .mockResolvedValueOnce(reply([], "done"))

      await chat.sendMessage("go personal and add a New collection", "")

      expect(names()).toEqual(["Staging", "New"])
    })

    it("names the workspace in a delete confirmation", async () => {
      applySetting("ENABLE_EXPERIMENTAL_MOCK_SERVERS", true)
      enterTeam("Acme")
      mockServers.mockResolvedValue(
        E.right([{ id: "m1", name: "Orders Mock" }])
      )

      const done = inner(chat).executeToolCalls(
        [{ id: "1", name: "delete_mock_server", input: { name: "Orders" } }],
        inner(chat).turnGeneration
      )
      while (!chat.pendingConfirmation.value) await tick(5)
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "mock-server",
        name: "Orders Mock",
        workspace: "Acme",
      })
      chat.resolveConfirmation(false)
      await done
    })
  })

  describe("stop", () => {
    it("aborts the round-trip and frees the composer", async () => {
      const round = deferred()
      chatFn.mockReturnValueOnce(round.promise)
      const turn = chat.sendMessage("set the method to POST", "")
      await Promise.resolve()
      const signal = chatFn.mock.calls[0][3]?.signal as AbortSignal

      chat.stop()

      expect(signal.aborted).toBe(true)
      expect(chat.isStreaming.value).toBe(false)
      expect(chat.messages.value.some((m) => m.pending)).toBe(false)
      expect(chat.messages.value.at(-1)).toMatchObject({
        kind: "tool",
        content: "■ Stopped.",
      })

      // The platform's late answer is discarded.
      round.resolve(
        reply([{ id: "1", name: "set_method", input: { method: "POST" } }])
      )
      await turn
      expect(chat.lastTurnTools.value).toEqual([])
    })

    it("declines an open prompt and runs nothing after it", async () => {
      const method = () => {
        const doc = tabs.currentActiveTab.value.document
        return doc.type === "request" ? doc.request.method : null
      }
      chatFn.mockResolvedValueOnce(
        reply([
          {
            id: "1",
            name: "delete_collection",
            input: { collection: "Staging" },
          },
          { id: "2", name: "set_method", input: { method: "DELETE" } },
        ])
      )
      const turn = chat.sendMessage("drop Staging, make it a DELETE", "")
      while (!chat.pendingConfirmation.value) await tick(5)

      chat.stop()
      await turn

      expect(chat.pendingConfirmation.value).toBeNull()
      expect(names()).toEqual(["Staging"])
      expect(method()).toBe("GET")

      // A new message goes through straight away.
      chatFn.mockResolvedValueOnce(reply([], "hi"))
      await chat.sendMessage("hello", "")
      expect(chat.messages.value.at(-1)?.content).toBe("hi")
    })
  })

  describe("an abandoned turn's prompts", () => {
    const deleteMockServerTurn = async () => {
      applySetting("ENABLE_EXPERIMENTAL_MOCK_SERVERS", true)
      const servers = deferred()
      mockServers.mockReturnValueOnce(servers.promise)
      chatFn.mockResolvedValueOnce(
        reply([{ id: "1", name: "delete_mock_server", input: { name: "M" } }])
      )
      const turn = chat.sendMessage("delete mock server M", "")
      while (!mockServers.mock.calls.length) await tick(5)
      return { turn, servers }
    }

    it("never opens after a reset", async () => {
      const { turn, servers } = await deleteMockServerTurn()

      chat.reset()
      servers.resolve(E.right([{ id: "m1", name: "M" }]))
      await turn

      expect(chat.pendingConfirmation.value).toBeNull()
    })

    it("does not close the live turn's prompt", async () => {
      const { turn, servers } = await deleteMockServerTurn()
      chat.stop()

      chatFn.mockResolvedValueOnce(
        reply([
          {
            id: "2",
            name: "delete_collection",
            input: { collection: "Staging" },
          },
        ])
      )
      const live = chat.sendMessage("drop Staging", "")
      while (!chat.pendingConfirmation.value) await tick(5)

      servers.resolve(E.right([{ id: "m1", name: "M" }]))
      await turn
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "collection",
        name: "Staging",
      })

      chat.resolveConfirmation(false)
      chatFn.mockResolvedValueOnce(reply([], "ok"))
      await live
    })
  })

  describe("typing", () => {
    it("does not hold up the loop for a long reply", async () => {
      chatFn.mockResolvedValueOnce(
        reply([], Array.from({ length: 400 }, () => "word").join(" "))
      )
      const started = Date.now()
      await chat.sendMessage("write a lot", "")

      expect(Date.now() - started).toBeLessThan(1_000)
      expect(chat.messages.value.at(-1)?.content).toHaveLength(400 * 5 - 1)
    })

    it("shows the reply at once in a hidden tab", async () => {
      vi.useFakeTimers()
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      })
      try {
        chatFn.mockResolvedValueOnce(reply([], "one two three"))
        let done = false
        void chat.sendMessage("hi", "").then(() => (done = true))
        // Flush promises only: no timer may be needed to finish.
        for (let i = 0; i < 50; i++) await Promise.resolve()

        expect(done).toBe(true)
        expect(chat.messages.value.at(-1)?.content).toBe("one two three")
      } finally {
        delete (document as { hidden?: boolean }).hidden
      }
    })
  })

  describe("surrogate-safe truncation", () => {
    it("never splits an emoji in an older history message", async () => {
      const long = `${"x".repeat(799)}😀${"y".repeat(100)}`
      chatFn
        .mockResolvedValueOnce(reply([], long))
        .mockResolvedValueOnce(reply([], "ok"))
      await chat.sendMessage("first", "")
      await chat.sendMessage("second", "")

      const history = chatFn.mock.calls[1][0] as { content: string }[]
      const older = history.find((m) => m.content.startsWith("xxx"))
      expect(older?.content.length).toBeLessThan(long.length + 200)
      for (const m of history)
        expect(LONE_SURROGATE.test(m.content)).toBe(false)
    })

    it("never splits an emoji in a capped tool result", async () => {
      // One of two adjacent offsets always lands mid-pair at the cap.
      for (const pad of [780, 781]) {
        const { toolResults } = await inner(chat).executeToolCalls(
          [
            {
              id: "1",
              name: `${"a".repeat(pad)}${"😀".repeat(30)}`,
              input: {},
            },
          ],
          inner(chat).turnGeneration
        )
        expect(toolResults[0].content.length).toBeLessThanOrEqual(801)
        expect(LONE_SURROGATE.test(toolResults[0].content)).toBe(false)
      }
    })
  })
})
