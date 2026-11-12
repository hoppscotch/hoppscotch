/* eslint-disable vue/one-component-per-file -- inline stubs for child components */
/**
 * EnvInput must tear down its CodeMirror view and the element listeners it
 * adds when the component unmounts. Destroying the view only from the `editor`
 * ref watcher is not enough, because that watcher never runs on unmount, so
 * every request tab switch would leak an EditorView (plus the tooltip
 * container it appends to `document.body`).
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { App, createApp, defineComponent, h, nextTick, ref } from "vue"
import { BehaviorSubject } from "rxjs"
import { EditorSelection } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

const { invokeAction } = vi.hoisted(() => ({ invokeAction: vi.fn() }))

vi.mock("~/helpers/actions", () => ({ invokeAction }))

vi.mock("~/composables/i18n", () => ({
  useI18n: () => (key: string) => key,
}))

vi.mock("~/platform", () => ({ platform: {} }))

vi.mock("~/newstore/environments", () => ({
  aggregateEnvsWithCurrentValue$: new BehaviorSubject([]),
}))

// These pull in the real services and stores, which need a bootstrapped app
vi.mock("~/services/tab/workspace-tabs", () => ({
  WorkspaceTabsService: class {},
}))
vi.mock("~/services/inspection", () => ({}))
vi.mock("~/helpers/utils/environments", () => ({
  getEffectiveVariablesForRequest: () => [],
}))

vi.mock("dioc/vue", () => ({
  useService: () => ({
    currentActiveTab: ref({
      document: {
        type: "request",
        request: { requestVariables: [] },
        inheritedProperties: { variables: [] },
      },
    }),
  }),
}))

// The real plugin registers a `hoverTooltip`, which is what makes CodeMirror's
// `tooltips({ parent: document.body })` config append a container to the body.
// The stub keeps that shape without the real plugin's store dependencies.
vi.mock("~/helpers/editor/extensions/HoppEnvironment", async () => {
  const { hoverTooltip } = await import("@codemirror/view")
  return {
    HoppReactiveEnvPlugin: class {
      get extension() {
        return hoverTooltip(() => null)
      }
    },
  }
})

vi.mock("~/helpers/editor/extensions/HoppPredefinedVariables", () => ({
  HoppPredefinedVariablesPlugin: class {
    get extension() {
      return []
    }
  },
}))

import EnvInput from "../EnvInput.vue"

// jsdom has no layout, so it omits the Range geometry CodeMirror's
// `coordsAtPos` (used to position the context menu) relies on
Range.prototype.getClientRects ??= () =>
  Object.assign([], { item: () => null }) as unknown as DOMRectList
Range.prototype.getBoundingClientRect ??= () => new DOMRect()

const MODEL_VALUE = "hello world"

/** Renders a real button so the show/hide secret toggle can be clicked */
const HoppButtonSecondaryStub = defineComponent({
  emits: ["click"],
  setup:
    (_, { emit }) =>
    () =>
      h("button", {
        "data-testid": "secret-toggle",
        onClick: (e: MouseEvent) => emit("click", e),
      }),
})

let app: App | null = null
let host: HTMLElement | null = null

const mountEnvInput = async (props: Record<string, unknown> = {}) => {
  host = document.createElement("div")
  document.body.appendChild(host)

  app = createApp({
    render: () => h(EnvInput, { modelValue: MODEL_VALUE, ...props }),
  })
  app.component("AppInspection", { render: () => null })
  app.component("HoppButtonSecondary", HoppButtonSecondaryStub)
  app.directive("tippy", {})
  app.mount(host)
  await nextTick()
}

const unmount = () => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
}

/** The element EnvInput mounts CodeMirror into (its `editor` ref), if rendered */
const getEditorEl = () =>
  host?.querySelector<HTMLElement>(".cm-editor")?.parentElement ?? null

const getView = () => {
  const el = getEditorEl()
  if (!el) throw new Error("EnvInput did not render a CodeMirror editor")
  return EditorView.findFromDOM(el)!
}

const clickSecretToggle = async () => {
  host!.querySelector<HTMLElement>("[data-testid=secret-toggle]")!.click()
  await nextTick()
}

/** Everything in `document.body` other than the test's own mount point */
const strayBodyNodes = () =>
  [...document.body.children].filter((node) => node !== host)

type ListenerSpy = { mock: { calls: any[][]; contexts: any[] } }

/** Listener calls made on `el` for the context-menu events */
const contextMenuListenerCalls = (spy: ListenerSpy, el: Element) =>
  spy.mock.calls.filter(
    ([type], i) =>
      spy.mock.contexts[i] === el && (type === "mouseup" || type === "keyup")
  )

const selectRange = (from: number, to: number) =>
  getView().dispatch({ selection: EditorSelection.single(from, to) })

describe("EnvInput editor lifecycle", () => {
  beforeEach(() => {
    invokeAction.mockClear()
  })

  afterEach(() => {
    unmount()
    // A regression leaks DOM into the body; clear it so one failure does not
    // cascade into the body-count assertions of later tests
    document.body.replaceChildren()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe("on unmount", () => {
    test("destroys the CodeMirror view exactly once", async () => {
      const destroySpy = vi.spyOn(EditorView.prototype, "destroy")

      await mountEnvInput()
      expect(destroySpy).not.toHaveBeenCalled()

      unmount()
      expect(destroySpy).toHaveBeenCalledTimes(1)
    })

    test("removes the tooltip container the view appended to document.body", async () => {
      expect(strayBodyNodes()).toHaveLength(0)

      await mountEnvInput()
      // Precondition: the leak this guards against is observable at all
      expect(strayBodyNodes()).toHaveLength(1)

      unmount()
      expect(document.body.children).toHaveLength(0)
    })

    test("does not accumulate DOM across repeated mount/unmount cycles", async () => {
      // Mirrors switching between request tabs, which remounts EnvInput
      for (let i = 0; i < 5; i++) {
        await mountEnvInput()
        unmount()
      }

      expect(document.body.children).toHaveLength(0)
    })

    test("removes the same mouseup/keyup listener functions it added", async () => {
      const addSpy = vi.spyOn(HTMLElement.prototype, "addEventListener")
      const removeSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener")

      await mountEnvInput()
      const editorEl = getEditorEl()!
      const added = contextMenuListenerCalls(addSpy, editorEl)
      expect(added.map(([type]) => type).sort()).toEqual(["keyup", "mouseup"])

      unmount()
      // Identity matters: removeEventListener with a different function
      // reference is a silent no-op
      const removed = contextMenuListenerCalls(removeSpy, editorEl)
      expect(removed).toHaveLength(2)
      for (const [type, fn] of added) {
        expect(removed).toContainEqual([type, fn])
      }
    })

    test("with the context menu disabled, adds no listeners and still destroys the view", async () => {
      const addSpy = vi.spyOn(HTMLElement.prototype, "addEventListener")
      const removeSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener")
      const destroySpy = vi.spyOn(EditorView.prototype, "destroy")

      await mountEnvInput({ contextMenuEnabled: false })
      const editorEl = getEditorEl()!
      expect(contextMenuListenerCalls(addSpy, editorEl)).toHaveLength(0)

      unmount()
      expect(contextMenuListenerCalls(removeSpy, editorEl)).toHaveLength(0)
      expect(destroySpy).toHaveBeenCalledTimes(1)
      expect(document.body.children).toHaveLength(0)
    })
  })

  describe("when toggling a secret input", () => {
    // `secret` starts masked: a password <input> renders instead of the
    // editor, so toggling creates and removes the editor while mounted. This
    // exercises the `editor` watcher's teardown, not the unmount hook.
    test("tears the editor down when it is hidden again, and not twice on unmount", async () => {
      const destroySpy = vi.spyOn(EditorView.prototype, "destroy")
      const removeSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener")

      await mountEnvInput({ secret: true })
      expect(getEditorEl()).toBeNull()

      await clickSecretToggle()
      const editorEl = getEditorEl()
      expect(editorEl).not.toBeNull()
      expect(strayBodyNodes()).toHaveLength(1)

      await clickSecretToggle()
      expect(getEditorEl()).toBeNull()
      expect(destroySpy).toHaveBeenCalledTimes(1)
      expect(contextMenuListenerCalls(removeSpy, editorEl!)).toHaveLength(2)
      expect(strayBodyNodes()).toHaveLength(0)

      unmount()
      expect(destroySpy).toHaveBeenCalledTimes(1)
    })

    test("re-creates a working editor each time it is shown", async () => {
      await mountEnvInput({ secret: true })

      for (let i = 0; i < 3; i++) {
        await clickSecretToggle()
        expect(getView().state.doc.toString()).toBe(MODEL_VALUE)
        await clickSecretToggle()
      }

      expect(strayBodyNodes()).toHaveLength(0)
    })
  })

  describe("context-menu text selection", () => {
    // The fix hoisted these debounced handlers to one instance per component;
    // these guard that the context menu still opens, once, with the selection
    test.each(["mouseup", "keyup"])(
      "%s opens the context menu once per burst, after 140ms",
      async (eventType) => {
        vi.useFakeTimers()
        await mountEnvInput()
        selectRange(0, 5)
        invokeAction.mockClear()

        const editorEl = getEditorEl()!
        // e.g. a double click fires two mouseups
        editorEl.dispatchEvent(new Event(eventType))
        editorEl.dispatchEvent(new Event(eventType))

        await vi.advanceTimersByTimeAsync(139)
        expect(invokeAction).not.toHaveBeenCalled()

        await vi.advanceTimersByTimeAsync(1)
        expect(invokeAction).toHaveBeenCalledTimes(1)
        expect(invokeAction).toHaveBeenCalledWith(
          "contextmenu.open",
          expect.objectContaining({ text: "hello" })
        )
      }
    )

    test("debounces a burst of scroll events into one call", async () => {
      vi.useFakeTimers()
      await mountEnvInput()
      selectRange(0, 5)
      invokeAction.mockClear()

      const { scrollDOM } = getView()
      for (let i = 0; i < 5; i++) {
        scrollDOM.dispatchEvent(new Event("scroll"))
      }
      await vi.advanceTimersByTimeAsync(30)

      expect(invokeAction).toHaveBeenCalledTimes(1)
      expect(invokeAction).toHaveBeenCalledWith(
        "contextmenu.open",
        expect.objectContaining({ text: "hello" })
      )
    })

    test("does not open the context menu when it is disabled", async () => {
      vi.useFakeTimers()
      await mountEnvInput({ contextMenuEnabled: false })
      selectRange(0, 5)
      invokeAction.mockClear()

      getEditorEl()!.dispatchEvent(new Event("mouseup"))
      getView().scrollDOM.dispatchEvent(new Event("scroll"))
      await vi.advanceTimersByTimeAsync(200)

      expect(invokeAction).not.toHaveBeenCalled()
    })
  })
})
