import { describe, expect, test } from "vitest"
import { getMQTTPort } from "../MQTTConnection"

describe("getMQTTPort", () => {
  test("uses the port from the url when one is set", () => {
    expect(getMQTTPort(new URL("wss://test.mosquitto.org:8081"))).toBe(8081)
    expect(getMQTTPort(new URL("ws://localhost:9001/mqtt"))).toBe(9001)
  })

  test("uses 443 for wss urls on the default port", () => {
    expect(getMQTTPort(new URL("wss://broker.example.com:443"))).toBe(443)
    expect(getMQTTPort(new URL("wss://broker.example.com/mqtt"))).toBe(443)
  })

  test("uses 80 for ws urls on the default port", () => {
    expect(getMQTTPort(new URL("ws://broker.example.com:80"))).toBe(80)
    expect(getMQTTPort(new URL("ws://broker.example.com"))).toBe(80)
  })
})
