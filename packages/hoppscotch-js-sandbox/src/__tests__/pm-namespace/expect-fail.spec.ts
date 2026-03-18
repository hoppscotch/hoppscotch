import { describe, expect, test } from "vitest"
import { TestResponse } from "~/types"
import { runTest } from "~/utils/test-helpers"

const mockResponse: TestResponse = {
  status: 200,
  statusText: "OK",
  responseTime: 0,
  body: "OK",
  headers: [],
}

describe("pm.expect.fail() - Explicit test failures", () => {
  test("pm.expect.fail() with no arguments fails the test", async () => {
    const testScript = `
      pm.test("explicit failure", () => {
        pm.expect.fail();
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "explicit failure",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: expect.stringContaining("expect.fail()"),
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })

  test("pm.expect.fail() with custom message", async () => {
    const testScript = `
      pm.test("custom failure message", () => {
        pm.expect.fail("This test intentionally fails");
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "custom failure message",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: "This test intentionally fails",
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })

  test("pm.expect.fail() with actual and expected values", async () => {
    const testScript = `
      pm.test("failure with values", () => {
        pm.expect.fail(5, 10);
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "failure with values",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: expect.stringMatching(/expected.*5.*equal.*10/i),
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })

  test("pm.expect.fail() practical use case - conditional validation", async () => {
    const jsonResponse: TestResponse = {
      status: 200,
      statusText: "OK",
      responseTime: 0,
      body: JSON.stringify({ id: 1, name: "Test" }),
      headers: [{ key: "Content-Type", value: "application/json" }],
    }

    const testScript = `
      pm.test("validate response", () => {
        const data = pm.response.json();

        if (!data.email) {
          pm.expect.fail("Missing required email field");
        }

        pm.expect(data).to.be.an("object");
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      jsonResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "validate response",
              expectResults: expect.arrayContaining([
                expect.objectContaining({
                  status: "fail",
                  message: "Missing required email field",
                }),
              ]),
            }),
          ]),
        }),
      ])
    )
  })
})

describe("hopp.expect.fail() - Explicit test failures", () => {
  test("hopp.expect.fail() with no arguments fails the test", async () => {
    const testScript = `
      hopp.test("explicit failure", () => {
        hopp.expect.fail();
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "explicit failure",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: expect.stringContaining("expect.fail()"),
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })

  test("hopp.expect.fail() with custom message", async () => {
    const testScript = `
      hopp.test("custom failure message", () => {
        hopp.expect.fail("This test intentionally fails");
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "custom failure message",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: "This test intentionally fails",
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })

  test("hopp.expect.fail() with actual and expected values", async () => {
    const testScript = `
      hopp.test("failure with values", () => {
        hopp.expect.fail("hello", "world");
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "failure with values",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: expect.stringMatching(
                    /expected.*hello.*equal.*world/i
                  ),
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })
})

describe("expect.fail() - Cross-namespace compatibility", () => {
  test("both pm and hopp namespaces support fail() with same behavior", async () => {
    const testScript = `
      pm.test("pm namespace fail", () => {
        pm.expect.fail("PM failure");
      });

      hopp.test("hopp namespace fail", () => {
        hopp.expect.fail("Hopp failure");
      });
    `

    const result = await runTest(
      testScript,
      { global: [], selected: [] },
      mockResponse
    )()

    expect(result).toEqualRight(
      expect.arrayContaining([
        expect.objectContaining({
          descriptor: "root",
          children: expect.arrayContaining([
            expect.objectContaining({
              descriptor: "pm namespace fail",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: "PM failure",
                }),
              ],
            }),
            expect.objectContaining({
              descriptor: "hopp namespace fail",
              expectResults: [
                expect.objectContaining({
                  status: "fail",
                  message: "Hopp failure",
                }),
              ],
            }),
          ]),
        }),
      ])
    )
  })
})
