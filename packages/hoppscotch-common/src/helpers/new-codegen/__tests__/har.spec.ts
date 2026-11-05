import { HoppRESTRequest, rawKeyValueEntriesToString } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { buildHarRequest } from "../har"

const urlEncodedRequest = (body: string): HoppRESTRequest => ({
  ...getDefaultRESTRequest(),
  method: "POST",
  body: {
    contentType: "application/x-www-form-urlencoded",
    body,
  },
})

describe("buildHarRequest", () => {
  test("reads URL-encoded bodies in the raw key-value format the editor stores", () => {
    // The editor quotes values that contain ":" or "#" and keeps disabled
    // pairs as commented `# key: value` lines
    const body = rawKeyValueEntriesToString([
      { key: "grant_type", value: "client_credentials", active: true },
      { key: "scope", value: "access:user", active: true },
      { key: "debug", value: "true", active: false },
    ])

    expect(buildHarRequest(urlEncodedRequest(body)).postData.params).toEqual([
      { name: "grant_type", value: "client_credentials" },
      { name: "scope", value: "access:user" },
    ])
  })

  test("skips blank lines and pairs without a key in URL-encoded bodies", () => {
    const body = "a: 1\n\n: orphan\nb: 2\n"

    expect(buildHarRequest(urlEncodedRequest(body)).postData.params).toEqual([
      { name: "a", value: "1" },
      { name: "b", value: "2" },
    ])
  })
})
