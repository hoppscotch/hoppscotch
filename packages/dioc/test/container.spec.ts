import { it, expect, describe, vi } from "vitest"
import { Service } from "../lib/service"
import { Container, currentContainer, ContainerEvent } from "../lib/container"

class TestServiceA extends Service {
  public static ID = "TestServiceA"
}

class TestServiceB extends Service {
  public static ID = "TestServiceB"

  // Marked public to allow for testing
  public readonly serviceA = this.bind(TestServiceA)
}

describe("Container", () => {
  describe("getBoundServiceWithID", () => {
    it("returns the service instance if it is bound to the container", () => {
      const container = new Container()

      const service = container.bind(TestServiceA)

      expect(container.getBoundServiceWithID(TestServiceA.ID)).toBe(service)
    })

    it("returns undefined if the service is not bound to the container", () => {
      const container = new Container()

      expect(container.getBoundServiceWithID(TestServiceA.ID)).toBeUndefined()
    })
  })

  describe("bind", () => {
    it("correctly binds the service to it", () => {
      const container = new Container()

      const service = container.bind(TestServiceA)

      // @ts-expect-error getContainer is defined as a protected property, but we are leveraging it here to check
      expect(service.getContainer()).toBe(container)
    })

    it("after bind, the current container is set back to its previous value", () => {
      const originalValue = currentContainer

      const container = new Container()
      container.bind(TestServiceA)

      expect(currentContainer).toBe(originalValue)
    })

    it("dependent services are registered in the same container", () => {
      const container = new Container()

      const serviceB = container.bind(TestServiceB)

      // @ts-expect-error getContainer is defined as a protected property, but we are leveraging it here to check
      expect(serviceB.serviceA.getContainer()).toBe(container)
    })

    it("binding an already initialized service returns the initialized instance (services are singletons)", () => {
      const container = new Container()

      const serviceA = container.bind(TestServiceA)
      const serviceA2 = container.bind(TestServiceA)

      expect(serviceA).toBe(serviceA2)
    })

    it("binding a service which is a dependency of another service returns the same instance created from the dependency resolution (services are singletons)", () => {
      const container = new Container()

      const serviceB = container.bind(TestServiceB)
      const serviceA = container.bind(TestServiceA)

      expect(serviceB.serviceA).toBe(serviceA)
    })

    it("binding an initialized service as a dependency returns the same instance", () => {
      const container = new Container()

      const serviceA = container.bind(TestServiceA)
      const serviceB = container.bind(TestServiceB)

      expect(serviceB.serviceA).toBe(serviceA)
    })

    it("container emits an init event when an uninitialized service is initialized via bind and event only called once", () => {
      const container = new Container()

      const serviceFunc = vi.fn<
        [ContainerEvent & { type: "SERVICE_INIT" }],
        void
      >()

      container.getEventStream().subscribe((ev) => {
        if (ev.type === "SERVICE_INIT") {
          serviceFunc(ev)
        }
      })

      const instance = container.bind(TestServiceA)

      expect(serviceFunc).toHaveBeenCalledOnce()
      expect(serviceFunc).toHaveBeenCalledWith(<ContainerEvent>{
        type: "SERVICE_INIT",
        serviceID: TestServiceA.ID,
      })
    })

    it("the bind event emitted has an undefined bounderID when the service is bound directly to the container", () => {
      const container = new Container()

      const serviceFunc = vi.fn<
        [ContainerEvent & { type: "SERVICE_BIND" }],
        void
      >()

      container.getEventStream().subscribe((ev) => {
        if (ev.type === "SERVICE_BIND") {
          serviceFunc(ev)
        }
      })

      container.bind(TestServiceA)

      expect(serviceFunc).toHaveBeenCalledOnce()
      expect(serviceFunc).toHaveBeenCalledWith(<ContainerEvent>{
        type: "SERVICE_BIND",
        boundeeID: TestServiceA.ID,
        bounderID: undefined,
      })
    })

    it("the bind event emitted has the correct bounderID when the service is bound to another service", () => {
      const container = new Container()

      const serviceFunc = vi.fn<
        [ContainerEvent & { type: "SERVICE_BIND" }],
        void
      >()

      container.getEventStream().subscribe((ev) => {
        // We only care about the bind event of TestServiceA
        if (ev.type === "SERVICE_BIND" && ev.boundeeID === TestServiceA.ID) {
          serviceFunc(ev)
        }
      })

      container.bind(TestServiceB)

      expect(serviceFunc).toHaveBeenCalledOnce()
      expect(serviceFunc).toHaveBeenCalledWith(<ContainerEvent>{
        type: "SERVICE_BIND",
        boundeeID: TestServiceA.ID,
        bounderID: TestServiceB.ID,
      })
    })
  })

  describe("hasBound", () => {
    it("returns true if the given service is bound to the container", () => {
      const container = new Container()

      container.bind(TestServiceA)

      expect(container.hasBound(TestServiceA)).toEqual(true)
    })

    it("returns false if the given service is not bound to the container", () => {
      const container = new Container()

      expect(container.hasBound(TestServiceA)).toEqual(false)
    })

    it("returns true when the service is bound because it is a dependency of another service", () => {
      const container = new Container()

      container.bind(TestServiceB)

      expect(container.hasBound(TestServiceA)).toEqual(true)
    })
  })

  describe("getEventStream", () => {
    it("returns an observable which emits events correctly when services are initialized", () => {
      const container = new Container()

      const serviceFunc = vi.fn<
        [ContainerEvent & { type: "SERVICE_INIT" }],
        void
      >()

      container.getEventStream().subscribe((ev) => {
        if (ev.type === "SERVICE_INIT") {
          serviceFunc(ev)
        }
      })

      container.bind(TestServiceB)

      expect(serviceFunc).toHaveBeenCalledTimes(2)
      expect(serviceFunc).toHaveBeenNthCalledWith(1, <ContainerEvent>{
        type: "SERVICE_INIT",
        serviceID: TestServiceA.ID,
      })
      expect(serviceFunc).toHaveBeenNthCalledWith(2, <ContainerEvent>{
        type: "SERVICE_INIT",
        serviceID: TestServiceB.ID,
      })
    })

    it("returns an observable which emits events correctly when services are bound", () => {
      const container = new Container()

      const serviceFunc = vi.fn<
        [ContainerEvent & { type: "SERVICE_BIND" }],
        void
      >()

      container.getEventStream().subscribe((ev) => {
        if (ev.type === "SERVICE_BIND") {
          serviceFunc(ev)
        }
      })

      container.bind(TestServiceB)

      expect(serviceFunc).toHaveBeenCalledTimes(2)
      expect(serviceFunc).toHaveBeenNthCalledWith(1, <ContainerEvent>{
        type: "SERVICE_BIND",
        boundeeID: TestServiceA.ID,
        bounderID: TestServiceB.ID,
      })
      expect(serviceFunc).toHaveBeenNthCalledWith(2, <ContainerEvent>{
        type: "SERVICE_BIND",
        boundeeID: TestServiceB.ID,
        bounderID: undefined,
      })
    })
  })

  describe("getBoundServices", () => {
    it("returns an iterator over all services bound to the container in the format [service id, service instance]", () => {
      const container = new Container()

      const instanceB = container.bind(TestServiceB)
      const instanceA = instanceB.serviceA

      expect(Array.from(container.getBoundServices())).toEqual([
        [TestServiceA.ID, instanceA],
        [TestServiceB.ID, instanceB],
      ])
    })

    it("returns an empty iterator if no services are bound", () => {
      const container = new Container()

      expect(Array.from(container.getBoundServices())).toEqual([])
    })
  })
})
