import { describe, it, expect, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import { ScrollService } from "../scroll.service"

describe("ScrollService", () => {
  let service: ScrollService

  beforeEach(() => {
    const container = new TestContainer()
    service = container.bind(ScrollService)
  })

  it("should store and retrieve scroll position for tab and suffix", () => {
    service.setScroll("tab1", "json", 100)

    expect(service.getScroll("tab1", "json")).toBe(100)
  })

  it("should return undefined for unset scroll position", () => {
    expect(service.getScroll("tab1", "html")).toBeUndefined()
  })

  it("should clean up scroll positions for a specific tab", () => {
    service.setScroll("tab1", "json", 100)
    service.setScroll("tab1", "html", 200)

    service.cleanupScrollForTab("tab1")

    expect(service.getScroll("tab1", "json")).toBeUndefined()
    expect(service.getScroll("tab1", "html")).toBeUndefined()
  })

  it("should clean up all scroll positions", () => {
    service.setScroll("tab1", "json", 100)
    service.setScroll("tab2", "html", 200)
    service.cleanupAllScroll()

    expect(service.getScroll("tab1", "json")).toBeUndefined()
    expect(service.getScroll("tab2", "html")).toBeUndefined()
  })

  it("should clean up scroll positions for all tabs except a specific one", () => {
    service.setScroll("tab1", "json", 100)
    service.setScroll("tab2", "html", 200)
    service.cleanupAllScroll("tab1")

    expect(service.getScroll("tab1", "json")).toBe(100)
    expect(service.getScroll("tab2", "html")).toBeUndefined()
  })

  it("should store and retrieve scroll position using a custom key", () => {
    service.setScrollForKey("customKey", 999)

    expect(service.getScrollForKey("customKey")).toBe(999)
  })

  it("should return undefined for unset custom key", () => {
    expect(service.getScrollForKey("nonexistentKey")).toBeUndefined()
  })

  it("should overwrite an existing scroll value", () => {
    service.setScroll("tab1", "json", 100)
    service.setScroll("tab1", "json", 300)

    expect(service.getScroll("tab1", "json")).toBe(300)
  })

  it("custom key and tab+suffix keys do not interfere when keys are different", () => {
    service.setScroll("tab1", "json", 111)
    service.setScrollForKey("custom-tab1-json", 999)
    expect(service.getScroll("tab1", "json")).toBe(111)
    expect(service.getScrollForKey("custom-tab1-json")).toBe(999)
  })

  it("cleanupScrollForTab should not remove other tab data", () => {
    service.setScroll("tab1", "json", 100)
    service.setScroll("tab2", "json", 200)

    service.cleanupScrollForTab("tab1")

    expect(service.getScroll("tab1", "json")).toBeUndefined()
    expect(service.getScroll("tab2", "json")).toBe(200)
  })

  it("should handle empty tabId and suffix gracefully", () => {
    service.setScroll("", "json", 123)
    service.setScroll("tab1", "" as any, 456)

    expect(service.getScroll("", "json")).toBe(123)
    expect(service.getScroll("tab1", "" as any)).toBe(456)
  })

  it("should overwrite scroll position for custom keys", () => {
    service.setScrollForKey("key1", 100)
    service.setScrollForKey("key1", 300)

    expect(service.getScrollForKey("key1")).toBe(300)
  })
})
