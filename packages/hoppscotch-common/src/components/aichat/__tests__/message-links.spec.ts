import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createApp, nextTick, type App } from "vue"

const { kernel, openExternalLink } = vi.hoisted(() => ({
  kernel: { mode: "desktop" as "desktop" | "web" },
  openExternalLink: vi.fn(async () => ({ type: "opened" as const })),
}))

vi.mock("~/composables/i18n", () => ({ useI18n: () => (x: string) => x }))
vi.mock("@hoppscotch/kernel", () => ({ getKernelMode: () => kernel.mode }))
vi.mock("~/platform", () => ({
  platform: { kernelIO: { openExternalLink } },
}))

import Message from "~/components/aichat/Message.vue"
import type { ChatMessage } from "~/services/ai-chat.service"

const REPLY = [
  "See the [docs](https://docs.hoppscotch.io/documentation) or",
  "<https://example.com/a> and the [section](#auth).",
].join(" ")

describe("chat reply links", () => {
  let app: App | null = null
  let el: HTMLElement | null = null

  beforeEach(() => {
    openExternalLink.mockClear()
  })

  afterEach(() => {
    app?.unmount()
    el?.remove()
  })

  const mount = async (message: Partial<ChatMessage>) => {
    el = document.body.appendChild(document.createElement("div"))
    app = createApp(Message, {
      message: { id: "m", role: "assistant", content: REPLY, ...message },
    })
    app.mount(el)
    await nextTick()
  }

  const click = (text: string) => {
    const anchor = [...el!.querySelectorAll("a")].find(
      (a) => a.textContent === text
    )!
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
    })
    anchor.dispatchEvent(event)
    return event
  }

  it("opens a reply link through the external opener on desktop", async () => {
    kernel.mode = "desktop"
    await mount({})
    const event = click("docs")

    expect(event.defaultPrevented).toBe(true)
    expect(openExternalLink).toHaveBeenCalledExactlyOnceWith({
      url: "https://docs.hoppscotch.io/documentation",
    })
  })

  it("opens a linkified URL on desktop", async () => {
    kernel.mode = "desktop"
    await mount({})
    click("https://example.com/a")

    expect(openExternalLink).toHaveBeenCalledExactlyOnceWith({
      url: "https://example.com/a",
    })
  })

  it("opens a link in a step line on desktop", async () => {
    kernel.mode = "desktop"
    await mount({
      kind: "tool",
      content: "✓ Published [the docs](https://hopp.sh/d/abc).",
    })
    click("the docs")

    expect(openExternalLink).toHaveBeenCalledExactlyOnceWith({
      url: "https://hopp.sh/d/abc",
    })
  })

  it("leaves an in-page link alone on desktop", async () => {
    kernel.mode = "desktop"
    await mount({})
    const event = click("section")

    expect(event.defaultPrevented).toBe(false)
    expect(openExternalLink).not.toHaveBeenCalled()
  })

  it("keeps the browser's new-tab handling on the web", async () => {
    kernel.mode = "web"
    await mount({})
    const anchor = [...el!.querySelectorAll("a")].find(
      (a) => a.textContent === "docs"
    )!
    const event = click("docs")

    expect(event.defaultPrevented).toBe(false)
    expect(openExternalLink).not.toHaveBeenCalled()
    expect(anchor.getAttribute("target")).toBe("_blank")
    expect(anchor.getAttribute("rel")).toBe("noopener noreferrer")
  })
})
