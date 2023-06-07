import { describe, expect, it, vi } from "vitest"
import { TestContainer } from "../lib/testing"
import { Service } from "../lib/service"
import { ContainerEvent } from "../lib/container"

class TestServiceA extends Service {
  public static ID = "TestServiceA"

  public test() {
    return "real"
  }
}

class TestServiceB extends Service {
  public static ID = "TestServiceB"

  // declared public to help with testing
  public readonly serviceA = this.bind(TestServiceA)

  public test() {
    return this.serviceA.test()
  }
}

describe("TestContainer", () => {
  describe("bindMock", () => {
    it("returns the fake service defined", () => {
      const container = new TestContainer()

      const fakeService = {
        test: () => "fake",
      }

      const result = container.bindMock(TestServiceA, fakeService)

      expect(result).toBe(fakeService)
    })

    it("new services bound to the container get the mock service", () => {
      const container = new TestContainer()

      const fakeServiceA = {
        test: () => "fake",
      }

      container.bindMock(TestServiceA, fakeServiceA)

      const serviceB = container.bind(TestServiceB)

      expect(serviceB.serviceA).toBe(fakeServiceA)
    })

    it("container emits SERVICE_BIND event", () => {
      const container = new TestContainer()

      const fakeServiceA = {
        test: () => "fake",
      }

      const serviceFunc = vi.fn<[ContainerEvent, void]>()

      container.getEventStream().subscribe((ev) => {
        serviceFunc(ev)
      })

      container.bindMock(TestServiceA, fakeServiceA)

      expect(serviceFunc).toHaveBeenCalledOnce()
      expect(serviceFunc).toHaveBeenCalledWith(<ContainerEvent>{
        type: "SERVICE_BIND",
        boundeeID: TestServiceA.ID,
        bounderID: undefined,
      })
    })

    it("throws if service already bound", () => {
      const container = new TestContainer()

      const fakeServiceA = {
        test: () => "fake",
      }

      container.bindMock(TestServiceA, fakeServiceA)

      expect(() => {
        container.bindMock(TestServiceA, fakeServiceA)
      }).toThrowError(
        "Service 'TestServiceA' already bound to container. Did you already call bindMock on this ?"
      )
    })
  })
})
