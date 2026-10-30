import { describe, expect, it } from "vitest"
import { buildHtmlPreviewSrcdoc } from "../htmlPreview"

describe("buildHtmlPreviewSrcdoc", () => {
  it("injects a light color-scheme so dark app themes do not hide unstyled HTML", () => {
    const srcdoc = buildHtmlPreviewSrcdoc("<p>Hello</p>")
    const doc = new DOMParser().parseFromString(srcdoc, "text/html")
    const meta = doc.querySelector("meta[name='color-scheme']")

    expect(meta?.getAttribute("content")).toBe("light")
    expect(doc.body.textContent).toContain("Hello")
  })

  it("does not override a color-scheme declared by the response HTML", () => {
    const srcdoc = buildHtmlPreviewSrcdoc(
      '<html><head><meta name="color-scheme" content="dark"></head><body>Hi</body></html>'
    )
    const doc = new DOMParser().parseFromString(srcdoc, "text/html")
    const metas = Array.from(doc.querySelectorAll("meta[name='color-scheme']"))

    expect(metas).toHaveLength(1)
    expect(metas[0].getAttribute("content")).toBe("dark")
  })

  it("treats color-scheme meta names case-insensitively", () => {
    const srcdoc = buildHtmlPreviewSrcdoc(
      '<html><head><meta name="Color-Scheme" content="only dark"></head><body></body></html>'
    )
    const doc = new DOMParser().parseFromString(srcdoc, "text/html")
    const contents = Array.from(doc.querySelectorAll("meta"))
      .filter(
        (el) => el.getAttribute("name")?.trim().toLowerCase() === "color-scheme"
      )
      .map((el) => el.getAttribute("content"))

    expect(contents).toEqual(["only dark"])
  })

  it("injects a base href for relative assets", () => {
    const srcdoc = buildHtmlPreviewSrcdoc(
      "<p>x</p>",
      "https://example.com/app/"
    )
    const doc = new DOMParser().parseFromString(srcdoc, "text/html")

    expect(doc.querySelector("base")?.getAttribute("href")).toBe(
      "https://example.com/app/"
    )
  })

  it("preserves existing head tags", () => {
    const srcdoc = buildHtmlPreviewSrcdoc(
      "<html><head><title>Doc</title></head><body></body></html>"
    )
    const doc = new DOMParser().parseFromString(srcdoc, "text/html")

    expect(doc.title).toBe("Doc")
    expect(doc.querySelector("meta[name='color-scheme']")).not.toBeNull()
  })
})
