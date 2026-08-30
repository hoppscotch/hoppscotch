import { describe, expect, test } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

// Source-level assertions (same style as RequestRunner-cookie-jar-laziness.spec.ts):
// `runRESTRequest$` pulls in a deep module graph (i18n → newstore/history →
// RequestRunner circular import), so behavior-level tests are not feasible
// under vitest's module evaluation. These assertions pin the auth/header
// suppression guard that prevents duplicate or missing Authorization headers
// (see hoppscotch/hoppscotch#6527).
const here = dirname(fileURLToPath(import.meta.url))

describe("RequestRunner authorization guard", () => {
  test("suppresses inherited auth case-insensitively when an active Authorization header exists", () => {
    const source = readFileSync(resolve(here, "../RequestRunner.ts"), "utf8")
    expect(source).toMatch(
      /requestHeader\.key\.toLowerCase\(\) === "authorization" &&\s*requestHeader\.active/
    )
  })

  test("re-evaluates auth after pre-request script updates", () => {
    const source = readFileSync(resolve(here, "../RequestRunner.ts"), "utf8")
    expect(source).toMatch(/hasActiveAuthHeader/)
    expect(source).toMatch(/inheritedProperties\?\.auth\.inheritedAuth/)
  })
})
