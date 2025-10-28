/**
 * @file Tests for Postman cookie handling (pm.response.cookies.*, pm.response.to.have.cookie)
 *
 * These tests verify cookie parsing from Set-Cookie headers and cookie assertions.
 * Cookies in responses are extracted from Set-Cookie headers and made available
 * through the pm.response.cookies API.
 */

import { describe, expect, test } from "vitest"
import { runTest } from "~/utils/test-helpers"

describe("`pm.response.cookies` - Cookie Access Methods", () => {
  test("should support `.get()` to retrieve a cookie value by name", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        { key: "Set-Cookie", value: "session=abc123; Path=/; HttpOnly" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Can retrieve cookie value by name", function() {
            const cookieValue = pm.response.cookies.get("session")
            pm.expect(cookieValue).to.not.be.null
            pm.expect(cookieValue).to.equal("abc123")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Can retrieve cookie value by name",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should return null for non-existent cookies", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [{ key: "Set-Cookie", value: "session=abc123; Path=/" }],
    }

    return expect(
      runTest(
        `
          pm.test("Returns null for non-existent cookie", function() {
            const cookie = pm.response.cookies.get("nonexistent")
            pm.expect(cookie).to.be.null
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Returns null for non-existent cookie",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining("Expected null to be null"),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should support `.has()` to check cookie existence", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        { key: "Set-Cookie", value: "auth_token=xyz789; Secure" },
        { key: "Set-Cookie", value: "user_id=42; SameSite=Strict" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Can check cookie existence", function() {
            pm.expect(pm.response.cookies.has("auth_token")).to.be.true
            pm.expect(pm.response.cookies.has("user_id")).to.be.true
            pm.expect(pm.response.cookies.has("nonexistent")).to.be.false
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Can check cookie existence",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should support `.toObject()` to get all cookies", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        { key: "Set-Cookie", value: "cookie1=value1; Path=/" },
        { key: "Set-Cookie", value: "cookie2=value2; Domain=example.com" },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Can get all cookies as object", function() {
            const cookies = pm.response.cookies.toObject()
            pm.expect(cookies).to.be.an("object")
            pm.expect(cookies.cookie1).to.equal("value1")
            pm.expect(cookies.cookie2).to.equal("value2")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Can get all cookies as object",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should return just the cookie value (matching Postman behavior)", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        {
          key: "Set-Cookie",
          value:
            "full_cookie=test_value; Domain=.example.com; Path=/api; Max-Age=3600; Secure; HttpOnly; SameSite=Lax",
        },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Returns only cookie value, not attributes", function() {
            const cookieValue = pm.response.cookies.get("full_cookie")
            pm.expect(cookieValue).to.equal("test_value")
            pm.expect(cookieValue).to.be.a("string")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Returns only cookie value, not attributes",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should handle cookies with equals signs in value", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [
        {
          key: "Set-Cookie",
          value:
            "jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0=; Path=/",
        },
      ],
    }

    return expect(
      runTest(
        `
          pm.test("Handles equals signs in cookie value", function() {
            const cookieValue = pm.response.cookies.get("jwt")
            pm.expect(cookieValue).to.include("=")
            pm.expect(cookieValue).to.equal("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0=")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Handles equals signs in cookie value",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })
})

describe("`pm.response.to.have.cookie` - Cookie Assertions", () => {
  test("should assert cookie exists by name", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [{ key: "Set-Cookie", value: "session=abc123; Path=/" }],
    }

    return expect(
      runTest(
        `
          pm.test("Response has session cookie", function() {
            pm.response.to.have.cookie("session")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Response has session cookie",
            expectResults: expect.arrayContaining([
              expect.objectContaining({ status: "pass" }),
            ]),
          }),
        ],
      }),
    ])
  })

  test("should assert cookie value matches", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [{ key: "Set-Cookie", value: "user=john_doe; Path=/" }],
    }

    return expect(
      runTest(
        `
          pm.test("Cookie has correct value", function() {
            pm.response.to.have.cookie("user", "john_doe")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Cookie has correct value",
            expectResults: [
              {
                status: "pass",
                message: expect.stringContaining(
                  "Expected 'john_doe' to equal 'john_doe'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should fail when cookie doesn't exist", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [],
    }

    return expect(
      runTest(
        `
          pm.test("Missing cookie fails", function() {
            pm.response.to.have.cookie("nonexistent")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Missing cookie fails",
            expectResults: [
              {
                status: "fail",
                message: expect.stringContaining("Expected false to be true"),
              },
            ],
          }),
        ],
      }),
    ])
  })

  test("should fail when cookie value doesn't match", () => {
    const response: TestResponse = {
      status: 200,
      statusText: "OK",
      body: "{}",
      headers: [{ key: "Set-Cookie", value: "token=wrong_value; Path=/" }],
    }

    return expect(
      runTest(
        `
          pm.test("Wrong cookie value fails", function() {
            pm.response.to.have.cookie("token", "expected_value")
          })
        `,
        { global: [], selected: [] },
        response
      )()
    ).resolves.toEqualRight([
      expect.objectContaining({
        descriptor: "root",
        children: [
          expect.objectContaining({
            descriptor: "Wrong cookie value fails",
            expectResults: [
              {
                status: "fail",
                message: expect.stringContaining(
                  "Expected 'wrong_value' to equal 'expected_value'"
                ),
              },
            ],
          }),
        ],
      }),
    ])
  })
})
