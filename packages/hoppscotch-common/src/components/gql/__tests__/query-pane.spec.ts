/* eslint-disable vue/one-component-per-file */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import { createApp, defineComponent, h, ref, type App, type Ref } from "vue"

// The editor's cursor ref, without a real CodeMirror view.
const cm = vi.hoisted(() => ({
  cursor: null as null | { value: { line: number; ch: number } },
}))
vi.mock("@composables/codemirror", async () => {
  const { ref } = await import("vue")
  return {
    useCodemirror: () => {
      const cursor = ref({ line: 0, ch: 0 })
      cm.cursor = cursor
      return { cursor }
    },
  }
})
vi.mock("@composables/i18n", () => ({ useI18n: () => (key: string) => key }))
vi.mock("~/composables/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))
vi.mock("~/helpers/editor/linting/gqlQuery", () => ({
  createGQLQueryLinter: () => null,
}))
vi.mock("~/helpers/editor/completion/gqlQuery", () => ({ default: () => null }))
vi.mock("~/helpers/editor/gql/operation", () => ({
  selectedGQLOpHighlight: {},
}))
vi.mock("~/platform", () => ({ platform: {} }))
vi.mock("~/modules/loadingbar", () => ({
  startPageProgress: () => {},
  completePageProgress: () => {},
}))

import Query from "~/components/gql/Query.vue"
import RequestOptions from "~/components/gql/RequestOptions.vue"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"
import { GQLTabConnectionService } from "~/services/gql-tab-connection.service"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { invokeAction } from "~/helpers/actions"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"

const tick = () => new Promise((r) => setTimeout(r, 0))

const Stub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h("div", slots.default?.()),
})

const QUERY = "query A {\n  a\n}\n\nquery B {\n  b\n}"

describe("gql query pane", () => {
  let app: App | null = null
  let container: TestContainer
  let builder: GQLQueryBuilderService
  let messageEvent: Ref<unknown>
  let runTab: ReturnType<typeof vi.fn>

  const mount = (component: any, props: Record<string, unknown>) => {
    app = createApp(component, props)
    app.use(diocPlugin, { container })
    app.directive("tippy", {})
    for (const name of [
      "HoppButtonSecondary",
      "HoppSmartTabs",
      "HoppSmartTab",
      "GqlQuery",
      "GqlVariable",
      "GqlHeaders",
      "GqlAuthorization",
      "HttpPreRequestScript",
      "HttpTests",
    ])
      app.component(name, Stub)
    app.mount(document.createElement("div"))
  }

  beforeEach(() => {
    container = new TestContainer()
    container.bindMock(WorkspaceTabsService, {})
    messageEvent = ref()
    runTab = vi.fn(async () => ({}))
    container.bindMock(GQLTabConnectionService, {
      activeTabSchema: ref(null) as any,
      getTabMessageEvent: () => messageEvent as any,
      getTabSubscriptionState: () => ref(undefined) as any,
      getTabConnectionState: () =>
        ({ error: null, state: "DISCONNECTED" }) as any,
      runTabGQLOperation: runTab as any,
    })
    container.bindMock(KernelInterceptorService, {
      current: ref({ id: "browser" }) as any,
    })
    builder = container.bind(GQLQueryBuilderService)
    cm.cursor = null
  })

  afterEach(() => {
    app?.unmount()
    app = null
  })

  describe("requested cursor moves", () => {
    it("applies a move for its own tab", async () => {
      mount(Query, { modelValue: QUERY, tabId: "a" })
      builder.moveCursorTo(4, 0, "a")
      await tick()
      expect(cm.cursor!.value).toEqual({ line: 4, ch: 0 })
      expect(builder.requestedCursor.value).toBeNull()
    })

    it("ignores a move for another tab", async () => {
      mount(Query, { modelValue: QUERY, tabId: "a" })
      builder.moveCursorTo(4, 0, "b")
      await tick()
      expect(cm.cursor!.value).toEqual({ line: 0, ch: 0 })
      // Left for the other tab's editor.
      expect(builder.requestedCursor.value).toMatchObject({ tabId: "b" })
    })

    it("applies its tab's pending move on mount", async () => {
      builder.moveCursorTo(4, 0, "a")
      mount(Query, { modelValue: QUERY, tabId: "a" })
      await tick()
      expect(cm.cursor!.value).toEqual({ line: 4, ch: 0 })
      expect(builder.requestedCursor.value).toBeNull()
    })

    it("leaves another tab's pending move on mount", async () => {
      builder.moveCursorTo(4, 0, "b")
      mount(Query, { modelValue: QUERY, tabId: "a" })
      await tick()
      expect(cm.cursor!.value).toEqual({ line: 0, ch: 0 })
    })

    it("still applies a tab-less move in the mounted editor", async () => {
      mount(Query, { modelValue: QUERY, tabId: "a" })
      builder.moveCursorTo(4, 0)
      await tick()
      expect(cm.cursor!.value).toEqual({ line: 4, ch: 0 })
    })

    it("keeps a newer move made while an older one waits", async () => {
      mount(Query, { modelValue: QUERY, tabId: "a" })
      builder.moveCursorTo(0, 0, "a")
      // The older move's watcher is now parked on nextTick.
      await Promise.resolve()
      builder.moveCursorTo(4, 2, "a")
      await tick()
      expect(cm.cursor!.value).toEqual({ line: 4, ch: 2 })
      expect(builder.requestedCursor.value).toBeNull()
    })
  })

  describe("named runs", () => {
    const mountOptions = () =>
      mount(RequestOptions, {
        modelValue: { ...getDefaultGQLRequest(), query: QUERY },
        tabId: "t1",
        url: "https://example.com/graphql",
      })

    it("runs the named operation", async () => {
      mountOptions()
      invokeAction("request.send-cancel", { operationName: "B" })
      await tick()
      expect(runTab).toHaveBeenCalledTimes(1)
      expect(runTab.mock.calls[0][1]).toMatchObject({ operationName: "B" })
    })

    it("runs the first operation without a name", async () => {
      mountOptions()
      invokeAction("request.send-cancel")
      await tick()
      expect(runTab.mock.calls[0][1]).toMatchObject({ operationName: "A" })
    })

    it("refuses a name that doesn't resolve", async () => {
      mountOptions()
      invokeAction("request.send-cancel", { operationName: "Missing" })
      await tick()
      expect(runTab).not.toHaveBeenCalled()
      expect(messageEvent.value).toMatchObject({
        type: "error",
        error: { type: "operation_not_found" },
      })
    })

    it("sends a named run the client can't parse, like an unnamed one", async () => {
      mount(RequestOptions, {
        modelValue: {
          ...getDefaultGQLRequest(),
          query: "query A {\n  user(id: <<userId>>) { name }\n}",
        },
        tabId: "t1",
        url: "https://example.com/graphql",
      })
      invokeAction("request.send-cancel", { operationName: "A" })
      await tick()
      expect(runTab).toHaveBeenCalledTimes(1)
      expect(runTab.mock.calls[0][1].operationName).toBeUndefined()
    })
  })
})
