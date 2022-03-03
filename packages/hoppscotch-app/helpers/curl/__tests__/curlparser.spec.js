import { makeRESTRequest, rawKeyValueEntriesToString } from "@hoppscotch/data"
import { parseCurlToHoppRESTReq } from ".."

const samples = [
  {
    command: `
      curl --request GET \
      --url https://echo.hoppscotch.io/ \
      --header 'content-type: application/x-www-form-urlencoded' \
      --data a=b \
      --data c=d
    `,
    response: makeRESTRequest({
      method: "GET",
      name: "Untitled Request",
      endpoint: "https://echo.hoppscotch.io",
      auth: { authType: "none" },
      body: {
        contentType: "application/x-www-form-urlencoded",
        body: rawKeyValueEntriesToString([
          {
            active: true,
            key: "a",
            value: "b",
          },
          {
            active: true,
            key: "c",
            value: "d",
          },
        ]),
      },
      headers: [],
      params: [],
      preRequestScript: "",
      testScript: "",
    }),
  },
]

describe("parseCurlToHoppRESTReq", () => {
  test("matches expectations for given samples", () => {
    for (const { command, response } of samples) {
      expect(parseCurlToHoppRESTReq(command)).toEqual(response)
    }
  })
})
