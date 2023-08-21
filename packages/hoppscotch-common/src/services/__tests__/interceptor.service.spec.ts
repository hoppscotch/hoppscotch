import { describe, expect, it, vi } from "vitest"
import { Interceptor, InterceptorService } from "../interceptor.service"
import { TestContainer } from "dioc/testing"

describe("InterceptorService", () => {
  it("initally there are no interceptors defined", () => {
    const container = new TestContainer()

    const service = container.bind(InterceptorService)

    expect(service.availableInterceptors.value).toEqual([])
  })

  it("currentInterceptorID should be null if no interceptors are defined", () => {
    const container = new TestContainer()

    const service = container.bind(InterceptorService)

    expect(service.currentInterceptorID.value).toBeNull()
  })

  it("currentInterceptorID should be set if there is an interceptor defined", () => {
    const container = new TestContainer()

    const service = container.bind(InterceptorService)

    service.registerInterceptor({
      interceptorID: "test",
      name: () => "Test Interceptor",
      selectable: { type: "selectable" },
      runRequest: () => {
        throw new Error("Not implemented")
      },
    })

    expect(service.currentInterceptorID.value).toEqual("test")
  })

  it("currentInterceptorID cannot be set to null if there are interceptors defined", () => {
    const container = new TestContainer()

    const service = container.bind(InterceptorService)

    service.registerInterceptor({
      interceptorID: "test",
      name: () => "Test Interceptor",
      selectable: { type: "selectable" },
      runRequest: () => {
        throw new Error("Not implemented")
      },
    })

    service.currentInterceptorID.value = null
    expect(service.currentInterceptorID.value).not.toBeNull()
  })

  it("currentInterceptorID cannot be set to an unknown interceptor ID", () => {
    const container = new TestContainer()

    const service = container.bind(InterceptorService)

    service.registerInterceptor({
      interceptorID: "test",
      name: () => "Test Interceptor",
      selectable: { type: "selectable" },
      runRequest: () => {
        throw new Error("Not implemented")
      },
    })

    service.currentInterceptorID.value = "unknown"
    expect(service.currentInterceptorID.value).not.toEqual("unknown")
  })

  describe("registerInterceptor", () => {
    it("should register the interceptor", () => {
      const container = new TestContainer()

      const service = container.bind(InterceptorService)

      const interceptor: Interceptor = {
        interceptorID: "test",
        name: () => "Test Interceptor",
        selectable: { type: "selectable" },
        runRequest: () => {
          throw new Error("Not implemented")
        },
      }

      service.registerInterceptor(interceptor)

      expect(service.availableInterceptors.value).toEqual([interceptor])
    })

    it("should set the current interceptor ID to non-null after the intiial registration", () => {
      const container = new TestContainer()

      const service = container.bind(InterceptorService)

      const interceptor: Interceptor = {
        interceptorID: "test",
        name: () => "Test Interceptor",
        selectable: { type: "selectable" },
        runRequest: () => {
          throw new Error("Not implemented")
        },
      }

      service.registerInterceptor(interceptor)

      expect(service.currentInterceptorID.value).not.toBeNull()
    })
  })

  describe("runRequest", () => {
    it("should throw an error if no interceptor is selected", () => {
      const container = new TestContainer()

      const service = container.bind(InterceptorService)

      expect(() => service.runRequest({})).toThrowError()
    })

    it("asks the current interceptor to run the request", () => {
      const container = new TestContainer()

      const service = container.bind(InterceptorService)

      const interceptor: Interceptor = {
        interceptorID: "test",
        name: () => "Test Interceptor",
        selectable: { type: "selectable" },
        runRequest: vi.fn(),
      }

      service.registerInterceptor(interceptor)

      service.runRequest({})

      expect(interceptor.runRequest).toHaveBeenCalled()
    })
  })
})
