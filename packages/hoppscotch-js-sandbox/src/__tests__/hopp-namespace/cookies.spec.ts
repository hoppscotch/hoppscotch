import { getDefaultRESTRequest } from "@hoppscotch/data"
import { describe, expect, test } from "vitest"

import { Cookie, TestResponse } from "~/types"
import { runPreRequestScript, runTestScript } from "~/web"

const baseCookies: Cookie[] = [
  {
    name: "session_id",
    value: "abc123",
    domain: "example.com",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
  },
  {
    name: "pref",
    value: "dark",
    domain: "example.com",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Strict",
  },
]

const defaultRequest = getDefaultRESTRequest()

describe("hopp.cookies", () => {
  test("hopp.cookies.get should return a specific cookie", () => {
    expect(
      runPreRequestScript(
        `console.log(hopp.cookies.get("example.com", "session_id"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [
              {
                name: "session_id",
                value: "abc123",
                domain: "example.com",
                path: "/",
                httpOnly: true,
                secure: true,
                sameSite: "Lax",
              },
            ],
          }),
        ],
      }),
    )
  })

  test("hopp.cookies.get should return null for missing cookie", () => {
    expect(
      runPreRequestScript(
        `console.log(hopp.cookies.get("example.com", "unknown"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [null] })],
      }),
    )
  })

  test("hopp.cookies.has should return true if cookie exists", () => {
    expect(
      runPreRequestScript(
        `console.log(hopp.cookies.has("example.com", "session_id"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [true],
          }),
        ],
      }),
    )
  })

  test("hopp.cookies.has should return false if cookie does not exist", () => {
    expect(
      runPreRequestScript(
        `console.log(hopp.cookies.has("example.com", "missing"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [false],
          }),
        ],
      }),
    )
  })

  test("hopp.cookies.getAll should return all cookies for a domain", () => {
    expect(
      runPreRequestScript(`console.log(hopp.cookies.getAll("example.com"))`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({
            args: [
              [
                {
                  name: "session_id",
                  value: "abc123",
                  domain: "example.com",
                  path: "/",
                  httpOnly: true,
                  secure: true,
                  sameSite: "Lax",
                },
                {
                  name: "pref",
                  value: "dark",
                  domain: "example.com",
                  path: "/",
                  httpOnly: false,
                  secure: false,
                  sameSite: "Strict",
                },
              ],
            ],
          }),
        ],
      }),
    )
  })

  test("hopp.cookies.set should add a new cookie", () => {
    expect(
      runPreRequestScript(
        `
          const newCookie = {
          name: "new_cookie",
          value: "new_value",
          domain: "example.com",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "None",
        }

        hopp.cookies.set("example.com", newCookie)
        `,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.arrayContaining([
          expect.objectContaining({
            name: "new_cookie",
            value: "new_value",
            domain: "example.com",
            path: "/",
            httpOnly: false,
            secure: false,
            sameSite: "None",
          }),
        ]),
      }),
    )
  })

  test("hopp.cookies.set should replace existing cookie with same domain+name", () => {
    const updated = { ...baseCookies[0], value: "updated123" }
    expect(
      runPreRequestScript(
        `hopp.cookies.set("example.com", ${JSON.stringify(updated)})`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          cookies: baseCookies,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.arrayContaining([
          expect.objectContaining({ value: "updated123" }),
        ]),
      }),
    )
  })

  test("hopp.cookies.delete should remove a specific cookie", () => {
    expect(
      runPreRequestScript(`hopp.cookies.delete("example.com", "pref")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.not.arrayContaining([
          expect.objectContaining({ name: "pref" }),
        ]),
      }),
    )
  })

  test("hopp.cookies.clear should remove all cookies for a domain", () => {
    expect(
      runPreRequestScript(`hopp.cookies.clear("example.com")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toEqualRight(
      expect.objectContaining({
        updatedCookies: expect.not.arrayContaining([
          expect.objectContaining({ domain: "example.com" }),
        ]),
      }),
    )
  })

  test("hopp.cookies methods throw for non-string domain and/or name args", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    expect(
      runPreRequestScript(`hopp.cookies.get(123, "test")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toBeLeft()

    expect(
      runPreRequestScript(`hopp.cookies.delete("example.com", 456)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toBeLeft()

    expect(
      runTestScript(`hopp.cookies.get(123, "test")`, {
        envs,
        request: defaultRequest,
        cookies: undefined,
        response,
      }),
    ).resolves.toBeLeft()

    expect(
      runTestScript(`hopp.cookies.delete("example.com", 456)`, {
        envs,
        request: defaultRequest,
        cookies: undefined,
        response,
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.cookies.set throw if attempting to set cookie not conforming to the expected shape", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    const script = `hopp.cookies.set("example.com", "test")`

    expect(
      runPreRequestScript(script, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toBeLeft()

    expect(
      runTestScript(script, {
        envs,
        request: defaultRequest,
        cookies: undefined,
        response,
      }),
    ).resolves.toBeLeft()
  })

  test("hopp.cookies throws an exception on unsupported platforms", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    expect(
      runPreRequestScript(
        `console.log(hopp.cookies.get("example.com", "session_id"))`,
        {
          envs: { global: [], selected: [] },
          request: defaultRequest,
          // `cookies` specified as `undefined` indicates unsupported platform
          cookies: undefined,
        },
      ),
    ).resolves.toBeLeft()

    expect(
      runTestScript(
        `console.log(hopp.cookies.get("example.com", "session_id"))`,
        {
          envs,
          request: defaultRequest,
          cookies: undefined,
          response,
        },
      ),
    ).resolves.toBeLeft()
  })

  test("hopp.cookies API should be available in post-request context", () => {
    const envs = { global: [], selected: [] }
    const response: TestResponse = {
      status: 200,
      body: "OK",
      headers: [],
    }

    expect(
      runTestScript(
        `
        console.log("pre_has_session", hopp.cookies.has("example.com", "session_id"))
        console.log("get_pref", hopp.cookies.get("example.com", "pref").value)

        hopp.cookies.set("example.com", {
          name: "post_cookie",
          value: "post_value",
          domain: "example.com",
          path: "/",
          httpOnly: false,
          secure: false,
          sameSite: "None",
        })

        console.log("has_post_cookie", hopp.cookies.has("example.com", "post_cookie"))
        console.log("getAll_len", hopp.cookies.getAll("example.com").length)

        hopp.cookies.delete("example.com", "session_id")

        console.log("post_has_session", hopp.cookies.has("example.com", "session_id"))
        `,
        {
          envs,
          request: defaultRequest,
          cookies: baseCookies,
          response,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [
          expect.objectContaining({ args: ["pre_has_session", true] }),
          expect.objectContaining({ args: ["get_pref", "dark"] }),
          expect.objectContaining({ args: ["has_post_cookie", true] }),
          expect.objectContaining({ args: ["getAll_len", 3] }),
          expect.objectContaining({ args: ["post_has_session", false] }),
        ],
        updatedCookies: expect.arrayContaining([
          expect.objectContaining({ name: "post_cookie", value: "post_value" }),
        ]),
      }),
    )
  })
})
