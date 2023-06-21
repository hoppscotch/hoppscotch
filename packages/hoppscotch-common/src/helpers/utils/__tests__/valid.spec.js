import { describe, test, expect } from "vitest"
import { wsValid, httpValid, socketioValid } from "../valid"

describe("wsValid", () => {
  test("returns true for valid URL with IP address", () => {
    expect(wsValid("wss://174.129.224.73/")).toBe(true)
    expect(wsValid("wss://174.129.224.73")).toBe(true)
  })

  test("returns true for valid URL with Hostname", () => {
    expect(wsValid("wss://echo-websocket.hoppscotch.io/")).toBe(true)
    expect(wsValid("wss://echo-websocket.hoppscotch.io")).toBe(true)
  })

  test("returns false for invalid URL with IP address", () => {
    expect(wsValid("wss://174.129.")).toBe(false)
    expect(wsValid("wss://174.129./")).toBe(false)
  })

  test("returns false for invalid URL with hostname", () => {
    expect(wsValid("wss://echo.websocket./")).toBe(false)
    expect(wsValid("wss://echo.websocket.")).toBe(false)
  })

  test("returns false for non-wss protocol URLs", () => {
    expect(wsValid("http://echo.websocket.org/")).toBe(false)
    expect(wsValid("http://echo.websocket.org")).toBe(false)
    expect(wsValid("http://174.129.224.73/")).toBe(false)
    expect(wsValid("http://174.129.224.73")).toBe(false)
  })

  test("returns true for wss protocol URLs", () => {
    expect(wsValid("wss://echo-websocket.hoppscotch.io/")).toBe(true)
    expect(wsValid("wss://echo-websocket.hoppscotch.io")).toBe(true)
    expect(wsValid("wss://174.129.224.73/")).toBe(true)
    expect(wsValid("wss://174.129.224.73")).toBe(true)
  })

  test("returns true for ws protocol URLs", () => {
    expect(wsValid("ws://echo.websocket.org/")).toBe(true)
    expect(wsValid("ws://echo.websocket.org")).toBe(true)
    expect(wsValid("ws://174.129.224.73/")).toBe(true)
    expect(wsValid("ws://174.129.224.73")).toBe(true)
  })
})

describe("httpValid", () => {
  test("returns true for valid URL with IP address", () => {
    expect(httpValid("http://174.129.224.73/")).toBe(true)
    expect(httpValid("http://174.129.224.73")).toBe(true)
  })

  test("returns true for valid URL with Hostname", () => {
    expect(httpValid("http://echo.websocket.org/")).toBe(true)
    expect(httpValid("http://echo.websocket.org")).toBe(true)
  })

  test("returns false for invalid URL with IP address", () => {
    expect(httpValid("http://174.129./")).toBe(false)
    expect(httpValid("http://174.129.")).toBe(false)
  })

  test("returns false for invalid URL with hostname", () => {
    expect(httpValid("http://echo.websocket./")).toBe(false)
    expect(httpValid("http://echo.websocket.")).toBe(false)
  })

  test("returns false for non-http(s) protocol URLs", () => {
    expect(httpValid("wss://echo-websocket.hoppscotch.io/")).toBe(false)
    expect(httpValid("wss://echo-websocket.hoppscotch.io")).toBe(false)
    expect(httpValid("wss://174.129.224.73/")).toBe(false)
    expect(httpValid("wss://174.129.224.73")).toBe(false)
  })

  test("returns true for HTTP protocol URLs", () => {
    expect(httpValid("http://echo.websocket.org/")).toBe(true)
    expect(httpValid("http://echo.websocket.org")).toBe(true)
    expect(httpValid("http://174.129.224.73/")).toBe(true)
    expect(httpValid("http://174.129.224.73")).toBe(true)
  })

  test("returns true for HTTPS protocol URLs", () => {
    expect(httpValid("https://echo.websocket.org/")).toBe(true)
    expect(httpValid("https://echo.websocket.org")).toBe(true)
    expect(httpValid("https://174.129.224.73/")).toBe(true)
    expect(httpValid("https://174.129.224.73")).toBe(true)
  })
})

describe("socketioValid", () => {
  test("returns true for valid URL with IP address", () => {
    expect(socketioValid("http://174.129.224.73/")).toBe(true)
    expect(socketioValid("http://174.129.224.73")).toBe(true)
  })

  test("returns true for valid URL with Hostname", () => {
    expect(socketioValid("http://echo.websocket.org/")).toBe(true)
    expect(socketioValid("http://echo.websocket.org")).toBe(true)
  })

  test("returns false for invalid URL with IP address", () => {
    expect(socketioValid("http://174.129./")).toBe(false)
    expect(socketioValid("http://174.129.")).toBe(false)
  })

  test("returns false for invalid URL with hostname", () => {
    expect(socketioValid("http://echo.websocket./")).toBe(false)
    expect(socketioValid("http://echo.websocket.")).toBe(false)
  })

  test("returns false for non-http(s) and non-wss protocol URLs", () => {
    expect(socketioValid("ftp://echo.websocket.org/")).toBe(false)
    expect(socketioValid("ftp://echo.websocket.org")).toBe(false)
    expect(socketioValid("ftp://174.129.224.73/")).toBe(false)
    expect(socketioValid("ftp://174.129.224.73")).toBe(false)
  })

  test("returns true for HTTP protocol URLs", () => {
    expect(socketioValid("http://echo.websocket.org/")).toBe(true)
    expect(socketioValid("http://echo.websocket.org")).toBe(true)
    expect(socketioValid("http://174.129.224.73/")).toBe(true)
    expect(socketioValid("http://174.129.224.73")).toBe(true)
  })

  test("returns true for HTTPS protocol URLs", () => {
    expect(socketioValid("https://echo.websocket.org/")).toBe(true)
    expect(socketioValid("https://echo.websocket.org")).toBe(true)
    expect(socketioValid("https://174.129.224.73/")).toBe(true)
    expect(socketioValid("https://174.129.224.73")).toBe(true)
  })

  test("returns true for wss protocol URLs", () => {
    expect(socketioValid("wss://echo-websocket.hoppscotch.io/")).toBe(true)
    expect(socketioValid("wss://echo-websocket.hoppscotch.io")).toBe(true)
    expect(socketioValid("wss://174.129.224.73/")).toBe(true)
    expect(socketioValid("wss://174.129.224.73")).toBe(true)
  })

  test("returns true for ws protocol URLs", () => {
    expect(socketioValid("ws://echo.websocket.org/")).toBe(true)
    expect(socketioValid("ws://echo.websocket.org")).toBe(true)
    expect(socketioValid("ws://174.129.224.73/")).toBe(true)
    expect(socketioValid("ws://174.129.224.73")).toBe(true)
  })
})
