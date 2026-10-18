import * as E from "fp-ts/Either"
import { describe, expect, it } from "vitest"

import { hoppPostmanImporter } from "../postman"

/**
 * Postman exports a URL with its path segments percent-encoded, so a collection
 * using `{{var}}` in the path arrives as `%7B%7Bvar%7D%7D`. The SDK's
 * `toString()` passes that through verbatim, and Hoppscotch's variable
 * templating never matches it (#6140).
 *
 * Decoding the whole URL fixes that and breaks something else: every other
 * non-reserved escape is decoded too, which changes which resource the imported
 * request addresses. These cases pin both halves, so neither can regress into
 * the other.
 */
const importURL = async (rawURL: string) => {
  const collection = {
    info: {
      name: "URL encoding",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [{ name: "req", request: { method: "GET", url: rawURL } }],
  }

  const result = await hoppPostmanImporter([JSON.stringify(collection)])()
  if (E.isLeft(result)) throw new Error(`importer failed: ${result.left}`)

  return result.right[0].requests[0].endpoint
}

describe("postman import — URL percent-encoding", () => {
  it("recognises a variable the export encoded (#6140)", async () => {
    // Hoppscotch's own syntax is <<var>>, which replacePMVarTemplating produces
    // from {{var}} -- so the braces have to be decoded first or the variable is
    // imported as literal %7B%7B text.
    expect(
      await importURL("https://example.com/v1/%7B%7BuserId%7D%7D/orders")
    ).toBe("https://example.com/v1/<<userId>>/orders")
  })

  it("leaves an encoded percent alone, so the request still addresses the same resource", async () => {
    // `a%252Fb` is the literal text "a%2Fb". Decoding it to "a%2Fb" makes the
    // sender read an encoded slash, and the imported request reaches a
    // different resource than the original.
    expect(await importURL("https://example.com/files/a%252Fb")).toBe(
      "https://example.com/files/a%252Fb"
    )
  })

  it("leaves an encoded space alone", async () => {
    expect(await importURL("https://example.com/a%20b/c")).toBe(
      "https://example.com/a%20b/c"
    )
  })

  it("handles a variable and an encoded percent in the same URL", async () => {
    expect(
      await importURL("https://example.com/%7B%7Benv%7D%7D/a%252Fb")
    ).toBe("https://example.com/<<env>>/a%252Fb")
  })

  it("leaves an unencoded variable as it already worked", async () => {
    expect(await importURL("https://example.com/v1/{{userId}}")).toBe(
      "https://example.com/v1/<<userId>>"
    )
  })

  it("leaves a lone encoded brace alone", async () => {
    // Decoding the delimiters independently turned this into "/x/}}", which
    // replacePMVarTemplating then rewrote to "/x/>>".
    expect(await importURL("https://example.com/x/%7D%7D")).toBe(
      "https://example.com/x/%7D%7D"
    )
    expect(await importURL("https://example.com/x/%7B%7B")).toBe(
      "https://example.com/x/%7B%7B"
    )
  })

  it("accepts lowercase escapes, which the regex's `i` flag is there for", async () => {
    expect(await importURL("https://example.com/v1/%7b%7buserId%7d%7d")).toBe(
      "https://example.com/v1/<<userId>>"
    )
  })

  it("still strips the query string", async () => {
    expect(await importURL("https://example.com/p?a=1&b=2")).toBe(
      "https://example.com/p"
    )
  })
})
