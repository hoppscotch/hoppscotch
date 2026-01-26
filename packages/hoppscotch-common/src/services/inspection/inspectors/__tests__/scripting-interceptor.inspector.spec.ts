import { TestContainer } from "dioc/testing"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { ScriptingInterceptorInspectorService } from "../scripting-interceptor.inspector"
import { InspectionService } from "../../index"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { ref } from "vue"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

// Mock platform module with mutable feature flags for testing
// Cannot reference external variables in vi.mock due to hoisting
vi.mock("~/platform", () => ({
  __esModule: true,
  platform: {
    platformFeatureFlags: {
      exportAsGIST: false,
      hasTelemetry: false,
      cookiesEnabled: false,
      promptAsUsingCookies: false,
      hasCookieBasedAuth: false,
    },
  },
}))

vi.mock("~/modules/i18n", () => ({
  __esModule: true,
  getI18n: () => (x: string, params?: Record<string, string>) => {
    if (!params) return x
    // Simple parameter replacement for testing
    return Object.entries(params).reduce(
      (str, [key, value]) => str.replace(`{${key}}`, value),
      x
    )
  },
}))

// Import platform after mocking to get the mocked version
import { platform } from "~/platform"

// Mock window.location for same-origin detection tests
const originalLocation = global.window?.location
beforeEach(() => {
  if (global.window) {
    delete (global.window as any).location
    global.window.location = {
      ...originalLocation,
      origin: "https://example.com",
      href: "https://example.com/",
      hostname: "example.com",
    } as any
  }
})

afterEach(() => {
  // Restore original location to prevent test leakage
  if (global.window && originalLocation) {
    delete (global.window as any).location
    global.window.location = originalLocation
  }
})

describe("ScriptingInterceptorInspectorService", () => {
  it("registers with the inspection service upon initialization", () => {
    const container = new TestContainer()

    const registerInspectorFn = vi.fn()

    container.bindMock(InspectionService, {
      registerInspector: registerInspectorFn,
    })

    container.bindMock(KernelInterceptorService, {
      getCurrentId: () => "browser",
    })

    const inspector = container.bind(ScriptingInterceptorInspectorService)

    expect(registerInspectorFn).toHaveBeenCalledOnce()
    expect(registerInspectorFn).toHaveBeenCalledWith(inspector)
  })

  describe("unsupported interceptor warnings", () => {
    it("should warn when using Extension interceptor with hopp.fetch()", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: `
          const response = await hopp.fetch('https://api.example.com/data')
          const data = await response.json()
        `,
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "unsupported-interceptor",
          severity: 2,
          isApplicable: true,
          locations: { type: "response" },
        })
      )
    })

    it("should warn when using Proxy interceptor with pm.sendRequest()", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "proxy",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        testScript: `
          pm.sendRequest('https://api.example.com/data', (err, res) => {
            pm.expect(res.code).toBe(200)
          })
        `,
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "unsupported-interceptor",
          severity: 2,
          isApplicable: true,
        })
      )
    })

    it("should warn when using Extension interceptor with fetch()", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: `
          const response = await fetch('https://api.example.com/data')
          const data = await response.json()
        `,
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "unsupported-interceptor",
          severity: 2,
        })
      )
    })

    it("should NOT warn when using Agent interceptor with fetch APIs", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "agent",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('https://api.example.com')",
      })

      const result = inspector.getInspections(req, ref(null))

      // Should not have unsupported-interceptor warning
      expect(
        result.value.find((r) => r.id === "unsupported-interceptor")
      ).toBeUndefined()
    })

    it("should NOT warn when using Browser interceptor with fetch APIs (unless same-origin)", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript:
          "await hopp.fetch('https://different-origin.com/api')",
      })

      const result = inspector.getInspections(req, ref(null))

      // Should not have unsupported-interceptor warning for different origin
      expect(
        result.value.find((r) => r.id === "unsupported-interceptor")
      ).toBeUndefined()
    })
  })

  describe("same-origin CSRF warnings (cookie-based auth only)", () => {
    it("should warn when using Browser + relative URL with hasCookieBasedAuth", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      // Mock platform with cookie-based auth
      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('/api/data')",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "same-origin-fetch-csrf",
          severity: 2,
          isApplicable: true,
        })
      )
    })

    it("should warn when using Browser + same-origin absolute URL", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        testScript: "pm.sendRequest('https://example.com/api/data', () => {})",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "same-origin-fetch-csrf",
          severity: 2,
        })
      )
    })

    it("should warn for pm.sendRequest with request object containing relative URL", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        testScript: `
          pm.sendRequest({
            url: '/api/users',
            method: 'POST'
          }, (err, res) => {
            pm.expect(res.code).toBe(200)
          })
        `,
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "same-origin-fetch-csrf",
          severity: 2,
        })
      )
    })

    it("should warn for pm.sendRequest with request object containing same-origin URL", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: `
          pm.sendRequest({
            url: 'https://example.com/api/data',
            method: 'GET'
          }, (err, res) => {})
        `,
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "same-origin-fetch-csrf",
        })
      )
    })

    it("should warn when script uses window.location", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: `
          const url = window.location.origin + '/api/data'
          await hopp.fetch(url)
        `,
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toContainEqual(
        expect.objectContaining({
          id: "same-origin-fetch-csrf",
        })
      )
    })

    it("should NOT warn when hasCookieBasedAuth is false", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      // No cookie-based auth (desktop or cloud)
      platform.platformFeatureFlags.hasCookieBasedAuth = false

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('/api/data')",
      })

      const result = inspector.getInspections(req, ref(null))

      // Should not have CSRF warning
      expect(
        result.value.find((r) => r.id === "same-origin-fetch-csrf")
      ).toBeUndefined()
    })

    it("should NOT warn for different-origin URLs", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('https://different.com/api')",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(
        result.value.find((r) => r.id === "same-origin-fetch-csrf")
      ).toBeUndefined()
    })

    it("should NOT warn when using Agent interceptor (even with same-origin)", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "agent",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('/api/data')",
      })

      const result = inspector.getInspections(req, ref(null))

      // Agent doesn't have CSRF concerns
      expect(
        result.value.find((r) => r.id === "same-origin-fetch-csrf")
      ).toBeUndefined()
    })
  })

  describe("fetch API detection", () => {
    it("should detect hopp.fetch() in pre-request script", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "const res = await hopp.fetch('https://api.com')",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value.length).toBeGreaterThan(0)
    })

    it("should detect pm.sendRequest() in test script", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        testScript: "pm.sendRequest('https://api.com', () => {})",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value.length).toBeGreaterThan(0)
    })

    it("should detect fetch() in script (but not hopp.fetch)", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "const res = await fetch('https://api.com')",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value.length).toBeGreaterThan(0)
    })

    it("should NOT detect hopp.fetch when script is empty", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "",
        testScript: "",
      })

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toEqual([])
    })

    it("should detect fetch in both pre-request and test scripts", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "extension",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('https://api.com/1')",
        testScript: "pm.sendRequest('https://api.com/2', () => {})",
      })

      const result = inspector.getInspections(req, ref(null))

      // Should have warning for unsupported interceptor
      expect(result.value.length).toBeGreaterThan(0)
    })
  })

  describe("edge cases", () => {
    it("should handle requests without scripts gracefully", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref(getDefaultRESTRequest())

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toEqual([])
    })

    it("should handle response-type requests (history)", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      // Response-type request doesn't have preRequestScript/testScript
      const req = ref({
        endpoint: "https://api.example.com",
        method: "GET",
        headers: [],
      } as any)

      const result = inspector.getInspections(req, ref(null))

      expect(result.value).toEqual([])
    })

    it("should handle invalid URLs gracefully", () => {
      const container = new TestContainer()

      container.bindMock(KernelInterceptorService, {
        getCurrentId: () => "browser",
      })

      platform.platformFeatureFlags.hasCookieBasedAuth = true

      const inspector = container.bind(ScriptingInterceptorInspectorService)

      const req = ref({
        ...getDefaultRESTRequest(),
        preRequestScript: "await hopp.fetch('not-a-valid-url')",
      })

      const result = inspector.getInspections(req, ref(null))

      // Should not crash, may or may not have warnings depending on detection
      expect(result.value).toBeDefined()
    })
  })
})
