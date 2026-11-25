import { beforeEach, describe, expect, it, vi } from "vitest"
import { openChatLinkExternally } from "../external-links"

/**
 * Renders `html` inside a container bound to the handler, as `Message.vue`
 * binds it on the `.chat-md` element, and returns a click helper.
 */
const mount = (html: string) => {
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)

  const open = vi.fn<(url: string) => void>()
  const handled: boolean[] = []
  container.addEventListener("click", (event) => {
    handled.push(openChatLinkExternally(event, open))
  })

  const click = (selector: string, init: MouseEventInit = {}) => {
    const el = container.querySelector(selector)!
    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      button: 0,
      ...init,
    })
    el.dispatchEvent(event)
    return { event, handled: handled[handled.length - 1] }
  }

  return { container, open, click }
}

beforeEach(() => {
  document.body.innerHTML = ""
})

describe("openChatLinkExternally", () => {
  it("opens an https link and cancels the webview navigation", () => {
    const { open, click } = mount(
      `<p><a href="https://docs.hoppscotch.io/" target="_blank" rel="noopener noreferrer">docs</a></p>`
    )
    const { event, handled } = click("a")

    expect(handled).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(open).toHaveBeenCalledExactlyOnceWith("https://docs.hoppscotch.io/")
  })

  it("opens the link when the click lands on an element inside it", () => {
    const { open, click } = mount(
      `<a href="https://example.com/a"><code>example</code></a>`
    )
    click("code")

    expect(open).toHaveBeenCalledExactlyOnceWith("https://example.com/a")
  })

  it("opens a linkified bare URL, as markdown-it renders it", () => {
    const { open, click } = mount(
      `<p>See <a href="http://example.com" target="_blank">http://example.com</a></p>`
    )
    click("a")

    expect(open).toHaveBeenCalledExactlyOnceWith("http://example.com/")
  })

  it("passes the URL encoded, as the opener expects", () => {
    const { open, click } = mount(
      `<a href="https://example.com/a path?q=1 2#frag">x</a>`
    )
    click("a")

    expect(open).toHaveBeenCalledExactlyOnceWith(
      "https://example.com/a%20path?q=1%202#frag"
    )
  })

  it.each([
    ["an in-page anchor", "#section"],
    ["a relative path", "/docs/getting-started"],
    ["a protocol-relative URL", "//example.com/x"],
    ["a non-web scheme", "ftp://example.com/file"],
    ["a file URL", "file:///etc/hosts"],
    ["a mailto link", "mailto:support@hoppscotch.io"],
  ])("leaves %s to the webview", (_label, href) => {
    const { open, click } = mount(`<a href="${href}">x</a>`)
    const { event, handled } = click("a")

    expect(handled).toBe(false)
    expect(event.defaultPrevented).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })

  it("ignores a click on text outside any link", () => {
    const { open, click } = mount(
      `<p><strong>bold</strong> <a href="https://example.com">x</a></p>`
    )
    const { handled } = click("strong")

    expect(handled).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })

  it("ignores an anchor with no href", () => {
    const { open, click } = mount(`<a name="top">top</a>`)
    const { handled } = click("a")

    expect(handled).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })

  it("ignores a click another handler already cancelled", () => {
    const { container, open, click } = mount(
      `<a href="https://example.com">x</a>`
    )
    container
      .querySelector("a")!
      .addEventListener("click", (e) => e.preventDefault())
    const { handled } = click("a")

    expect(handled).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })

  it("ignores a button other than the primary one", () => {
    const { open, click } = mount(`<a href="https://example.com">x</a>`)
    const { handled } = click("a", { button: 2 })

    expect(handled).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })

  it("ignores a link that wraps the container instead of sitting inside it", () => {
    const outer = document.createElement("a")
    outer.href = "https://outer.example.com"
    const container = document.createElement("div")
    container.innerHTML = `<span>reply text</span>`
    outer.appendChild(container)
    document.body.appendChild(outer)

    const open = vi.fn()
    let handled: boolean | undefined
    container.addEventListener("click", (event) => {
      handled = openChatLinkExternally(event, open)
    })
    container
      .querySelector("span")!
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
      )

    expect(handled).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })
})
