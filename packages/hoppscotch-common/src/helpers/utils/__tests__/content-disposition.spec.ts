import { describe, test, expect } from "vitest"

import {
  filenameFromResponseHeaders,
  parseContentDisposition,
} from "../content-disposition"

// The Content-Disposition header is one of the messier bits of the HTTP spec —
// RFC 6266 layers on top of RFC 2183, and RFC 5987 adds a `filename*` variant
// for non-ASCII names. Servers also send all sorts of slightly-wrong values in
// the wild, so these tests cover both the strict spec examples and the broken
// shapes we have to be lenient about.
describe("parseContentDisposition", () => {
  test("returns empty result for a null or empty header", () => {
    expect(parseContentDisposition(null)).toEqual({ type: "", filename: null })
    expect(parseContentDisposition(undefined)).toEqual({
      type: "",
      filename: null,
    })
    expect(parseContentDisposition("")).toEqual({ type: "", filename: null })
  })

  test("parses a bare disposition type with no filename", () => {
    expect(parseContentDisposition("attachment")).toEqual({
      type: "attachment",
      filename: null,
    })
    expect(parseContentDisposition("inline")).toEqual({
      type: "inline",
      filename: null,
    })
  })

  test("lowercases the disposition type for consistent comparison", () => {
    expect(parseContentDisposition("ATTACHMENT").type).toBe("attachment")
    expect(parseContentDisposition("Attachment; filename=a.txt").type).toBe(
      "attachment"
    )
  })

  test("extracts an unquoted filename", () => {
    expect(
      parseContentDisposition("attachment; filename=report.pdf").filename
    ).toBe("report.pdf")
  })

  test("extracts a quoted filename and strips the surrounding quotes", () => {
    expect(
      parseContentDisposition('attachment; filename="annual report.pdf"')
        .filename
    ).toBe("annual report.pdf")
  })

  test("respects backslash escapes inside a quoted filename", () => {
    // RFC 2616 quoted-string: \" is a literal quote, \\ is a literal backslash
    expect(
      parseContentDisposition('attachment; filename="with\\"quote.pdf"')
        .filename
    ).toBe('with"quote.pdf')
  })

  test("does not split on a semicolon inside a quoted filename", () => {
    expect(
      parseContentDisposition('attachment; filename="a;b.txt"').filename
    ).toBe("a;b.txt")
  })

  test("strips directory components to prevent path traversal", () => {
    // RFC 6266 §4.3 — recipients must not treat path separators as part of
    // the filename. Both POSIX and Windows separators need stripping.
    expect(
      parseContentDisposition('attachment; filename="../../etc/passwd"')
        .filename
    ).toBe("passwd")
    expect(
      parseContentDisposition('attachment; filename="C:\\\\temp\\\\x.txt"')
        .filename
    ).toBe("x.txt")
  })

  test("decodes an RFC 5987 UTF-8 filename", () => {
    // Example straight out of RFC 5987 §3.2.2
    expect(
      parseContentDisposition(
        "attachment; filename*=UTF-8''%E2%82%AC%20rates.txt"
      ).filename
    ).toBe("€ rates.txt")
  })

  test("decodes an RFC 5987 ISO-8859-1 filename", () => {
    expect(
      parseContentDisposition(
        "attachment; filename*=iso-8859-1'en'%A3%20rates.txt"
      ).filename
    ).toBe("£ rates.txt")
  })

  test("prefers filename* over the legacy filename when both are present", () => {
    // Clients that understand filename* are expected to use it — the legacy
    // filename is the ASCII fallback for older UAs.
    const header =
      "attachment; filename=\"fallback.txt\"; filename*=UTF-8''r%C3%A9sum%C3%A9.txt"
    expect(parseContentDisposition(header).filename).toBe("résumé.txt")
  })

  test("falls back to filename when filename* uses an unknown charset", () => {
    const header =
      "attachment; filename=\"fallback.txt\"; filename*=gb2312''abc.txt"
    expect(parseContentDisposition(header).filename).toBe("fallback.txt")
  })

  test("falls back to filename when filename* has malformed percent-encoding", () => {
    const header =
      "attachment; filename=\"fallback.txt\"; filename*=UTF-8''%E2%82"
    expect(parseContentDisposition(header).filename).toBe("fallback.txt")
  })

  test("falls back to filename when ISO-8859-1 filename* has malformed percent-encoding", () => {
    // The Latin-1 branch used to silently pass malformed input through via
    // String.prototype.replace, so a broken filename* would override the
    // legacy filename. Explicitly reject bare `%` (followed by non-hex) and
    // truncated `%X` so the fallback kicks in for both charsets.
    const truncated =
      "attachment; filename=\"fallback.txt\"; filename*=iso-8859-1''%A"
    const nonHex =
      "attachment; filename=\"fallback.txt\"; filename*=iso-8859-1''%ZZ"
    const barePercent =
      "attachment; filename=\"fallback.txt\"; filename*=iso-8859-1''abc%"
    expect(parseContentDisposition(truncated).filename).toBe("fallback.txt")
    expect(parseContentDisposition(nonHex).filename).toBe("fallback.txt")
    expect(parseContentDisposition(barePercent).filename).toBe("fallback.txt")
  })

  test("tolerates extra whitespace around parameters", () => {
    expect(
      parseContentDisposition("attachment ;   filename = report.pdf  ").filename
    ).toBe("report.pdf")
  })

  test("returns null filename when only unrelated parameters are present", () => {
    expect(
      parseContentDisposition(
        'attachment; size=1234; creation-date="Tue, 01 Jan 2026 00:00:00 GMT"'
      ).filename
    ).toBeNull()
  })
})

describe("filenameFromResponseHeaders", () => {
  test("returns null when headers are missing or undefined", () => {
    expect(filenameFromResponseHeaders(undefined)).toBeNull()
    expect(filenameFromResponseHeaders(null)).toBeNull()
    expect(filenameFromResponseHeaders([])).toBeNull()
  })

  test("finds the header regardless of case", () => {
    expect(
      filenameFromResponseHeaders([
        { key: "Content-Type", value: "application/pdf" },
        { key: "content-disposition", value: "attachment; filename=a.pdf" },
      ])
    ).toBe("a.pdf")

    expect(
      filenameFromResponseHeaders([
        { key: "CONTENT-DISPOSITION", value: "attachment; filename=b.pdf" },
      ])
    ).toBe("b.pdf")
  })

  test("returns null when the header is present but carries no filename", () => {
    expect(
      filenameFromResponseHeaders([
        { key: "Content-Disposition", value: "attachment" },
      ])
    ).toBeNull()
  })

  test("returns the filename from the first Content-Disposition header that carries one", () => {
    // Duplicate headers are unusual but legal. When the first header has a
    // filename we stop there so behaviour is deterministic...
    expect(
      filenameFromResponseHeaders([
        { key: "Content-Disposition", value: "attachment; filename=a.pdf" },
        { key: "Content-Disposition", value: "attachment; filename=b.pdf" },
      ])
    ).toBe("a.pdf")
  })

  test("skips Content-Disposition headers that carry no filename", () => {
    // ...but if the first header is a bare `attachment` with no filename,
    // we keep scanning so a later header with a real filename isn't
    // silently dropped.
    expect(
      filenameFromResponseHeaders([
        { key: "Content-Disposition", value: "attachment" },
        { key: "Content-Disposition", value: "attachment; filename=b.pdf" },
      ])
    ).toBe("b.pdf")
  })
})
