# MCP API Integration Guide

This guide explains how to integrate with the MCP client APIs in Hoppscotch, useful for developers building extensions, plugins, or automation scripts.

## Table of Contents

1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [Session Store API](#session-store-api)
4. [Connection API](#connection-api)
5. [Collections API](#collections-api)
6. [History API](#history-api)
7. [Observable Streams](#observable-streams)
8. [Examples](#examples)

## Overview

The MCP client provides several APIs for programmatic access:

- **Session Store**: Manage MCP request configuration and state
- **Connection Classes**: Interact with MCP servers
- **Collections API**: Save and load MCP requests
- **History API**: Track and retrieve past invocations
- **Observable Streams**: Subscribe to real-time updates

## Data Structures

### HoppMCPRequest

The main request type:

```typescript
import type { HoppMCPRequest } from "@hoppscotch/data"

const request: HoppMCPRequest = {
  v: 1,
  name: "My MCP Request",
  transportType: "http", // "http" | "stdio"
  httpConfig: {
    url: "https://mcp.example.com",
    method: "POST", // "GET" | "POST" | "PUT" | "PATCH"
  },
  stdioConfig: null,
  auth: {
    authType: "bearer",
    token: "your-token-here",
  },
  authActive: true,
  method: {
    methodType: "tools", // "tools" | "prompts" | "resources"
    methodName: "get_weather",
    arguments: '{"location": "San Francisco"}',
  },
}
```

### Authentication Types

```typescript
// No authentication
type MCPAuthNone = {
  authType: "none"
  authActive: false
}

// Basic authentication
type MCPAuthBasic = {
  authType: "basic"
  username: string
  password: string
}

// Bearer token
type MCPAuthBearer = {
  authType: "bearer"
  token: string
}

// API Key
type MCPAuthAPIKey = {
  authType: "api-key"
  key: string
  value: string
  addTo: "Headers" | "Query params"
}
```

### Capabilities

```typescript
type MCPCapabilities = {
  tools: Array<{
    name: string
    description?: string
    inputSchema: Record<string, any>
  }>
  prompts: Array<{
    name: string
    description?: string
    arguments?: Array<{
      name: string
      description?: string
      required?: boolean
    }>
  }>
  resources: Array<{
    uri: string
    name: string
    description?: string
    mimeType?: string
  }>
}
```

## Session Store API

### Importing

```typescript
import {
  mcpSession$,
  setMCPTransportType,
  setMCPHTTPUrl,
  setMCPHTTPMethod,
  setMCPAuth,
  setMCPAuthActive,
  setMCPMethodType,
  setMCPMethodName,
  setMCPMethodArguments,
  setMCPConnectionState,
  addMCPLog,
  clearMCPLogs,
  setMCPResponse,
  setMCPCapabilities,
  setMCPRequest,
} from "~/newstore/MCPSession"
```

### Setting Transport

```typescript
// Set to HTTP
setMCPTransportType("http")
setMCPHTTPUrl("https://mcp.example.com")
setMCPHTTPMethod("POST")

// Set to STDIO
setMCPTransportType("stdio")
```

### Configuring Authentication

```typescript
// Bearer token
setMCPAuth({
  authType: "bearer",
  token: "your-api-token",
})
setMCPAuthActive(true)

// Basic auth
setMCPAuth({
  authType: "basic",
  username: "user",
  password: "pass",
})
setMCPAuthActive(true)

// API Key
setMCPAuth({
  authType: "api-key",
  key: "X-API-Key",
  value: "your-key",
  addTo: "Headers",
})
setMCPAuthActive(true)
```

### Setting Method

```typescript
setMCPMethodType("tools")
setMCPMethodName("get_weather")
setMCPMethodArguments(JSON.stringify({
  location: "San Francisco",
  units: "metric",
}))
```

### Managing State

```typescript
// Update connection state
setMCPConnectionState("CONNECTED")

// Add log entry
addMCPLog({
  type: "INFO",
  message: "Tool invoked successfully",
  timestamp: new Date(),
})

// Clear logs
clearMCPLogs()

// Set response
setMCPResponse({
  content: [{ type: "text", text: "Temperature: 72°F" }],
})

// Set capabilities
setMCPCapabilities({
  tools: [/* ... */],
  prompts: [],
  resources: [],
})
```

### Getting Current State

```typescript
import { mcpSessionStore } from "~/newstore/MCPSession"

const currentState = mcpSessionStore.value
console.log("Current request:", currentState.request)
console.log("Connection state:", currentState.connectionState)
console.log("Logs:", currentState.logs)
```

## Connection API

### Creating Connection

```typescript
import { MCPHTTPConnection } from "~/helpers/realtime/MCPHTTPConnection"
import type { HoppMCPRequest } from "@hoppscotch/data"

const request: HoppMCPRequest = {
  // ... request configuration
}

const connection = new MCPHTTPConnection(request)
```

### Connecting

```typescript
try {
  await connection.connect()
  console.log("Connected successfully")
} catch (error) {
  console.error("Connection failed:", error)
}
```

### Loading Capabilities

```typescript
try {
  await connection.loadCapabilities()
  const capabilities = connection.capabilities$.value
  console.log("Tools:", capabilities?.tools)
  console.log("Prompts:", capabilities?.prompts)
  console.log("Resources:", capabilities?.resources)
} catch (error) {
  console.error("Failed to load capabilities:", error)
}
```

### Invoking Tool

```typescript
const toolName = "get_weather"
const args = {
  location: "San Francisco",
  units: "metric",
}

try {
  const result = await connection.invokeTool(toolName, args)
  console.log("Tool result:", result)
} catch (error) {
  console.error("Tool invocation failed:", error)
}
```

### Subscribing to Events

```typescript
const subscription = connection.event$.subscribe((event) => {
  console.log("Event:", event.type, event.data)
})

// Later, unsubscribe
subscription.unsubscribe()
```

### Disconnecting

```typescript
connection.disconnect()
```

## Collections API

### Importing

```typescript
import {
  mcpCollections$,
  addMCPCollection,
  removeMCPCollection,
  editMCPCollection,
} from "~/newstore/collections"
import { makeCollection } from "@hoppscotch/data"
```

### Adding Collection

```typescript
const newCollection = makeCollection({
  name: "Weather APIs",
  description: "Collection of weather-related MCP requests",
  folders: [],
  requests: [
    {
      // HoppMCPRequest here
    },
  ],
  auth: {
    authType: "inherit",
    authActive: false,
  },
  headers: [],
  variables: [],
})

addMCPCollection(newCollection)
```

### Getting Collections

```typescript
import { useStream } from "@composables/stream"

const collections = useStream(
  mcpCollections$,
  [],
  () => {}
)

console.log("Collections:", collections.value)
```

### Editing Collection

```typescript
const collectionIndex = 0
editMCPCollection(collectionIndex, {
  name: "Updated Name",
  description: "Updated description",
})
```

### Removing Collection

```typescript
const collectionIndex = 0
removeMCPCollection(collectionIndex)
```

## History API

### Importing

```typescript
import {
  mcpHistory$,
  addMCPHistoryEntry,
  deleteMCPHistoryEntry,
  toggleMCPHistoryEntryStar,
  clearMCPHistory,
  makeMCPHistoryEntry,
} from "~/newstore/history"
```

### Adding History Entry

```typescript
const entry = makeMCPHistoryEntry({
  request: {
    // HoppMCPRequest
  },
  response: JSON.stringify({
    content: [{ type: "text", text: "Result" }],
  }),
  star: false,
  updatedOn: new Date(),
})

addMCPHistoryEntry(entry)
```

### Getting History

```typescript
import { useStream } from "@composables/stream"

const history = useStream(
  mcpHistory$,
  [],
  () => {}
)

console.log("History:", history.value)
```

### Toggling Star

```typescript
const entry = history.value[0]
toggleMCPHistoryEntryStar(entry)
```

### Deleting Entry

```typescript
const entry = history.value[0]
deleteMCPHistoryEntry(entry)
```

### Clearing History

```typescript
clearMCPHistory()
```

## Observable Streams

### Session State

```typescript
import { mcpSession$ } from "~/newstore/MCPSession"

const subscription = mcpSession$.subscribe((state) => {
  console.log("Session updated:", state)
  console.log("Connection state:", state.connectionState)
  console.log("Current request:", state.request)
})

// Cleanup
subscription.unsubscribe()
```

### Collections

```typescript
import { mcpCollections$ } from "~/newstore/collections"

const subscription = mcpCollections$.subscribe((collections) => {
  console.log("Collections updated:", collections.length)
})
```

### History

```typescript
import { mcpHistory$ } from "~/newstore/history"

const subscription = mcpHistory$.subscribe((history) => {
  console.log("History updated:", history.length)
})
```

### Connection State

```typescript
const connection = new MCPHTTPConnection(request)

connection.connectionState$.subscribe((state) => {
  console.log("Connection state:", state)
  // DISCONNECTED | CONNECTING | CONNECTED | ERROR
})
```

### Capabilities

```typescript
connection.capabilities$.subscribe((capabilities) => {
  if (capabilities) {
    console.log("Capabilities loaded:", {
      toolsCount: capabilities.tools.length,
      promptsCount: capabilities.prompts.length,
      resourcesCount: capabilities.resources.length,
    })
  }
})
```

## Examples

### Example 1: Complete MCP Request Flow

```typescript
import { MCPHTTPConnection } from "~/helpers/realtime/MCPHTTPConnection"
import { setMCPResponse, addMCPLog } from "~/newstore/MCPSession"
import type { HoppMCPRequest } from "@hoppscotch/data"

async function invokeMCPTool() {
  // Create request
  const request: HoppMCPRequest = {
    v: 1,
    name: "Weather Request",
    transportType: "http",
    httpConfig: {
      url: "https://weather-mcp.example.com",
      method: "POST",
    },
    stdioConfig: null,
    auth: {
      authType: "bearer",
      token: "your-token",
    },
    authActive: true,
    method: {
      methodType: "tools",
      methodName: "get_weather",
      arguments: '{"location": "San Francisco"}',
    },
  }

  // Create connection
  const connection = new MCPHTTPConnection(request)

  try {
    // Connect
    await connection.connect()
    addMCPLog({
      type: "SUCCESS",
      message: "Connected to MCP server",
      timestamp: new Date(),
    })

    // Load capabilities
    await connection.loadCapabilities()
    const capabilities = connection.capabilities$.value
    addMCPLog({
      type: "INFO",
      message: `Loaded ${capabilities?.tools.length || 0} tools`,
      timestamp: new Date(),
    })

    // Invoke tool
    const result = await connection.invokeTool(
      "get_weather",
      { location: "San Francisco" }
    )

    setMCPResponse(result)
    addMCPLog({
      type: "SUCCESS",
      message: "Tool invoked successfully",
      timestamp: new Date(),
    })

    return result
  } catch (error) {
    addMCPLog({
      type: "ERROR",
      message: `Error: ${error.message}`,
      timestamp: new Date(),
    })
    throw error
  } finally {
    connection.disconnect()
  }
}
```

### Example 2: Batch Tool Invocation

```typescript
async function batchInvokeTools(
  connection: MCPHTTPConnection,
  tools: Array<{ name: string; args: any }>
) {
  const results = []

  for (const tool of tools) {
    try {
      const result = await connection.invokeTool(tool.name, tool.args)
      results.push({ success: true, result })
    } catch (error) {
      results.push({ success: false, error: error.message })
    }
  }

  return results
}

// Usage
const tools = [
  { name: "get_weather", args: { location: "NYC" } },
  { name: "get_weather", args: { location: "LA" } },
  { name: "get_weather", args: { location: "Chicago" } },
]

const results = await batchInvokeTools(connection, tools)
```

### Example 3: Auto-Save to Collection

```typescript
import { addMCPCollection } from "~/newstore/collections"
import { makeCollection } from "@hoppscotch/data"

function saveRequestToCollection(request: HoppMCPRequest) {
  const collection = makeCollection({
    name: "Auto-saved Requests",
    description: "Automatically saved MCP requests",
    folders: [],
    requests: [request],
    auth: {
      authType: "inherit",
      authActive: false,
    },
    headers: [],
    variables: [],
  })

  addMCPCollection(collection)
}

// Use after successful invocation
saveRequestToCollection(request)
```

### Example 4: Real-time Monitoring

```typescript
import { mcpSession$ } from "~/newstore/MCPSession"

class MCPMonitor {
  private subscription: any

  start() {
    this.subscription = mcpSession$.subscribe((state) => {
      // Log connection changes
      if (state.connectionState === "CONNECTED") {
        console.log("✓ Connected to MCP server")
      }

      // Log new events
      if (state.logs.length > 0) {
        const latestLog = state.logs[state.logs.length - 1]
        console.log(`[${latestLog.type}] ${latestLog.message}`)
      }

      // Log responses
      if (state.response) {
        console.log("Response received:", state.response)
      }
    })
  }

  stop() {
    if (this.subscription) {
      this.subscription.unsubscribe()
    }
  }
}

const monitor = new MCPMonitor()
monitor.start()
```

### Example 5: Custom Connection Handler

```typescript
class MCPConnectionManager {
  private connection: MCPHTTPConnection | null = null

  async connect(request: HoppMCPRequest) {
    if (this.connection) {
      this.connection.disconnect()
    }

    this.connection = new MCPHTTPConnection(request)

    // Subscribe to events
    this.connection.event$.subscribe((event) => {
      console.log("MCP Event:", event)
    })

    // Connect
    await this.connection.connect()
    await this.connection.loadCapabilities()

    return this.connection
  }

  async invoke(toolName: string, args: any) {
    if (!this.connection) {
      throw new Error("Not connected")
    }

    return await this.connection.invokeTool(toolName, args)
  }

  disconnect() {
    if (this.connection) {
      this.connection.disconnect()
      this.connection = null
    }
  }

  getCapabilities() {
    return this.connection?.capabilities$.value || null
  }
}

// Usage
const manager = new MCPConnectionManager()
await manager.connect(request)
const result = await manager.invoke("get_weather", { location: "SF" })
manager.disconnect()
```

## Best Practices

1. **Always disconnect**: Clean up connections when done
2. **Handle errors**: Wrap API calls in try-catch blocks
3. **Unsubscribe**: Clean up observable subscriptions
4. **Validate inputs**: Check arguments before invocation
5. **Type safety**: Use TypeScript types for better IDE support
6. **Log errors**: Use the logging system for debugging
7. **State management**: Use the session store for UI consistency

## TypeScript Types

All types are exported from their respective modules:

```typescript
import type { HoppMCPRequest } from "@hoppscotch/data"
import type { MCPCapabilities, ConnectionState } from "~/helpers/realtime/MCPConnection"
import type { HoppMCPSession } from "~/newstore/MCPSession"
import type { MCPHistoryEntry } from "~/newstore/history"
```

## Error Handling

```typescript
try {
  await connection.connect()
} catch (error) {
  if (error.message.includes("HTTP error")) {
    // Handle HTTP errors
    console.error("Server error:", error)
  } else if (error.message.includes("Network")) {
    // Handle network errors
    console.error("Network error:", error)
  } else {
    // Handle other errors
    console.error("Unknown error:", error)
  }
}
```

## Support

For questions or issues:

- GitHub Issues: https://github.com/hoppscotch/hoppscotch/issues
- Discord: https://hoppscotch.io/discord
- Documentation: https://docs.hoppscotch.io
