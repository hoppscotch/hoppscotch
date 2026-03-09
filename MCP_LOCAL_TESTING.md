# MCP Local Testing Guide

This guide explains how to test the MCP client implementation locally.

## Quick Start

### 1. Start Hoppscotch Development Server

```bash
# Install dependencies (if not already done)
pnpm install

# Start the development server
pnpm dev
```

This will start Hoppscotch at `http://localhost:3000` (or another port if 3000 is in use).

### 2. Start a Test MCP Server

You have several options for test servers:

#### Option A: Reference MCP Server (Everything Server)

This server provides tools, prompts, and resources for testing:

```bash
# Install and run the everything server
npx @modelcontextprotocol/server-everything
```

Default: `http://localhost:3000/mcp/v1` (may conflict with Hoppscotch, use different port)

#### Option B: Filesystem MCP Server (STDIO)

```bash
# Run filesystem server on a directory
npx @modelcontextprotocol/server-filesystem /tmp
```

This requires Hoppscotch Agent/Desktop for STDIO transport.

#### Option C: Custom Test Server

Create a simple MCP server for testing:

```bash
# Create test directory
mkdir mcp-test-server
cd mcp-test-server

# Initialize npm project
npm init -y

# Install MCP SDK
npm install @modelcontextprotocol/sdk express body-parser cors

# Create server.js
```

**server.js:**
```javascript
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let requestId = 0;

// JSON-RPC 2.0 handler
app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;

  console.log(`Received: ${method}`, params);

  try {
    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '1.0',
          serverInfo: {
            name: 'Test MCP Server',
            version: '1.0.0',
          },
          capabilities: {
            tools: {},
            prompts: {},
            resources: {},
          },
        };
        break;

      case 'tools/list':
        result = {
          tools: [
            {
              name: 'echo',
              description: 'Echoes back the input message',
              inputSchema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description: 'Message to echo',
                  },
                },
                required: ['message'],
              },
            },
            {
              name: 'add',
              description: 'Adds two numbers',
              inputSchema: {
                type: 'object',
                properties: {
                  a: { type: 'number' },
                  b: { type: 'number' },
                },
                required: ['a', 'b'],
              },
            },
          ],
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = params;

        if (name === 'echo') {
          result = {
            content: [
              {
                type: 'text',
                text: `Echo: ${args.message}`,
              },
            ],
          };
        } else if (name === 'add') {
          result = {
            content: [
              {
                type: 'text',
                text: `Result: ${args.a + args.b}`,
              },
            ],
          };
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
        break;

      case 'prompts/list':
        result = {
          prompts: [
            {
              name: 'greeting',
              description: 'Generate a personalized greeting',
              arguments: [
                {
                  name: 'name',
                  description: 'Person\'s name',
                  required: true,
                },
              ],
            },
          ],
        };
        break;

      case 'prompts/get':
        result = {
          description: 'Personalized greeting',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Hello, ${params.arguments.name}! Welcome to MCP.`,
              },
            },
          ],
        };
        break;

      case 'resources/list':
        result = {
          resources: [
            {
              uri: 'test://readme',
              name: 'README',
              description: 'Test README file',
              mimeType: 'text/plain',
            },
          ],
        };
        break;

      case 'resources/read':
        result = {
          contents: [
            {
              uri: params.uri,
              mimeType: 'text/plain',
              text: 'This is a test README file from the MCP server.',
            },
          ],
        };
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    res.json({
      jsonrpc: '2.0',
      id: id || ++requestId,
      result,
    });
  } catch (error) {
    res.json({
      jsonrpc: '2.0',
      id: id || ++requestId,
      error: {
        code: -32603,
        message: error.message,
      },
    });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test MCP Server running at http://localhost:${PORT}/mcp`);
});
```

**Run the server:**
```bash
node server.js
```

Server runs at: `http://localhost:3001/mcp`

## Manual Testing Steps

### Test 1: HTTP Connection

1. Open Hoppscotch: `http://localhost:3000`
2. Navigate to **Realtime** → **MCP**
3. Select **HTTP** transport
4. Configure:
   - URL: `http://localhost:3001/mcp`
   - Method: `POST`
   - Auth: `None`
5. Click **Connect**
6. Verify:
   - ✓ Connection status changes to "CONNECTED"
   - ✓ Log shows "Connected to MCP server"
   - ✓ No errors in browser console

### Test 2: Capability Discovery

1. After connecting, click **Load Capabilities**
2. Navigate to **Tools** tab
3. Verify:
   - ✓ Shows "echo" and "add" tools
   - ✓ Tool descriptions are displayed
   - ✓ Tool count shows "(2)"

4. Navigate to **Prompts** tab
5. Verify:
   - ✓ Shows "greeting" prompt
   - ✓ Prompt count shows "(1)"

6. Navigate to **Resources** tab
7. Verify:
   - ✓ Shows "README" resource
   - ✓ Resource count shows "(1)"

### Test 3: Tool Invocation

1. Navigate to **Tools** tab
2. Click on "echo" tool to expand
3. Enter arguments:
   ```json
   {
     "message": "Hello MCP!"
   }
   ```
4. Click **Invoke**
5. Verify:
   - ✓ Response tab shows result
   - ✓ Response contains: `"Echo: Hello MCP!"`
   - ✓ Logs show successful invocation

6. Test "add" tool:
   ```json
   {
     "a": 10,
     "b": 20
   }
   ```
7. Verify:
   - ✓ Response shows: `"Result: 30"`

### Test 4: Authentication (Optional)

If testing with auth:

1. Modify test server to require authentication
2. Configure in Hoppscotch:
   - **Basic Auth**: Username/Password
   - **Bearer Token**: API token
   - **API Key**: Custom header
3. Enable auth toggle
4. Connect and verify auth headers are sent

### Test 5: Collections

1. Configure an MCP request
2. Click **Save** in collections sidebar
3. Enter:
   - Name: "Test Echo Request"
   - Description: "Testing echo tool"
4. Click **Save**
5. Verify:
   - ✓ Collection appears in list
   - ✓ Click to reload - configuration restored

### Test 6: History

1. Invoke several tools
2. Navigate to **History** tab
3. Verify:
   - ✓ All invocations are listed
   - ✓ Most recent at top
   - ✓ Click to expand shows details
4. Star an entry
5. Verify:
   - ✓ Star icon is highlighted
6. Search history
7. Verify:
   - ✓ Filtering works correctly

### Test 7: Error Handling

1. **Invalid Arguments**:
   - Enter invalid JSON: `{broken`
   - Verify error message shown

2. **Missing Required Field**:
   - Invoke "echo" without message
   - Verify validation error

3. **Connection Failure**:
   - Stop the MCP server
   - Try to connect
   - Verify error message: "Failed to connect"

4. **Wrong URL**:
   - Enter: `http://localhost:9999/mcp`
   - Try to connect
   - Verify network error shown

## Browser DevTools Testing

### Network Tab

1. Open DevTools → Network tab
2. Connect to MCP server
3. Verify:
   - ✓ POST request to `/mcp`
   - ✓ Request has JSON-RPC 2.0 format
   - ✓ Response status 200
   - ✓ Response has `result` field

### Console Tab

1. Open DevTools → Console
2. Connect and use MCP client
3. Verify:
   - ✓ No JavaScript errors
   - ✓ MCP events are logged (if debug enabled)
   - ✓ No CORS errors

## Testing with Real MCP Servers

### Weather MCP Server (Example)

If you have access to a weather MCP server:

```bash
# Example configuration
URL: https://weather-mcp.example.com
Method: POST
Auth: Bearer token (if required)

# Test tool: get_weather
Arguments:
{
  "location": "San Francisco",
  "units": "metric"
}
```

### Filesystem MCP Server (STDIO)

Requires Hoppscotch Agent or Desktop App:

1. Install Hoppscotch Agent
2. Configure STDIO transport:
   - Command: `npx @modelcontextprotocol/server-filesystem`
   - Args: `/tmp` (or any directory)
3. Connect
4. Test "list_directory" tool:
   ```json
   {
     "path": "/"
   }
   ```

## Automated Testing with Playwright

Create a Playwright test file:

**tests/mcp.spec.ts:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('MCP Client', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Realtime');
    await page.click('text=MCP');
  });

  test('should connect to MCP server', async ({ page }) => {
    // Select HTTP transport
    await page.click('button:has-text("HTTP")');

    // Enter URL
    await page.fill('input[placeholder*="URL"]', 'http://localhost:3001/mcp');

    // Click connect
    await page.click('button:has-text("Connect")');

    // Wait for connection
    await page.waitForSelector('text=CONNECTED', { timeout: 5000 });

    // Verify connected
    const status = await page.textContent('[data-testid="connection-status"]');
    expect(status).toContain('CONNECTED');
  });

  test('should load capabilities', async ({ page }) => {
    // Connect first
    await page.click('button:has-text("HTTP")');
    await page.fill('input[placeholder*="URL"]', 'http://localhost:3001/mcp');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=CONNECTED');

    // Load capabilities
    await page.click('button:has-text("Load Capabilities")');

    // Check tools tab
    await page.click('text=Tools');
    await expect(page.locator('text=echo')).toBeVisible();
    await expect(page.locator('text=add')).toBeVisible();
  });

  test('should invoke tool', async ({ page }) => {
    // Connect
    await page.click('button:has-text("HTTP")');
    await page.fill('input[placeholder*="URL"]', 'http://localhost:3001/mcp');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=CONNECTED');

    // Load capabilities
    await page.click('button:has-text("Load Capabilities")');

    // Navigate to tools
    await page.click('text=Tools');

    // Click echo tool
    await page.click('text=echo');

    // Enter arguments
    await page.fill('textarea[placeholder*="arguments"]', '{"message": "test"}');

    // Invoke
    await page.click('button:has-text("Invoke")');

    // Check response
    await page.click('text=Response');
    await expect(page.locator('text=Echo: test')).toBeVisible();
  });

  test('should save to collection', async ({ page }) => {
    // Configure request
    await page.click('button:has-text("HTTP")');
    await page.fill('input[placeholder*="URL"]', 'http://localhost:3001/mcp');

    // Click save
    await page.click('button:has-text("Save")');

    // Fill form
    await page.fill('input[placeholder*="Name"]', 'Test Collection');
    await page.fill('textarea[placeholder*="Description"]', 'Test description');

    // Save
    await page.click('button:has-text("Save")');

    // Verify in collections
    await expect(page.locator('text=Test Collection')).toBeVisible();
  });

  test('should track history', async ({ page }) => {
    // Connect and invoke tool
    await page.click('button:has-text("HTTP")');
    await page.fill('input[placeholder*="URL"]', 'http://localhost:3001/mcp');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=CONNECTED');

    await page.click('button:has-text("Load Capabilities")');
    await page.click('text=Tools');
    await page.click('text=echo');
    await page.fill('textarea[placeholder*="arguments"]', '{"message": "history test"}');
    await page.click('button:has-text("Invoke")');

    // Check history
    await page.click('text=History');
    await expect(page.locator('text=echo')).toBeVisible();
  });
});
```

**Run Playwright tests:**

```bash
# Install Playwright
pnpm add -D @playwright/test

# Run tests
pnpm exec playwright test

# Run in UI mode
pnpm exec playwright test --ui

# Run with browser visible
pnpm exec playwright test --headed
```

## Testing Checklist

### Connection Tests
- [ ] HTTP connection to local server
- [ ] Connection with authentication
- [ ] Connection error handling
- [ ] Disconnect and reconnect
- [ ] Connection state updates correctly

### Capability Tests
- [ ] Load tools list
- [ ] Load prompts list
- [ ] Load resources list
- [ ] Capability counts are correct
- [ ] Search/filter capabilities

### Invocation Tests
- [ ] Invoke tool with valid arguments
- [ ] Invoke with invalid JSON
- [ ] Invoke with missing required fields
- [ ] Response displays correctly
- [ ] Logs show invocation details

### Collections Tests
- [ ] Save new collection
- [ ] Load saved collection
- [ ] Edit collection
- [ ] Delete collection
- [ ] Search collections

### History Tests
- [ ] History entries are created
- [ ] Star/unstar entries
- [ ] Delete history entry
- [ ] Search history
- [ ] Clear all history

### UI/UX Tests
- [ ] Responsive layout
- [ ] Tab navigation works
- [ ] Buttons are clickable
- [ ] Forms validate input
- [ ] Error messages are clear
- [ ] Loading states show correctly

## Troubleshooting

### Port Conflicts

If port 3000 or 3001 is in use:

```bash
# Change Hoppscotch port
PORT=3002 pnpm dev

# Change test server port
# Edit server.js: const PORT = 3003;
```

### CORS Errors

Add CORS headers to your test server:

```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Connection Timeout

Increase timeout in connection code or check:
- Server is running
- URL is correct
- No firewall blocking
- CORS is configured

### STDIO Not Working

STDIO transport requires:
- Hoppscotch Agent installed
- Or Hoppscotch Desktop App
- Cannot work in browser alone

## CI/CD Testing

Add to GitHub Actions workflow:

```yaml
name: MCP Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Start test MCP server
        run: |
          node tests/fixtures/mcp-server.js &
          sleep 2

      - name: Start Hoppscotch
        run: |
          pnpm dev &
          sleep 5

      - name: Run Playwright tests
        run: pnpm exec playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-results
          path: playwright-report/
```

## Next Steps

1. Test all features manually
2. Write additional Playwright tests
3. Test with different MCP servers
4. Test error scenarios
5. Performance testing
6. Cross-browser testing

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Playwright Documentation](https://playwright.dev/)
- [MCP SDK](https://github.com/modelcontextprotocol/sdk)
- [Test Server Repository](https://github.com/modelcontextprotocol/servers)
