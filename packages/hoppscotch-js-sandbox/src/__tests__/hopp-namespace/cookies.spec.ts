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

  test("hopp.cookies methods throw for non-string domain and/or name args", async () => {
    await expect(
      runPreRequestScript(`hopp.cookies.get(123, "test")`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
    ).resolves.toBeLeft()

    await expect(
      runPreRequestScript(`hopp.cookies.delete("example.com", 456)`, {
        envs: { global: [], selected: [] },
        request: defaultRequest,
        cookies: baseCookies,
      }),
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
        `console.log(hopp.cookies.has("example.com", "session_id"))`,
        {
          envs,
          request: defaultRequest,
          cookies: baseCookies,
          response,
        },
      ),
    ).resolves.toEqualRight(
      expect.objectContaining({
        consoleEntries: [expect.objectContaining({ args: [true] })],
      }),
    )
  })
})
