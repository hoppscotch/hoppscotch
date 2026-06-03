import { describe, expect, it, beforeEach } from "vitest"
import {
  setMCPTransportType,
  setMCPAuth,
  setMCPCapabilities,
  setMCPRequest,
  setMCPHTTPConfig,
  setMCPSTDIOConfig,
  addMCPEnvVar,
  deleteMCPEnvVar,
  updateMCPEnvVar,
  deleteAllMCPEnvVars,
  addMCPLogLine,
  MCPTransportType$,
  MCPAuth$,
  MCPCapabilities$,
  MCPHTTPConfig$,
  MCPSTDIOConfig$,
  MCPLog$,
} from "../MCPSession"
import type { MCPCapabilities } from "~/helpers/realtime/MCPConnection"
import { firstValueFrom } from "rxjs"

describe("MCPSession Store", () => {
  beforeEach(() => {
    setMCPRequest()
  })

  describe("Transport Configuration", () => {
    it("should set transport type to HTTP", async () => {
      setMCPTransportType("http")
      const type = await firstValueFrom(MCPTransportType$)
      expect(type).toBe("http")
    })

    it("should set transport type to STDIO", async () => {
      setMCPTransportType("stdio")
      const type = await firstValueFrom(MCPTransportType$)
      expect(type).toBe("stdio")
    })

    it("should set HTTP config URL", async () => {
      setMCPHTTPConfig({ url: "https://mcp.example.com" })
      const config = await firstValueFrom(MCPHTTPConfig$)
      expect(config?.url).toBe("https://mcp.example.com")
    })

    it("should set STDIO config", async () => {
      setMCPSTDIOConfig({ command: "npx mcp-server", args: [], env: [] })
      const config = await firstValueFrom(MCPSTDIOConfig$)
      expect(config?.command).toBe("npx mcp-server")
    })
  })

  describe("Authentication", () => {
    it("should set none auth", async () => {
      setMCPAuth({ authType: "none", authActive: false })
      const auth = await firstValueFrom(MCPAuth$)
      expect(auth.authType).toBe("none")
    })

    it("should set basic auth with credentials", async () => {
      setMCPAuth({
        authType: "basic",
        authActive: true,
        username: "testuser",
        password: "testpass",
      })
      const auth = await firstValueFrom(MCPAuth$)
      expect(auth.authType).toBe("basic")
      if (auth.authType === "basic") {
        expect(auth.username).toBe("testuser")
        expect(auth.password).toBe("testpass")
      }
    })

    it("should set bearer auth with token", async () => {
      setMCPAuth({ authType: "bearer", authActive: true, token: "tok-123" })
      const auth = await firstValueFrom(MCPAuth$)
      expect(auth.authType).toBe("bearer")
      if (auth.authType === "bearer") {
        expect(auth.token).toBe("tok-123")
      }
    })

    it("should set API key auth", async () => {
      setMCPAuth({
        authType: "api-key",
        authActive: true,
        key: "X-API-Key",
        value: "val",
        addTo: "HEADERS",
      })
      const auth = await firstValueFrom(MCPAuth$)
      expect(auth.authType).toBe("api-key")
      if (auth.authType === "api-key") {
        expect(auth.key).toBe("X-API-Key")
      }
    })
  })

  describe("Capabilities", () => {
    it("should set capabilities with tools", async () => {
      const capabilities: MCPCapabilities = {
        tools: [
          {
            name: "get_weather",
            description: "Get weather info",
            inputSchema: { type: "object", properties: {} },
          },
        ],
        prompts: [],
        resources: [],
      }
      setMCPCapabilities(capabilities)
      const caps = await firstValueFrom(MCPCapabilities$)
      expect(caps?.tools).toHaveLength(1)
      expect(caps?.tools[0].name).toBe("get_weather")
    })

    it("should clear capabilities with null", async () => {
      setMCPCapabilities({
        tools: [{ name: "test", inputSchema: {} }],
        prompts: [],
        resources: [],
      })
      setMCPCapabilities(null)
      const caps = await firstValueFrom(MCPCapabilities$)
      expect(caps).toBeNull()
    })
  })

  describe("Env Vars (STDIO)", () => {
    beforeEach(() => {
      setMCPSTDIOConfig({ command: "npx mcp", args: [], env: [] })
    })

    it("should add env var", async () => {
      addMCPEnvVar({ key: "FOO", value: "bar", active: true })
      const config = await firstValueFrom(MCPSTDIOConfig$)
      expect(config?.env).toHaveLength(1)
      expect(config?.env[0].key).toBe("FOO")
    })

    it("should delete env var by index", async () => {
      addMCPEnvVar({ key: "A", value: "1", active: true })
      addMCPEnvVar({ key: "B", value: "2", active: true })
      deleteMCPEnvVar(0)
      const config = await firstValueFrom(MCPSTDIOConfig$)
      expect(config?.env).toHaveLength(1)
      expect(config?.env[0].key).toBe("B")
    })

    it("should update env var at index", async () => {
      addMCPEnvVar({ key: "OLD", value: "x", active: true })
      updateMCPEnvVar(0, { key: "NEW", value: "y", active: false })
      const config = await firstValueFrom(MCPSTDIOConfig$)
      expect(config?.env[0].key).toBe("NEW")
      expect(config?.env[0].active).toBe(false)
    })

    it("should delete all env vars", async () => {
      addMCPEnvVar({ key: "A", value: "1", active: true })
      addMCPEnvVar({ key: "B", value: "2", active: true })
      deleteAllMCPEnvVars()
      const config = await firstValueFrom(MCPSTDIOConfig$)
      expect(config?.env).toHaveLength(0)
    })
  })

  describe("Log Lines", () => {
    it("should add a log line", async () => {
      setMCPRequest()
      addMCPLogLine({
        payload: "test message",
        source: "info",
        ts: Date.now(),
      })
      const log = await firstValueFrom(MCPLog$)
      expect(log.length).toBeGreaterThan(0)
      expect(log[log.length - 1].payload).toBe("test message")
    })
  })
})
