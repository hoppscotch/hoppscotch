import { javascript } from "@codemirror/lang-javascript"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { describe, expect, test, vi } from "vitest"
import { nextTick, reactive, ref } from "vue"

vi.mock("~/modules/i18n", () => ({ getI18n: () => (k: string) => k }))
vi.mock("~icons/lucide/edit?raw", () => ({ default: "" }))
vi.mock("~icons/lucide/user?raw", () => ({ default: "" }))
vi.mock("~icons/lucide/users?raw", () => ({ default: "" }))
vi.mock("~icons/lucide/globe?raw", () => ({ default: "" }))
vi.mock("~icons/lucide/variable?raw", () => ({ default: "" }))
vi.mock("~icons/lucide/library?raw", () => ({ default: "" }))

const activeTab = vi.hoisted(() => ({ tab: null as any }))

vi.mock("~/services/tab/workspace-tabs", async () => {
  const { Service }: any = await vi.importActual("dioc")

  return {
    WorkspaceTabsService: class extends Service {
      static ID = "WORKSPACE_TABS_SERVICE"

      currentActiveTab = {
        get value() {
          return activeTab.tab.value
        },
      }
    },
  }
})

import {
  environmentHighlightStyle,
  HoppEnvironmentPlugin,
} from "../HoppEnvironment"

const requestTab = () => ({
  document: {
    type: "request",
    request: {
      endpoint: "https://example.com",
      requestVariables: [] as { key: string; value: string; active: boolean }[],
    },
    inheritedProperties: {
      variables: [] as unknown[],
    },
  },
})

const setup = () => {
  activeTab.tab = ref(reactive(requestTab()))

  const dispatch = vi.fn()
  new HoppEnvironmentPlugin(
    () => {},
    ref({ dispatch } as unknown as EditorView)
  )
  dispatch.mockClear()

  return { dispatch, document: activeTab.tab.value.document }
}

describe("HoppEnvironmentPlugin", () => {
  test("leaves the editor alone when other parts of the tab change", async () => {
    const { dispatch, document } = setup()

    document.request.endpoint = "https://example.com/path"
    await nextTick()

    expect(dispatch).not.toHaveBeenCalled()
  })

  test("updates the editor when the request variables change", async () => {
    const { dispatch, document } = setup()

    document.request.requestVariables.push({
      key: "foo",
      value: "bar",
      active: true,
    })
    await nextTick()

    expect(dispatch).toHaveBeenCalledOnce()
  })

  test("updates the editor when the collection variables change", async () => {
    const { dispatch, document } = setup()

    document.inheritedProperties.variables = [
      {
        parentID: "collection",
        parentName: "Collection",
        inheritedVariables: [],
      },
    ]
    await nextTick()

    expect(dispatch).toHaveBeenCalledOnce()
  })

  test("updates the editor when the active tab changes", async () => {
    const { dispatch } = setup()

    activeTab.tab.value = reactive(requestTab())
    await nextTick()

    expect(dispatch).toHaveBeenCalledOnce()
  })
})

describe("environmentHighlightStyle", () => {
  test("stops highlighting a variable that a change on another line comments out", () => {
    const view = new EditorView({
      parent: document.body,
      state: EditorState.create({
        doc: ["a;", "<<foo>>", "b;"].join("\n"),
        extensions: [javascript(), environmentHighlightStyle([])],
      }),
    })
    const highlights = () => view.contentDOM.querySelectorAll(".env-highlight")

    expect(highlights()).toHaveLength(1)

    view.dispatch({ changes: { from: view.state.doc.length, insert: "*/" } })
    view.dispatch({ changes: { from: 0, insert: "/*" } })

    expect(highlights()).toHaveLength(0)

    view.destroy()
  })
})
