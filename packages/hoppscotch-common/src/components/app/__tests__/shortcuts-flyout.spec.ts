/* eslint-disable vue/one-component-per-file */
import { afterEach, describe, expect, it, vi } from "vitest"
import { createApp, defineComponent, h, nextTick, type App } from "vue"

vi.mock("@composables/i18n", () => ({ useI18n: () => (x: string) => x }))
vi.mock("@hoppscotch/kernel", () => ({ getKernelMode: () => "web" }))

import Flyout from "~/components/app/Shortcuts.vue"
import { bindAction, unbindAction } from "~/helpers/actions"

const Empty = defineComponent({ render: () => null })

const stubs = {
  HoppSmartSlideOver: defineComponent({
    setup:
      (_, { slots }) =>
      () =>
        h("div", slots.content?.()),
  }),
  HoppSmartInput: defineComponent({
    props: { modelValue: { type: String, default: "" } },
    emits: ["update:modelValue"],
    setup:
      (props, { emit }) =>
      () =>
        h("input", {
          value: props.modelValue,
          onInput: (e: Event) =>
            emit("update:modelValue", (e.target as HTMLInputElement).value),
        }),
  }),
  HoppSmartPlaceholder: Empty,
  AppShortcutsEntry: defineComponent({
    props: { shortcut: { type: Object, required: true } },
    setup: (props) => () => h("p", props.shortcut.label),
  }),
  IconLucideChevronRight: Empty,
  IconLucideSearch: Empty,
}

const SWITCH = "shortcut.tabs.switch_protocol"

describe("shortcuts flyout", () => {
  let app: App | null = null
  let el: HTMLElement | null = null

  afterEach(() => {
    app?.unmount()
    el?.remove()
  })

  const mount = async () => {
    el = document.body.appendChild(document.createElement("div"))
    app = createApp(Flyout, { show: true })
    for (const [name, c] of Object.entries(stubs)) app.component(name, c)
    app.mount(el)
    // The search index fills asynchronously.
    await new Promise((r) => setTimeout(r, 50))
  }

  const text = () => el?.textContent ?? ""

  const search = async (value: string) => {
    const input = el!.querySelector("input")!
    input.value = value
    input.dispatchEvent(new Event("input"))
    await nextTick()
  }

  it("lists the protocol switch only while a view handles it", async () => {
    await mount()
    expect(text()).not.toContain(SWITCH)
    expect(text()).toContain("shortcut.general.help_menu")

    const handler = () => {}
    bindAction("tab.switch-protocol", handler)
    await nextTick()
    expect(text()).toContain(SWITCH)

    await search("switch")
    expect(text()).toContain(SWITCH)

    unbindAction("tab.switch-protocol", handler)
    await nextTick()
    expect(text()).not.toContain(SWITCH)
  })

  it("keeps it out of search results while unhandled", async () => {
    await mount()
    await search("switch")
    expect(text()).not.toContain(SWITCH)
  })
})
