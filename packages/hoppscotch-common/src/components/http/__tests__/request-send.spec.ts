/* eslint-disable vue/one-component-per-file */
import { TestContainer } from "dioc/testing"
import { diocPlugin } from "dioc/vue"
import * as E from "fp-ts/Either"
import { Subject, of } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createApp, defineComponent, h, reactive, ref, type App } from "vue"

const runner = vi.hoisted(() => ({
  runRESTRequest$: vi.fn(),
}))

vi.mock("~/helpers/RequestRunner", () => runner)
vi.mock("@composables/i18n", () => ({ useI18n: () => (key: string) => key }))
vi.mock("@composables/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))
vi.mock("@composables/settings", async () => {
  const { ref } = await import("vue")
  return { useSetting: () => ref(false) }
})
vi.mock("~/helpers/backend/GQLClient", () => ({ runMutation: vi.fn() }))
vi.mock("~/helpers/handleTokenValidation", () => ({
  handleTokenValidation: vi.fn(),
}))
vi.mock("~/newstore/collections", () => ({ editRESTRequest: vi.fn() }))
vi.mock("~/newstore/history", async () => {
  const { of } = await import("rxjs")
  return { restHistory$: of([]) }
})
vi.mock("~/platform", () => ({
  platform: {
    analytics: { logEvent: vi.fn() },
    auth: {
      getCurrentUserStream: () => of(null),
      getCurrentUser: () => null,
    },
  },
}))

import Request from "~/components/http/Request.vue"
import { invokeAction } from "~/helpers/actions"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { InspectionService } from "~/services/inspection"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { WorkspaceService } from "~/services/workspace.service"

const tick = () => new Promise((r) => setTimeout(r, 0))

const Stub = defineComponent({
  setup:
    (_, { slots }) =>
    () =>
      h("div", slots.default?.()),
})

const emptyTestResults = () => ({
  description: "",
  expectResults: [],
  tests: [],
  envDiff: {
    global: { additions: [], deletions: [], updations: [] },
    selected: { additions: [], deletions: [], updations: [] },
  },
  scriptError: false,
  consoleEntries: [],
})

describe("http request send and cancel", () => {
  let app: App | null = null
  let pressEnterInUrl: (init?: KeyboardEventInit) => void
  let cancelRun: ReturnType<typeof vi.fn>

  const EnvInput = defineComponent({
    emits: ["enter"],
    setup(_, { emit }) {
      pressEnterInUrl = (init) =>
        emit("enter", new KeyboardEvent("keydown", init))
      return () => h("div")
    },
  })

  const mountRequest = (document: Record<string, unknown> = {}) => {
    const tab = reactive({
      id: "tab",
      document: {
        type: "request",
        isDirty: false,
        request: {
          ...getDefaultRESTRequest(),
          endpoint: "https://example.com/first",
        },
        response: null,
        testResults: null,
        ...document,
      },
    })

    const container = new TestContainer()
    container.bindMock(KernelInterceptorService, {
      current: ref({ id: "browser" }) as any,
    })
    container.bindMock(InspectionService, {
      getResultViewFor: () => ref([]) as any,
    })
    container.bindMock(WorkspaceTabsService, {
      currentTabID: ref("tab") as any,
      getActiveTabs: () => ref([tab]) as any,
    })
    container.bindMock(WorkspaceService, {
      currentWorkspace: ref({ type: "personal" }) as any,
    })

    app = createApp(Request, { modelValue: tab })
    app.use(diocPlugin, { container })
    app.directive("tippy", {})
    app.component("SmartEnvInput", EnvInput)
    for (const name of [
      "tippy",
      "HoppSmartSelectWrapper",
      "HoppSmartItem",
      "HoppButtonPrimary",
      "HoppButtonSecondary",
      "HttpImportCurl",
      "HttpCodegenModal",
      "CollectionsSaveRequest",
    ])
      app.component(name, Stub)
    app.mount(window.document.createElement("div"))

    return tab
  }

  beforeEach(() => {
    cancelRun = vi.fn()
    runner.runRESTRequest$.mockReset()
    runner.runRESTRequest$.mockImplementation(() => [
      cancelRun,
      Promise.resolve(E.right(new Subject())),
    ])
  })

  afterEach(() => {
    app?.unmount()
    app = null
  })

  it("does not start a second run on Enter in the URL field while one is in flight", async () => {
    mountRequest()

    pressEnterInUrl()
    await tick()
    expect(runner.runRESTRequest$).toHaveBeenCalledTimes(1)

    // Same as the button next to the field, which reads Cancel at this point
    pressEnterInUrl()
    await tick()
    expect(runner.runRESTRequest$).toHaveBeenCalledTimes(1)
    expect(cancelRun).toHaveBeenCalledTimes(1)
  })

  it("sends again on Enter once the run has finished", async () => {
    const tab = mountRequest()

    pressEnterInUrl()
    await tick()

    tab.document.response = { type: "success" } as any
    tab.document.testResults = emptyTestResults() as any
    await tick()

    pressEnterInUrl()
    await tick()
    expect(runner.runRESTRequest$).toHaveBeenCalledTimes(2)
    expect(cancelRun).not.toHaveBeenCalled()
  })

  it("leaves Ctrl/Cmd+Enter in the URL field to the shortcut", async () => {
    mountRequest()

    // One press with the field focused and the modifier held since an earlier
    // press: the shortcut in the capture phase, then the field's own `enter`
    const shortcutPress = async () => {
      invokeAction("request.send-cancel")
      await tick()
      pressEnterInUrl({ ctrlKey: true, metaKey: true })
      await tick()
    }

    await shortcutPress()
    expect(runner.runRESTRequest$).toHaveBeenCalledTimes(1)
    expect(cancelRun).not.toHaveBeenCalled()

    await shortcutPress()
    expect(runner.runRESTRequest$).toHaveBeenCalledTimes(1)
    expect(cancelRun).toHaveBeenCalledTimes(1)
  })

  it("cancels on the shortcut when the tab came back to a run still in flight", async () => {
    // A fresh component instance: `loading` is false, the document still says loading
    mountRequest({
      response: { type: "loading", req: getDefaultRESTRequest() },
      cancelFunction: (cancelRun = vi.fn()),
    })

    invokeAction("request.send-cancel")
    await tick()

    expect(runner.runRESTRequest$).not.toHaveBeenCalled()
    expect(cancelRun).toHaveBeenCalledTimes(1)
  })
})
