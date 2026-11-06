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
import { hookKeybindingsListener } from "~/helpers/keybindings"
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
  let root: HTMLElement | null = null
  let cancelRun: ReturnType<typeof vi.fn>

  // Like `SmartEnvInput` with its suggestions closed: an Enter keydown in the
  // field emits `enter`, whatever modifiers are held
  const EnvInput = defineComponent({
    emits: ["enter"],
    setup(_, { emit }) {
      return () =>
        h("div", {
          "data-url-field": "",
          onKeydown: (ev: KeyboardEvent) => {
            if (ev.key === "Enter") emit("enter", ev)
          },
        })
    },
  })

  // The app's keybinding listener sees the keydown first, in the capture
  // phase, and the field after it
  const pressEnterInUrl = (modifiers: KeyboardEventInit = {}) => {
    root!.querySelector("[data-url-field]")!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
        ...modifiers,
      })
    )
  }

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

    // With the keybinding listener on the document, as the app's layout has it
    const Root = defineComponent({
      setup() {
        hookKeybindingsListener()
        return () => h(Request, { modelValue: tab as any })
      },
    })

    app = createApp(Root)
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
    root = window.document.body.appendChild(
      window.document.createElement("div")
    )
    app.mount(root)

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
    root?.remove()
    root = null
    vi.restoreAllMocks()
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

  // The send/cancel shortcut takes some of these presses and the field the
  // rest, but each press acts once: the first sends, the second cancels
  it.each([
    // Apple devices: the shortcut is Cmd+Enter, with or without Ctrl
    ["MacIntel", "Cmd", { metaKey: true }],
    ["MacIntel", "Cmd+Ctrl", { metaKey: true, ctrlKey: true }],
    ["MacIntel", "Ctrl", { ctrlKey: true }],
    ["MacIntel", "Cmd+Shift", { metaKey: true, shiftKey: true }],
    ["MacIntel", "Cmd+Alt", { metaKey: true, altKey: true }],
    // Elsewhere: the shortcut is Ctrl+Enter, with or without Meta
    ["Win32", "Ctrl", { ctrlKey: true }],
    ["Win32", "Ctrl+Meta", { ctrlKey: true, metaKey: true }],
    ["Win32", "Meta", { metaKey: true }],
    ["Win32", "Ctrl+Shift", { ctrlKey: true, shiftKey: true }],
    ["Win32", "Ctrl+Alt", { ctrlKey: true, altKey: true }],
    // Windows reports AltGr as Ctrl+Alt, and the shortcut ignores it
    ["Win32", "AltGr", { ctrlKey: true, altKey: true, modifierAltGraph: true }],
  ])(
    "on %s, %s+Enter in the URL field sends, then cancels",
    async (platform, _keys, modifiers) => {
      vi.spyOn(navigator, "platform", "get").mockReturnValue(platform)
      mountRequest()

      pressEnterInUrl(modifiers)
      await tick()
      expect(runner.runRESTRequest$).toHaveBeenCalledTimes(1)
      expect(cancelRun).not.toHaveBeenCalled()

      pressEnterInUrl(modifiers)
      await tick()
      expect(runner.runRESTRequest$).toHaveBeenCalledTimes(1)
      expect(cancelRun).toHaveBeenCalledTimes(1)
    }
  )

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
