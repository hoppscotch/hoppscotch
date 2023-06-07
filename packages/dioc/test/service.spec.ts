import { describe, expect, it, vi } from "vitest"
import { Service, Container } from "../lib/main"

class TestServiceA extends Service {
  public static ID = "TestServiceA"
}

class TestServiceB extends Service<"test"> {
  public static ID = "TestServiceB"

  // Marked public to allow for testing
  public readonly serviceA = this.bind(TestServiceA)

  public emitTestEvent() {
    this.emit("test")
  }
}

describe("Service", () => {
  describe("constructor", () => {
    it("throws an error if the service is initialized without a container", () => {
      expect(() => new TestServiceA()).toThrowError(
        "Tried to initialize service with no container (ID: TestServiceA)"
      )
    })
  })

  describe("bind", () => {
    it("correctly binds the dependency service using the container", () => {
      const container = new Container()

      const serviceA = container.bind(TestServiceA)

      const serviceB = container.bind(TestServiceB)
      expect(serviceB.serviceA).toBe(serviceA)
    })
  })

  describe("getContainer", () => {
    it("returns the container the service is bound to", () => {
      const container = new Container()

      const serviceA = container.bind(TestServiceA)

      // @ts-expect-error getContainer is a protected member, we are just using it to help with testing
      expect(serviceA.getContainer()).toBe(container)
    })
  })

  describe("getEventStream", () => {
    it("returns the valid event stream of the service", () => {
      const container = new Container()

      const serviceB = container.bind(TestServiceB)

      const serviceFunc = vi.fn()

      serviceB.getEventStream().subscribe(serviceFunc)

      serviceB.emitTestEvent()

      expect(serviceFunc).toHaveBeenCalledOnce()
      expect(serviceFunc).toHaveBeenCalledWith("test")
    })
  })
})
