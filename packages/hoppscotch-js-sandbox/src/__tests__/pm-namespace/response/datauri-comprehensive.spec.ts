import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("pm.response.dataURI() comprehensive coverage", () => {
  test("should handle Content-Type without charset", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ test: "data" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    const testScript = `
      pm.test("dataURI format without charset", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.include('data:')
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri).to.include('application/json')
        pm.expect(dataUri).to.include('base64,')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI format without charset",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle Content-Type with charset parameter", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ test: "data" }),
      headers: [
        { key: "Content-Type", value: "application/json; charset=utf-8" },
      ],
    }

    const testScript = `
      pm.test("dataURI format with charset", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.include('data:')
        // Updated regex pattern that handles charset parameters
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri).to.include('application/json')
        pm.expect(dataUri).to.include('charset=utf-8')
        pm.expect(dataUri).to.include('base64,')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI format with charset",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle text/html with charset", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "<html><body>Hello</body></html>",
      headers: [{ key: "Content-Type", value: "text/html; charset=utf-8" }],
    }

    const testScript = `
      pm.test("dataURI with text/html and charset", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri).to.include('text/html')
        pm.expect(dataUri).to.include('charset=utf-8')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI with text/html and charset",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle text/plain with multiple parameters", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Plain text content",
      headers: [
        {
          key: "Content-Type",
          value: "text/plain; charset=utf-8; format=flowed",
        },
      ],
    }

    const testScript = `
      pm.test("dataURI with multiple parameters", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        // Regex should handle multiple semicolons
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri).to.include('text/plain')
        pm.expect(dataUri).to.include('base64,')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI with multiple parameters",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle application/xml with charset", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: '<?xml version="1.0"?><root><data>test</data></root>',
      headers: [
        { key: "Content-Type", value: "application/xml; charset=utf-8" },
      ],
    }

    const testScript = `
      pm.test("dataURI with XML and charset", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri).to.include('application/xml')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI with XML and charset",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle missing Content-Type header", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "Some content",
      headers: [],
    }

    const testScript = `
      pm.test("dataURI without Content-Type header", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        // Should default to application/octet-stream
        pm.expect(dataUri).to.include('application/octet-stream')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI without Content-Type header",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should properly encode UTF-8 content", async () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: JSON.stringify({ message: "Hello 世界 🌍" }),
      headers: [
        { key: "Content-Type", value: "application/json; charset=utf-8" },
      ],
    }

    const testScript = `
      pm.test("dataURI with UTF-8 characters", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri.length).to.be.above(50)
        // Should contain valid base64 characters after "base64,"
        const base64Part = dataUri.split('base64,')[1]
        pm.expect(base64Part).to.be.a('string')
        pm.expect(base64Part.length).to.be.above(0)
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI with UTF-8 characters",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })

  test("should handle empty response body", async () => {
    const response: TestResponse = {
      status: 204,
      statusText: "No Content",
      body: "",
      headers: [{ key: "Content-Type", value: "text/plain" }],
    }

    const testScript = `
      pm.test("dataURI with empty body", () => {
        const dataUri = pm.response.dataURI()
        pm.expect(dataUri).to.be.a('string')
        pm.expect(dataUri).to.match(/^data:.+;base64,/)
        pm.expect(dataUri).to.include('text/plain')
      })
    `

    return expect(
      runTest(testScript, { global: [], selected: [] }, response)()
    ).resolves.toEqualRight([
      expect.objectContaining({
        children: [
          expect.objectContaining({
            descriptor: "dataURI with empty body",
            expectResults: [
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
              expect.objectContaining({ status: "pass" }),
            ],
          }),
        ],
      }),
    ])
  })
})
