import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"
import { runTestScript } from "~/web"
import { TestResponse } from "~/types"

const defaultRequest = getDefaultRESTRequest()

const sampleHeaders = [
  { key: "content-type", value: "application/json" },
  { key: "x-custom", value: "hello" },
]

const sampleJSONResponse: TestResponse = {
  status: 201,
  body: { ok: true, msg: "success" },
  headers: sampleHeaders,
  statusText: "Created",
  responseTime: 123,
}

const sampleTextResponse: TestResponse = {
  status: 200,
  body: "Plaintext response",
  headers: [{ key: "content-type", value: "text/plain" }],
  statusText: "OK",
  responseTime: 240,
}

describe("hopp.response", () => {
  test("hopp.response.statusCode should return the status", () => {
    expect(
      runTestScript(`console.log(hopp.response.statusCode)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [201] })],
      }),
    )
  })

  test("hopp.response.statusText should return the status text", () => {
    expect(
      runTestScript(`console.log(hopp.response.statusText)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: ["Created"] })],
      }),
    )
  })

  test("hopp.response.responseTime should return the response time", () => {
    expect(
      runTestScript(`console.log(hopp.response.responseTime)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [123] })],
      }),
    )
  })

  test("hopp.response.headers should return all headers", () => {
    expect(
      runTestScript(`console.log(hopp.response.headers)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleJSONResponse,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [expect.arrayContaining(sampleHeaders)],
          }),
        ],
      }),
    )
  })

  test("hopp.response.body.asText returns response text", () => {
    expect(
      runTestScript(`console.log(hopp.response.body.asText())`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleTextResponse,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: ["Plaintext response"],
          }),
        ],
      }),
    )
  })

  test("hopp.response.body.asJSON returns parsed object for JSON response", () => {
    expect(
      runTestScript(
        `
        const obj = hopp.response.body.asJSON()
        console.log(obj.ok, obj.msg)
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleJSONResponse,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [true, "success"],
          }),
        ],
      }),
    )
  })

  test("hopp.response.body.asJSON throws for invalid JSON", () => {
    expect(
      runTestScript(`hopp.response.body.asJSON()`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: sampleTextResponse, // text, not JSON
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.response.body.asJSON throws error for invalid JSON body", () => {
    expect(
      runTestScript(`hopp.response.body.asJSON()`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: {
          ...sampleJSONResponse,
          body: "not a json!",
          headers: [{ key: "content-type", value: "application/json" }],
        },
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.response.body.bytes returns UTF-8 encoded data for JSON body", () => {
    expect(
      runTestScript(
        `
        const obj = hopp.response.body.bytes()
        console.log(obj)
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleJSONResponse,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [
              {
                "0": 123,
                "1": 34,
                "2": 111,
                "3": 107,
                "4": 34,
                "5": 58,
                "6": 116,
                "7": 114,
                "8": 117,
                "9": 101,
                "10": 44,
                "11": 34,
                "12": 109,
                "13": 115,
                "14": 103,
                "15": 34,
                "16": 58,
                "17": 34,
                "18": 115,
                "19": 117,
                "20": 99,
                "21": 99,
                "22": 101,
                "23": 115,
                "24": 115,
                "25": 34,
                "26": 125,
              },
            ],
          }),
        ],
      }),
    )
  })

  test("hopp.response.body.bytes throws error for unsupported body type", () => {
    expect(
      runTestScript(`hopp.response.body.bytes()`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: { ...sampleTextResponse, body: 1234 as any },
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.response.bytes returns UTF-8 encoded data for plain text", () => {
    expect(
      runTestScript(
        `
      const bytes = hopp.response.body.bytes()
      console.log(bytes)
      `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: sampleTextResponse,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [
              {
                "0": 80,
                "1": 108,
                "2": 97,
                "3": 105,
                "4": 110,
                "5": 116,
                "6": 101,
                "7": 120,
                "8": 116,
                "9": 32,
                "10": 114,
                "11": 101,
                "12": 115,
                "13": 112,
                "14": 111,
                "15": 110,
                "16": 115,
                "17": 101,
              },
            ],
          }),
        ],
      }),
    )
  })

  test("hopp.response.bytes returns empty array for null/undefined body", () => {
    expect(
      runTestScript(
        `
      const bytes = hopp.response.body.bytes()
      console.log(Array.from(bytes))
      `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          response: { ...sampleTextResponse, body: null },
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [[]] })],
      }),
    )
  })

  test("hopp.response throws exception on unsupported platforms", () => {
    expect(
      runTestScript(`console.log(hopp.response.statusCode)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        response: undefined,
      }),
    ).resolves.toBeLeft()
  })
})
