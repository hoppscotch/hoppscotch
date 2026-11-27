import { describe, expect, it } from "vitest"
import { toFormData } from "../functional/formData"

const serializeMultipart = async (formData: FormData) => {
  const request = new Request("https://example.com/upload", {
    method: "POST",
    body: formData,
  })

  return {
    contentType: request.headers.get("content-type") ?? "",
    body: await request.text(),
  }
}

describe("toFormData", () => {
  it("does not use the field key as filename for text fields with a manually set content type", async () => {
    const formData = toFormData([
      {
        key: "json",
        value: '{"foo": "bar"}',
        contentType: "application/json",
      },
      { key: "text", value: "plain text", contentType: "text/plain" },
    ])

    const jsonEntry = formData.get("json")
    expect(jsonEntry).toBeInstanceOf(Blob)
    expect((jsonEntry as Blob).type).toBe("application/json")
    expect(jsonEntry instanceof File ? jsonEntry.name : null).not.toBe("json")

    const { contentType, body } = await serializeMultipart(formData)

    expect(contentType).toContain("multipart/form-data; boundary=")
    expect(body).not.toContain('filename="json"')
    expect(body).not.toContain('filename="text"')
    expect(body).toContain("Content-Type: application/json")
    expect(body).toContain("Content-Type: text/plain")
  })

  it("keeps plain text fields as text entries", async () => {
    const formData = toFormData([{ key: "auto", value: "auto text" }])

    expect(formData.get("auto")).toBe("auto text")

    const { body } = await serializeMultipart(formData)

    expect(body).toContain('Content-Disposition: form-data; name="auto"')
    expect(body).not.toContain("filename=")
    expect(body).toContain("auto text")
  })

  it("preserves the original filename for file fields", () => {
    const file = new File(["fake-png"], "img.png", { type: "image/png" })

    const formData = toFormData([{ key: "file", value: file }])

    const entry = formData.get("file")
    expect(entry).toBeInstanceOf(File)
    expect((entry as File).name).toBe("img.png")
    expect((entry as File).type).toBe("image/png")
  })

  it("preserves the filename when a file field has a content type override", () => {
    const file = new File(["fake-png"], "img.png", { type: "image/png" })

    const formData = toFormData([
      { key: "file", value: file, contentType: "image/jpeg", isFile: true },
    ])

    const entry = formData.get("file")
    expect(entry).toBeInstanceOf(File)
    expect((entry as File).name).toBe("img.png")
    expect((entry as File).type).toBe("image/jpeg")
  })
})
