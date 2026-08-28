import { describe, expect, test } from "vitest"

import {
  getContentDispositionFilename,
  getSuggestedFilename,
  parseContentDisposition,
  parseContentDispositionFilename,
} from "../contentDisposition"

describe("parseContentDisposition", () => {
  test("extracts the disposition type", () => {
    expect(parseContentDisposition("attachment").type).toBe("attachment")
    expect(parseContentDisposition("inline").type).toBe("inline")
  })

  test("lowercases the disposition type and parameter names", () => {
    const parsed = parseContentDisposition('ATTACHMENT; FileName="report.pdf"')

    expect(parsed.type).toBe("attachment")
    expect(parsed.parameters).toHaveProperty("filename", "report.pdf")
  })

  test("exposes non-filename parameters", () => {
    const parsed = parseContentDisposition(
      'attachment; filename="a.txt"; size=1234; creation-date="Wed, 12 Feb 1997 16:29:51 -0500"'
    )

    expect(parsed.parameters.size).toBe("1234")
    expect(parsed.parameters["creation-date"]).toBe(
      "Wed, 12 Feb 1997 16:29:51 -0500"
    )
  })
})

describe("parseContentDispositionFilename", () => {
  describe("standard filenames", () => {
    test("parses a quoted filename", () => {
      expect(
        parseContentDispositionFilename('attachment; filename="report.pdf"')
      ).toBe("report.pdf")
    })

    test("parses an unquoted token filename", () => {
      expect(
        parseContentDispositionFilename("attachment; filename=report.pdf")
      ).toBe("report.pdf")
    })

    test("parses a filename on an inline disposition", () => {
      expect(
        parseContentDispositionFilename('inline; filename="preview.png"')
      ).toBe("preview.png")
    })

    test("trims surrounding whitespace around the parameter and value", () => {
      expect(
        parseContentDispositionFilename(
          '  attachment ;   filename =  "  spaced.txt  "  '
        )
      ).toBe("spaced.txt")
    })

    test("is case insensitive for the parameter name", () => {
      expect(
        parseContentDispositionFilename('attachment; FILENAME="data.csv"')
      ).toBe("data.csv")
    })

    test("keeps semicolons that appear inside a quoted filename", () => {
      expect(
        parseContentDispositionFilename('attachment; filename="a;b.txt"')
      ).toBe("a;b.txt")
    })

    test("keeps spaces inside a quoted filename", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="quarterly report.xlsx"'
        )
      ).toBe("quarterly report.xlsx")
    })

    test("resolves backslash escapes inside a quoted filename", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="an \\"escaped\\" name.txt"'
        )
      ).toBe('an "escaped" name.txt')
    })

    test("preserves multi-dot filenames and their extension", () => {
      expect(
        parseContentDispositionFilename('attachment; filename="archive.tar.gz"')
      ).toBe("archive.tar.gz")
    })

    test("takes the first occurrence when a parameter is duplicated", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="first.txt"; filename="second.txt"'
        )
      ).toBe("first.txt")
    })
  })

  describe("RFC 5987/6266 encoded filenames", () => {
    test("decodes a UTF-8 percent-encoded filename", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=UTF-8''%E2%82%AC%20rates.txt"
        )
      ).toBe("€ rates.txt")
    })

    test("decodes a filename with a language tag", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=UTF-8'en'%C2%A3%20and%20%E2%82%AC%20rates.txt"
        )
      ).toBe("£ and € rates.txt")
    })

    test("is case insensitive for the charset", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=utf-8''na%C3%AFve.pdf"
        )
      ).toBe("naïve.pdf")
    })

    test("decodes CJK filenames", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=UTF-8''%E6%8A%A5%E5%91%8A.pdf"
        )
      ).toBe("报告.pdf")
    })

    test("decodes ISO-8859-1 percent-encoded filenames", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=ISO-8859-1''r%E9sum%E9.txt"
        )
      ).toBe("résumé.txt")
    })

    test("prefers `filename*` over `filename` regardless of ordering", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename=\"fallback.txt\"; filename*=UTF-8''%E2%82%AC.txt"
        )
      ).toBe("€.txt")

      expect(
        parseContentDispositionFilename(
          "attachment; filename*=UTF-8''%E2%82%AC.txt; filename=\"fallback.txt\""
        )
      ).toBe("€.txt")
    })

    test("falls back to `filename` when `filename*` uses an unsupported charset", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename=\"fallback.txt\"; filename*=Shift_JIS''%95%f1%8d%90.txt"
        )
      ).toBe("fallback.txt")
    })

    test("falls back to `filename` when `filename*` has malformed percent escapes", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename=\"fallback.txt\"; filename*=UTF-8''%E0%A4%A.txt"
        )
      ).toBe("fallback.txt")
    })

    test("falls back to `filename` when an ISO-8859-1 `filename*` has malformed percent escapes", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename=\"fallback.txt\"; filename*=ISO-8859-1''r%E9sum%E9%.txt"
        )
      ).toBe("fallback.txt")
    })

    test("returns null when only a malformed ISO-8859-1 `filename*` is present", () => {
      expect(
        parseContentDispositionFilename(
          "attachment; filename*=ISO-8859-1''r%E9sum%E9%.txt"
        )
      ).toBeNull()

      expect(
        parseContentDispositionFilename("attachment; filename*=ISO-8859-1''%ZZ")
      ).toBeNull()
    })

    test("falls back to `filename` when `filename*` is missing its charset delimiters", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="fallback.txt"; filename*=broken.txt'
        )
      ).toBe("fallback.txt")
    })

    test("returns null when only a malformed `filename*` is present", () => {
      expect(
        parseContentDispositionFilename("attachment; filename*=UTF-8''%%%")
      ).toBeNull()
    })
  })

  describe("sanitization", () => {
    test("strips POSIX path components", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="/etc/passwd/secret.txt"'
        )
      ).toBe("secret.txt")
    })

    test("strips Windows path components", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="C:\\\\temp\\\\report.pdf"'
        )
      ).toBe("report.pdf")
    })

    test("strips traversal segments", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="../../../evil.sh"'
        )
      ).toBe("evil.sh")
    })

    test("rejects a filename that is only traversal segments", () => {
      expect(
        parseContentDispositionFilename('attachment; filename="../../"')
      ).toBeNull()
      expect(
        parseContentDispositionFilename('attachment; filename="."')
      ).toBeNull()
    })

    test("removes control characters", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; filename="re\u0000port\u001F.pdf"'
        )
      ).toBe("report.pdf")
    })

    test("rejects an empty filename", () => {
      expect(
        parseContentDispositionFilename('attachment; filename=""')
      ).toBeNull()
      expect(
        parseContentDispositionFilename('attachment; filename="   "')
      ).toBeNull()
    })
  })

  describe("fallback and malformed inputs", () => {
    test.each([
      ["null", null],
      ["undefined", undefined],
      ["empty string", ""],
      ["whitespace only", "   "],
    ])("returns null for %s", (_label, input) => {
      expect(parseContentDispositionFilename(input)).toBeNull()
    })

    test("returns null when there is no filename parameter", () => {
      expect(parseContentDispositionFilename("attachment")).toBeNull()
      expect(parseContentDispositionFilename("inline")).toBeNull()
      expect(
        parseContentDispositionFilename('form-data; name="field"')
      ).toBeNull()
    })

    test("returns null for a bare parameter with no value", () => {
      expect(parseContentDispositionFilename("attachment; filename")).toBeNull()
    })

    test("ignores stray separators and empty segments", () => {
      expect(
        parseContentDispositionFilename(
          'attachment;;; ; filename="report.pdf";'
        )
      ).toBe("report.pdf")
    })

    test("tolerates an unterminated quoted string", () => {
      expect(
        parseContentDispositionFilename('attachment; filename="report.pdf')
      ).toBe("report.pdf")
    })

    test("tolerates a missing disposition type", () => {
      expect(parseContentDispositionFilename('; filename="report.pdf"')).toBe(
        "report.pdf"
      )
    })

    test("does not confuse `filename` with similarly named parameters", () => {
      expect(
        parseContentDispositionFilename(
          'attachment; not-filename="decoy.txt"; x-filename="decoy2.txt"'
        )
      ).toBeNull()
    })

    test("handles a value containing `=` characters", () => {
      expect(
        parseContentDispositionFilename('attachment; filename="a=b=c.txt"')
      ).toBe("a=b=c.txt")
    })
  })
})

describe("getContentDispositionFilename", () => {
  test("finds the header case insensitively", () => {
    expect(
      getContentDispositionFilename([
        { key: "Content-Type", value: "application/pdf" },
        { key: "content-disposition", value: 'attachment; filename="a.pdf"' },
      ])
    ).toBe("a.pdf")

    expect(
      getContentDispositionFilename([
        { key: "CONTENT-DISPOSITION", value: 'attachment; filename="b.pdf"' },
      ])
    ).toBe("b.pdf")
  })

  test("ignores surrounding whitespace in the header key", () => {
    expect(
      getContentDispositionFilename([
        { key: " Content-Disposition ", value: 'attachment; filename="c.pdf"' },
      ])
    ).toBe("c.pdf")
  })

  test("returns null when the header is absent", () => {
    expect(
      getContentDispositionFilename([
        { key: "Content-Type", value: "application/json" },
      ])
    ).toBeNull()
  })

  test("returns null for missing or non-array header lists", () => {
    expect(getContentDispositionFilename(undefined)).toBeNull()
    expect(getContentDispositionFilename(null)).toBeNull()
    expect(getContentDispositionFilename([])).toBeNull()
  })
})

describe("getSuggestedFilename", () => {
  test("prefers the server suggested filename", () => {
    expect(
      getSuggestedFilename(
        [
          {
            key: "Content-Disposition",
            value: "attachment; filename*=UTF-8''%E6%8A%A5%E5%91%8A.pdf",
          },
        ],
        "My Request - response"
      )
    ).toBe("报告.pdf")
  })

  test("falls back when no usable filename is suggested", () => {
    expect(
      getSuggestedFilename(
        [{ key: "Content-Disposition", value: "attachment" }],
        "My Request - response"
      )
    ).toBe("My Request - response")

    expect(getSuggestedFilename(undefined, "My Request - response")).toBe(
      "My Request - response"
    )
  })
})
