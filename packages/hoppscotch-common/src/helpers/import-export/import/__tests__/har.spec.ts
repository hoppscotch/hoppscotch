import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { harImporter } from "../har"

const buildHar = (postData: {
  mimeType: string
  text?: string
  params?: Array<{
    name: string
    value?: string
    fileName?: string
  }>
}) =>
  JSON.stringify({
    log: {
      entries: [
        {
          request: {
            method: "POST",
            url: "https://api.example.com/login",
            httpVersion: "HTTP/1.1",
            cookies: [],
            headers: [],
            queryString: [],
            headersSize: -1,
            bodySize: -1,
            postData,
          },
        },
      ],
    },
  })

describe("harImporter — mimeType parameters", () => {
  it("treats application/json; charset=utf-8 as JSON (not text/plain)", () => {
    const result = harImporter([
      buildHar({
        mimeType: "application/json; charset=utf-8",
        text: '{"user":"ada"}',
      }),
    ])

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right[0].requests[0].body).toEqual({
      contentType: "application/json",
      body: '{"user":"ada"}',
    })
  })

  it("parses application/x-www-form-urlencoded; charset=UTF-8 as form fields", () => {
    const result = harImporter([
      buildHar({
        mimeType: "application/x-www-form-urlencoded; charset=UTF-8",
        text: "a=1&b=2",
      }),
    ])

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right[0].requests[0].body).toEqual({
      contentType: "application/x-www-form-urlencoded",
      body: "a:1\nb:2",
    })
  })

  it("still accepts multipart/form-data with a boundary parameter", () => {
    const result = harImporter([
      buildHar({
        mimeType:
          "multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW",
        params: [
          { name: "file", fileName: "readme.txt" },
          { name: "note", value: "hello" },
        ],
      }),
    ])

    expect(E.isRight(result)).toBe(true)
    if (E.isLeft(result)) return

    expect(result.right[0].requests[0].body).toEqual({
      contentType: "multipart/form-data",
      body: [
        {
          active: true,
          isFile: true,
          key: "file",
          value: [],
        },
        {
          active: true,
          isFile: false,
          key: "note",
          value: "hello",
        },
      ],
    })
  })
})
