import { describe, expect, it } from "vitest"
import { runTestScript } from "~/node"
import { TestResponse } from "~/types/test-runner"

describe("pm.response method existence checks", () => {
  const mockResponse: TestResponse = {
    status: 200,
    headers: [{ key: "Content-Type", value: "application/json" }],
    body: JSON.stringify({ message: "Hello" }),
  }

  it("should recognize pm.response.reason as a function", async () => {
    const testScript = `
      pm.test("pm.response.reason is a function", () => {
        pm.expect(pm.response.reason).to.be.a('function')
      })
    `

    await expect(
      runTestScript(testScript, { response: mockResponse })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: [
          expect.objectContaining({
            expectResults: [],
            children: [
              expect.objectContaining({
                descriptor: "pm.response.reason is a function",
                expectResults: [
                  expect.objectContaining({
                    status: "pass",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  })

  it("should recognize pm.response.dataURI as a function", async () => {
    const testScript = `
      pm.test("pm.response.dataURI is a function", () => {
        pm.expect(pm.response.dataURI).to.be.a('function')
      })
    `

    await expect(
      runTestScript(testScript, { response: mockResponse })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: [
          expect.objectContaining({
            expectResults: [],
            children: [
              expect.objectContaining({
                descriptor: "pm.response.dataURI is a function",
                expectResults: [
                  expect.objectContaining({
                    status: "pass",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  })

  it("should recognize pm.response.jsonp as a function", async () => {
    const testScript = `
      pm.test("pm.response.jsonp is a function", () => {
        pm.expect(pm.response.jsonp).to.be.a('function')
      })
    `

    await expect(
      runTestScript(testScript, { response: mockResponse })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: [
          expect.objectContaining({
            expectResults: [],
            children: [
              expect.objectContaining({
                descriptor: "pm.response.jsonp is a function",
                expectResults: [
                  expect.objectContaining({
                    status: "pass",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  })

  it("should work with typeof checks", async () => {
    const testScript = `
      pm.test("typeof pm.response.reason equals function", () => {
        pm.expect(typeof pm.response.reason).to.equal('function')
      })
    `

    await expect(
      runTestScript(testScript, { response: mockResponse })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: [
          expect.objectContaining({
            expectResults: [],
            children: [
              expect.objectContaining({
                descriptor: "typeof pm.response.reason equals function",
                expectResults: [
                  expect.objectContaining({
                    status: "pass",
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  })

  it("should verify all three utility methods exist as functions", async () => {
    const testScript = `
      pm.test("all response utility methods exist", () => {
        pm.expect(pm.response.reason).to.be.a('function')
        pm.expect(pm.response.dataURI).to.be.a('function')
        pm.expect(pm.response.jsonp).to.be.a('function')
      })
    `

    await expect(
      runTestScript(testScript, { response: mockResponse })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: [
          expect.objectContaining({
            expectResults: [],
            children: [
              expect.objectContaining({
                descriptor: "all response utility methods exist",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
            ],
          }),
        ],
      })
    )
  })

  it("should verify methods work correctly when called", async () => {
    const testScript = `
      pm.test("response.reason() returns status text", () => {
        pm.expect(pm.response.reason()).to.equal('OK')
      })

      pm.test("response.dataURI() returns data URI string", () => {
        const uri = pm.response.dataURI()
        pm.expect(uri).to.be.a('string')
        pm.expect(uri).to.include('data:')
      })

      pm.test("response.jsonp() parses JSON", () => {
        const result = pm.response.jsonp()
        pm.expect(result).to.deep.equal({ message: "Hello" })
      })
    `

    await expect(
      runTestScript(testScript, { response: mockResponse })()
    ).resolves.toEqualRight(
      expect.objectContaining({
        tests: [
          expect.objectContaining({
            expectResults: [],
            children: [
              expect.objectContaining({
                descriptor: "response.reason() returns status text",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
              expect.objectContaining({
                descriptor: "response.dataURI() returns data URI string",
                expectResults: [
                  expect.objectContaining({ status: "pass" }),
                  expect.objectContaining({ status: "pass" }),
                ],
              }),
              expect.objectContaining({
                descriptor: "response.jsonp() parses JSON",
                expectResults: [expect.objectContaining({ status: "pass" })],
              }),
            ],
          }),
        ],
      })
    )
  })
})
