/* eslint-disable vue/one-component-per-file */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  type App,
  type Ref,
} from "vue"
import type { LinterDefinition } from "~/helpers/editor/linting/linter"

const editor = vi.hoisted(() => ({
  body: null as Ref<string> | null,
  options: null as {
    linter: LinterDefinition | null
    extendedEditorConfig: { readOnly?: boolean }
  } | null,
  copyBody: null as Ref<string> | null,
  downloadBody: null as Ref<string> | null,
  error: vi.fn(),
}))

vi.mock("@composables/codemirror", async () => {
  const { ref } = await import("vue")
  return {
    useCodemirror: (
      _element: unknown,
      body: NonNullable<typeof editor.body>,
      options: NonNullable<typeof editor.options>
    ) => {
      editor.body = body
      editor.options = options
      return { cursor: ref({ line: 0, ch: 0 }) }
    },
  }
})
vi.mock("@composables/i18n", () => ({
  useI18n: () => (key: string) => key,
}))
vi.mock("@composables/toast", () => ({
  useToast: () => ({ error: editor.error }),
}))
vi.mock("~/composables/settings", async () => {
  const { ref } = await import("vue")
  return { useNestedSetting: () => ref(false) }
})
vi.mock("~/newstore/settings", () => ({ toggleNestedSetting: vi.fn() }))
vi.mock("~/composables/useScrollerRef", async () => {
  const { ref } = await import("vue")
  return { useScrollerRef: () => ({ containerRef: ref(null) }) }
})
vi.mock("~/helpers/actions", () => ({
  defineActionHandler: vi.fn(),
  invokeAction: vi.fn(),
}))
vi.mock("@composables/lens-actions", async () => {
  const { computed, ref } = await import("vue")
  return {
    useResponseBody: (response: { body: string }) => ({
      responseBodyText: computed(() => response.body),
    }),
    useCopyResponse: (body: Ref<string>) => {
      editor.copyBody = body
      return { copyIcon: ref(null), copyResponse: vi.fn() }
    },
    useDownloadResponse: (_contentType: string, body: Ref<string>) => {
      editor.downloadBody = body
      return { downloadIcon: ref(null), downloadResponse: vi.fn() }
    },
  }
})

import RESTResponse from "../JSONLensRenderer.vue"
import GQLResponse from "~/components/gql/example/Response.vue"

const BODY = '{\n// User identifier\n"id":1, "roles":[/* Access */"admin"]\n}'

const mount = (app: App) => {
  app.directive("tippy", {})
  app.component(
    "HoppButtonSecondary",
    defineComponent({
      props: { title: { type: String, default: "" } },
      emits: ["click"],
      setup:
        (props, { emit }) =>
        () =>
          h(
            "button",
            { title: props.title, onClick: () => emit("click") },
            props.title
          ),
    })
  )
  app.component("SmartEnvInput", defineComponent({ render: () => h("input") }))
  const root = document.createElement("div")
  app.mount(root)
  return root
}

describe.each([
  { name: "REST", component: RESTResponse },
  { name: "GraphQL", component: GQLResponse },
])("$name saved response comments", ({ name, component }) => {
  let app: App
  let root: HTMLElement
  let saved: Ref<{ name: string; body: string; code: number; status: string }>

  beforeEach(() => {
    editor.error.mockClear()
    saved = ref({ name: "Example", body: BODY, code: 200, status: "OK" })
    const doc = ref({
      type: "gql-example-response",
      response: saved.value,
      isDirty: false,
    })
    app = createApp({
      setup: () => () =>
        name === "REST"
          ? h(component, {
              response: saved.value,
              isEditable: true,
              isSavable: false,
              tabId: "example",
              "onUpdate:response": (response: typeof saved.value) => {
                saved.value = response
              },
            })
          : h(component, { document: doc.value }),
    })
    root = mount(app)
  })

  afterEach(() => {
    app.unmount()
  })

  it("accepts comments and preserves the original annotated text", async () => {
    expect(editor.body?.value).toBe(BODY)
    expect(await editor.options?.linter?.(BODY)).toEqual([])
    expect(editor.copyBody?.value).toBe(BODY)
    expect(editor.downloadBody?.value).toBe(BODY)
  })

  it("persists edits without stripping comments or reformatting while typing", async () => {
    const edited = BODY.replace('"id":1', '"id":2')
    editor.body!.value = edited
    await nextTick()

    expect(saved.value.body).toBe(edited)
    expect(editor.body?.value).toBe(edited)
    expect(editor.copyBody?.value).toBe(edited)
    expect(editor.downloadBody?.value).toBe(edited)
  })

  it("prettifies without losing annotations", async () => {
    root
      .querySelector<HTMLButtonElement>('button[title="action.prettify"]')!
      .click()
    await nextTick()

    expect(saved.value.body).toContain("// User identifier")
    expect(saved.value.body).toContain("/* Access */")
    expect(saved.value.body).toContain('"id": 1')
    expect(editor.copyBody?.value).toBe(saved.value.body)
    expect(editor.downloadBody?.value).toBe(saved.value.body)
    expect(editor.error).not.toHaveBeenCalled()
  })

  it("reports malformed JSON without modifying the body", async () => {
    editor.body!.value = '{\n// Identifier\n"id":\n}'
    await nextTick()
    const invalid = saved.value.body
    root
      .querySelector<HTMLButtonElement>('button[title="action.prettify"]')!
      .click()
    await nextTick()

    expect(saved.value.body).toBe(invalid)
    expect(editor.error).toHaveBeenCalledWith(
      "error.json_prettify_invalid_body"
    )
  })
})

describe("live REST responses", () => {
  let app: App
  let root: HTMLElement
  const update = vi.fn()

  beforeEach(() => {
    update.mockClear()
    app = createApp(RESTResponse, {
      response: {
        type: "success",
        req: { name: "Live request" },
        body: '{"id":9007199254740993}',
      },
      isEditable: false,
      isSavable: false,
      tabId: "live",
      "onUpdate:response": update,
    })
    root = mount(app)
  })

  afterEach(() => app.unmount())

  it("retains lossless formatting and read-only behavior", () => {
    expect(editor.body?.value).toBe('{\n  "id": 9007199254740993\n}')
    expect(editor.options?.extendedEditorConfig.readOnly).toBe(true)
    expect(editor.options?.linter).toBeNull()
    expect(root.querySelector('button[title="action.prettify"]')).toBeNull()
    expect(editor.copyBody?.value).toBe(editor.body?.value)
    expect(editor.downloadBody?.value).toBe(editor.body?.value)
  })

  it("does not write editor changes back to a live response", () => {
    editor.body!.value = BODY
    expect(update).not.toHaveBeenCalled()
  })
})
