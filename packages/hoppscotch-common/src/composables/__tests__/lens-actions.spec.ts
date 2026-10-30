import { describe, expect, it } from "vitest"

import { createPreviewDocument } from "../lens-actions"

describe("createPreviewDocument", () => {
  it("preserves the response document while forcing a light color scheme", () => {
    const previewDocument = createPreviewDocument(
      '<!doctype html><html><head><style>.response { color: red; }</style></head><body><div class="response">Response</div></body></html>',
      "https://example.com/api/"
    )

    expect(
      previewDocument.head.querySelector("base")?.getAttribute("href")
    ).toBe("https://example.com/api/")
    expect(previewDocument.head.textContent).toContain(
      ":root { color-scheme: only light; }"
    )
    expect(previewDocument.head.textContent).toContain(
      ".response { color: red; }"
    )
    expect(previewDocument.body.innerHTML).toContain(
      '<div class="response">Response</div>'
    )
    expect(previewDocument.doctype?.name).toBe("html")
  })
})
