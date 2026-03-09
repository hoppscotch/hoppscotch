# MCP Feature Testing Guide

This document describes how to test the Model Context Protocol (MCP) client implementation in Hoppscotch.

## Test Coverage

The MCP implementation includes comprehensive unit tests for:

### 1. Data Schema Tests
**Location**: `packages/hoppscotch-data/src/mcp/__tests__/index.spec.ts`

Tests cover:
- Default request creation
- Schema validation with Zod
- Version management
- Transport configuration (HTTP/STDIO)
- Authentication types (None, Basic, Bearer, API Key)
- Method types (tools, prompts, resources)
- Request translation and migration

### 2. HTTP Connection Tests
**Location**: `packages/hoppscotch-common/src/helpers/realtime/__tests__/MCPHTTPConnection.spec.ts`

Tests cover:
- Connection state management
- Authentication header generation
- Capability loading (tools, prompts, resources)
- Tool invocation with arguments
- JSON-RPC 2.0 protocol compliance
- Error handling for HTTP errors and network failures
- Request ID incrementing

### 3. Session Store Tests
**Location**: `packages/hoppscotch-common/src/newstore/__tests__/MCPSession.spec.ts`

Tests cover:
- Transport configuration
- Authentication management
- Method configuration
- Connection state tracking
- Event logging
- Response handling
- Capabilities management
- Observable state streams

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Specific Package Tests

```bash
# Test data schemas
cd packages/hoppscotch-data
pnpm test

# Test common package (includes MCP tests)
cd packages/hoppscotch-common
pnpm test
```

### Run Specific Test Files

```bash
# Test MCP data schemas
pnpm test packages/hoppscotch-data/src/mcp/__tests__/index.spec.ts

# Test HTTP connection
pnpm test packages/hoppscotch-common/src/helpers/realtime/__tests__/MCPHTTPConnection.spec.ts

# Test session store
pnpm test packages/hoppscotch-common/src/newstore/__tests__/MCPSession.spec.ts
```

### Watch Mode

```bash
pnpm test --watch
```

### Coverage Report

```bash
pnpm test --coverage
```

## Manual Testing

### Testing HTTP Transport

1. **Start a Test MCP Server**

   Use the reference MCP server:
   ```bash
   npx @modelcontextprotocol/server-everything
   ```

2. **Configure Hoppscotch**
   - Navigate to Realtime → MCP
   - Select HTTP transport
   - Enter URL: `http://localhost:3000` (or your server URL)
   - Choose POST method
   - Select authentication if required

3. **Test Connection**
   - Click "Connect"
   - Verify connection state changes to CONNECTED
   - Check logs for successful initialize message

4. **Test Capability Discovery**
   - Click "Load Capabilities"
   - Verify tools, prompts, and resources appear in respective tabs
   - Check that counts are displayed correctly

5. **Test Tool Invocation**
   - Navigate to Tools tab
   - Select a tool (e.g., "echo")
   - Enter valid JSON arguments: `{"message": "Hello MCP"}`
   - Click "Invoke"
   - Verify response appears in Response tab

### Testing STDIO Transport

**Prerequisites**: Hoppscotch Agent or Desktop App

1. **Configure STDIO Transport**
   - Select STDIO transport
   - Enter command: `npx @modelcontextprotocol/server-filesystem`
   - Add argument: `/tmp` (or any directory path)

2. **Test Connection**
   - Click "Connect"
   - Verify connection establishes via Agent
   - Check logs for process spawn messages

3. **Test File Operations**
   - Use `read_file` tool with path argument
   - Use `list_directory` tool to browse
   - Verify file content in response

### Testing Authentication

#### Basic Auth
1. Configure Basic authentication
2. Enter username and password
3. Enable auth toggle
4. Connect and verify Authorization header is sent

#### Bearer Token
1. Configure Bearer authentication
2. Enter token value
3. Enable auth toggle
4. Connect and verify Bearer token is sent

#### API Key
1. Configure API Key authentication
2. Set custom header name (e.g., "X-API-Key")
3. Enter key value
4. Enable auth toggle
5. Connect and verify custom header is sent

### Testing Collections

1. **Save Request**
   - Configure an MCP request
   - Click "Save" in collections panel
   - Enter name and description
   - Verify request is saved

2. **Load Request**
   - Browse collections
   - Click on saved request
   - Verify all configuration is loaded correctly

3. **Edit Collection**
   - Click edit icon on collection
   - Change name/description
   - Verify changes are saved

4. **Delete Collection**
   - Click delete icon
   - Confirm deletion
   - Verify collection is removed

### Testing History

1. **Invoke Multiple Methods**
   - Invoke several tools/prompts
   - Verify each invocation appears in history

2. **Star Entries**
   - Click star icon on history entry
   - Verify starred items are highlighted

3. **Search History**
   - Enter search term in history search
   - Verify filtering works correctly

4. **Delete Entry**
   - Click delete on history entry
   - Verify entry is removed

## Test Scenarios

### Scenario 1: Weather Tool
**Setup**: HTTP MCP server with weather tool

1. Connect to server
2. Load capabilities
3. Find "get_weather" tool
4. Invoke with: `{"location": "San Francisco", "units": "metric"}`
5. Verify response contains temperature data

### Scenario 2: Code Review Prompt
**Setup**: HTTP MCP server with code review prompt

1. Connect to server
2. Navigate to Prompts tab
3. Select "code_review" prompt
4. Provide code snippet argument
5. Verify response contains review feedback

### Scenario 3: File System Resource
**Setup**: STDIO MCP server with file system access

1. Connect with STDIO transport
2. Navigate to Resources tab
3. Browse available files
4. Select a file resource
5. Verify file content is displayed

### Scenario 4: Authentication Flow
**Setup**: MCP server requiring Bearer token

1. Try connecting without auth (should fail)
2. Configure Bearer token
3. Enable authentication
4. Connect successfully
5. Verify all subsequent requests include token

## Error Cases to Test

### Connection Errors
- Invalid URL
- Network timeout
- Server not running
- CORS issues
- SSL certificate errors

### Authentication Errors
- Invalid credentials
- Expired token
- Missing authentication
- Wrong auth type

### Tool Invocation Errors
- Invalid JSON arguments
- Missing required arguments
- Tool not found
- Server-side errors

### State Errors
- Invoking tool before connecting
- Loading capabilities while disconnected
- Rapid connect/disconnect cycles

## Performance Testing

### Load Testing
1. Invoke 100+ tools sequentially
2. Verify no memory leaks
3. Check response times remain consistent
4. Verify logs don't grow unbounded

### Stress Testing
1. Rapid connect/disconnect cycles
2. Large JSON argument payloads
3. Multiple concurrent invocations
4. Test with 1000+ history entries

## Accessibility Testing

1. **Keyboard Navigation**
   - Tab through all controls
   - Verify focus indicators
   - Test keyboard shortcuts

2. **Screen Reader**
   - Verify labels are read correctly
   - Check ARIA attributes
   - Test with NVDA/JAWS

## Browser Compatibility

Test on:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Test Checklist

Before submitting PR:

- [ ] All unit tests pass
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Manual testing completed for HTTP transport
- [ ] Manual testing completed for STDIO transport (if Agent available)
- [ ] All authentication types tested
- [ ] Collections functionality verified
- [ ] History functionality verified
- [ ] Error handling tested
- [ ] UI is responsive and accessible
- [ ] Documentation updated

## Known Limitations

1. **STDIO Transport**: Requires Hoppscotch Agent or Desktop App
2. **Browser Security**: Some MCP servers may have CORS restrictions
3. **WebSocket**: Current implementation uses HTTP/SSE, not WebSocket
4. **File Size**: Large responses may impact UI performance

## Reporting Issues

When reporting issues, include:

1. **Environment**:
   - Hoppscotch version
   - Browser and version
   - OS and version
   - MCP server details

2. **Steps to Reproduce**:
   - Detailed steps
   - Request configuration
   - Expected vs actual behavior

3. **Logs**:
   - Console errors
   - MCP event logs
   - Network requests (DevTools)

4. **Screenshots/Videos**:
   - Include if relevant to UI issues

## CI/CD Integration

The MCP tests are automatically run in CI:

```yaml
- name: Run Tests
  run: pnpm test

- name: Check Types
  run: pnpm typecheck

- name: Lint
  run: pnpm lint
```

All tests must pass before PR can be merged.
