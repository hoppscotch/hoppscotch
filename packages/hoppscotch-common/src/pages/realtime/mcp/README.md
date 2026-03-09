# Model Context Protocol (MCP) Client

The MCP client in Hoppscotch enables you to connect to MCP servers, discover their capabilities, and invoke tools, prompts, and resources.

## Overview

Model Context Protocol (MCP) is Anthropic's protocol for enabling AI assistants to interact with external tools and data sources. This implementation provides:

- **HTTP Transport**: JSON-RPC 2.0 over HTTP/SSE
- **STDIO Transport**: Process-based communication (requires Hoppscotch Agent or Desktop App)
- **Authentication**: Support for None, Basic, Bearer, and API Key authentication
- **Capability Discovery**: Automatic detection of available tools, prompts, and resources
- **Collections**: Save and organize MCP requests
- **History**: Track all method invocations

## Getting Started

### 1. Navigate to MCP

Go to **Realtime** → **MCP** in the main navigation.

### 2. Choose Transport

Select your transport type:

- **HTTP**: For MCP servers with HTTP endpoints
- **STDIO**: For local MCP servers (requires Agent/Desktop App)

### 3. Configure Connection

#### HTTP Transport

1. Enter the server URL (e.g., `https://mcp.example.com`)
2. Choose HTTP method (typically `POST`)
3. Configure authentication if required

#### STDIO Transport

1. Enter the command to start the MCP server (e.g., `npx @modelcontextprotocol/server-filesystem`)
2. Add any required arguments

### 4. Configure Authentication

Choose from:

- **None**: No authentication
- **Basic Auth**: Username and password
- **Bearer Token**: API token
- **API Key**: Custom header with API key

### 5. Connect

Click **Connect** to establish a connection to the MCP server.

## Features

### Capability Discovery

After connecting, capabilities are automatically loaded:

- **Tools**: Executable functions provided by the server
- **Prompts**: Pre-configured prompt templates
- **Resources**: Available data resources

### Invoking Tools

1. Navigate to the **Tools** tab
2. Find the tool you want to invoke
3. Click on the tool to expand details
4. Enter arguments in JSON format
5. Click **Invoke**

Example arguments:
```json
{
  "location": "San Francisco",
  "units": "metric"
}
```

### Using Prompts

1. Navigate to the **Prompts** tab
2. Select a prompt
3. Provide required arguments
4. Click **Invoke**

### Accessing Resources

1. Navigate to the **Resources** tab
2. Browse available resources
3. Click to view resource details
4. Use the resource URI for further operations

### Event Logs

The **Logs** tab shows real-time events:

- Connection status changes
- Capability discovery
- Method invocations
- Errors and responses

### Response Viewer

The **Response** tab displays:

- Formatted JSON response
- Response metadata
- Execution time
- Status information

## Collections

### Saving Requests

1. Configure your MCP request
2. Click **Save** in the collections panel
3. Enter a name and description
4. The request is saved with full configuration

### Loading Saved Requests

1. Browse your collections
2. Click on a saved request
3. The configuration is loaded into the session

### Organizing Collections

- Create multiple collections for different MCP servers
- Edit collection names and descriptions
- Delete collections you no longer need

## History

All method invocations are automatically saved to history:

- View past invocations
- See request and response details
- Re-invoke from history
- Star important requests
- Search and filter history

## Examples

### Example 1: Weather Tool

**Transport**: HTTP
**URL**: `https://weather-mcp.example.com`
**Auth**: Bearer Token

**Tool**: `get_weather`
**Arguments**:
```json
{
  "location": "New York",
  "units": "fahrenheit"
}
```

### Example 2: File System (STDIO)

**Transport**: STDIO
**Command**: `npx @modelcontextprotocol/server-filesystem`
**Args**: `/path/to/directory`

**Tool**: `read_file`
**Arguments**:
```json
{
  "path": "README.md"
}
```

### Example 3: Code Review Prompt

**Transport**: HTTP
**URL**: `https://ai-mcp.example.com`

**Prompt**: `code_review`
**Arguments**:
```json
{
  "code": "function hello() { return 'world'; }",
  "language": "javascript"
}
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to HTTP server
**Solution**:
- Verify the URL is correct
- Check authentication credentials
- Ensure the server is running
- Check CORS settings on the server

**Problem**: STDIO transport not working
**Solution**:
- Ensure Hoppscotch Agent or Desktop App is installed
- Verify the command path is correct
- Check command permissions

### Authentication Errors

**Problem**: 401 Unauthorized
**Solution**:
- Verify authentication type matches server requirements
- Check credentials are correct
- Ensure auth is enabled (toggle on)

### Capability Discovery Fails

**Problem**: No tools/prompts/resources shown
**Solution**:
- Click **Load Capabilities** manually
- Check server logs for errors
- Verify server implements capability endpoints

### Invalid Arguments

**Problem**: Tool invocation fails with invalid arguments
**Solution**:
- Ensure JSON is valid (use JSON validator)
- Check argument schema in tool details
- Verify required fields are provided

## Technical Details

### JSON-RPC 2.0

All HTTP communication uses JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "location": "San Francisco"
    }
  }
}
```

### Protocol Methods

- `initialize`: Establish connection
- `tools/list`: List available tools
- `tools/call`: Invoke a tool
- `prompts/list`: List available prompts
- `prompts/get`: Get prompt details
- `resources/list`: List available resources
- `resources/read`: Read resource content

### State Management

The MCP session uses RxJS observables for reactive state:

- `connectionState$`: Connection status
- `capabilities$`: Available capabilities
- `event$`: Real-time events

## References

- [MCP Specification](https://modelcontextprotocol.io/)
- [Postman MCP Documentation](https://learning.postman.com/docs/postman-ai/mcp-requests/create)
- [MCP Server Examples](https://github.com/modelcontextprotocol/servers)

## Architecture

### Data Layer

- **@hoppscotch/data**: Versioned schema definitions
- **Zod Validation**: Runtime type checking
- **Verzod Pattern**: Version management

### Connection Layer

- **MCPConnection**: Abstract base class
- **MCPHTTPConnection**: HTTP transport implementation
- **MCPSTDIOConnection**: STDIO transport implementation

### State Layer

- **MCPSession Store**: Centralized state management
- **DispatchingStore Pattern**: Action-based updates
- **Observable Streams**: Reactive data flow

### UI Layer

- **Vue 3 Composition API**: Component architecture
- **12 Components**: Modular UI elements
- **Real-time Updates**: Event-driven rendering

## Contributing

When contributing to the MCP client:

1. Follow existing code patterns
2. Add tests for new features
3. Update this documentation
4. Ensure TypeScript type safety
5. Run linting before committing

See [CONTRIBUTING.md](../../../../../../../CONTRIBUTING.md) for general guidelines.
