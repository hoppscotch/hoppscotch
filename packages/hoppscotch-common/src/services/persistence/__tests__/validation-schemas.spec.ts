import { GQL_REQ_SCHEMA_VERSION } from "@hoppscotch/data"
import { describe, expect, it } from "vitest"

import { WORKSPACE_TABS_STATE_SCHEMA } from "../validation-schemas"

const originalRequest = {
  v: "1",
  name: "Stamped GQL",
  url: "https://echo.hoppscotch.io/graphql",
  headers: [],
  query: "query Hello { method }",
  variables: "{}",
  auth: { authType: "none", authActive: true },
}

const example = (stamps: Record<string, string | null>) => ({
  name: "example",
  code: 200,
  status: "OK",
  headers: [],
  body: "{}",
  originalRequest,
  ...stamps,
})

describe("WORKSPACE_TABS_STATE_SCHEMA — gql-request branch", () => {
  it("round-trips a gql-request doc with scripts, stamped examples, and the new option tabs", () => {
    const state = {
      lastActiveTabID: "gql-tab-1",
      orderedDocs: [
        {
          tabID: "gql-tab-1",
          doc: {
            type: "gql-request",
            request: {
              v: GQL_REQ_SCHEMA_VERSION,
              name: "Stamped GQL",
              url: "https://echo.hoppscotch.io/graphql",
              headers: [],
              query: "query Hello { method }",
              variables: "{}",
              auth: { authType: "none", authActive: true },
              description: null,
              responses: {
                exact: example({
                  operationName: "Hello",
                  operationType: "query",
                }),
                // Wildcard stamp — the mock server canonicalizes it as null;
                // a null stamp must parse, not wipe the responses record
                wildcard: example({
                  operationName: null,
                  operationType: "query",
                }),
              },
              preRequestScript: 'pw.env.set("a", "b")',
              testScript: 'pw.test("t", () => {})',
            },
            isDirty: false,
            optionTabPreference: "tests",
            testResults: null,
            response: null,
          },
        },
      ],
    }

    const result = WORKSPACE_TABS_STATE_SCHEMA.safeParse(state)
    expect(result.success).toBe(true)
    if (result.success) {
      const doc = result.data.orderedDocs[0].doc
      if (doc.type === "gql-request") {
        expect(doc.request.preRequestScript).toBe('pw.env.set("a", "b")')
        expect(doc.request.testScript).toBe('pw.test("t", () => {})')
        expect(Object.keys(doc.request.responses ?? {})).toEqual([
          "exact",
          "wildcard",
        ])
        expect(doc.optionTabPreference).toBe("tests")
      } else {
        throw new Error("expected a gql-request doc")
      }
    }
  })
})
