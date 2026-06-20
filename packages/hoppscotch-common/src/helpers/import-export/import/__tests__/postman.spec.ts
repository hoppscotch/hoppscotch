import { describe, expect, it } from "vitest"

import { replacePMVarTemplating } from "../postman"

describe("replacePMVarTemplating", () => {
  it("converts matched Postman variable templates to Hoppscotch templates", () => {
    expect(replacePMVarTemplating("{{baseUrl}}/users/{{ userId }}")).toBe(
      "<<baseUrl>>/users/<<userId>>"
    )
  })

  it("preserves unmatched closing Postman template delimiters", () => {
    expect(replacePMVarTemplating('{ "literal": "}}" }')).toBe(
      '{ "literal": "}}" }'
    )
  })

  it("does not let unmatched closing delimiters affect later valid variables", () => {
    expect(replacePMVarTemplating('body }} then {{variable}}')).toBe(
      'body }} then <<variable>>'
    )
  })
})
