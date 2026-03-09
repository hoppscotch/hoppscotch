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

  console.log(`[${new Date().toISOString()}] Received: ${method}`, params || '');

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
        console.log('✓ Initialized');
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
                  a: { type: 'number', description: 'First number' },
                  b: { type: 'number', description: 'Second number' },
                },
                required: ['a', 'b'],
              },
            },
            {
              name: 'multiply',
              description: 'Multiplies two numbers',
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
        console.log('✓ Listed tools');
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
          console.log(`✓ Executed echo: "${args.message}"`);
        } else if (name === 'add') {
          const sum = args.a + args.b;
          result = {
            content: [
              {
                type: 'text',
                text: `Result: ${sum}`,
              },
            ],
          };
          console.log(`✓ Executed add: ${args.a} + ${args.b} = ${sum}`);
        } else if (name === 'multiply') {
          const product = args.a * args.b;
          result = {
            content: [
              {
                type: 'text',
                text: `Result: ${product}`,
              },
            ],
          };
          console.log(`✓ Executed multiply: ${args.a} × ${args.b} = ${product}`);
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
                  description: "Person's name",
                  required: true,
                },
              ],
            },
            {
              name: 'code_review',
              description: 'Review code for best practices',
              arguments: [
                {
                  name: 'code',
                  description: 'Code to review',
                  required: true,
                },
                {
                  name: 'language',
                  description: 'Programming language',
                  required: false,
                },
              ],
            },
          ],
        };
        console.log('✓ Listed prompts');
        break;

      case 'prompts/get':
        const promptName = params.name;
        if (promptName === 'greeting') {
          result = {
            description: 'Personalized greeting',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Hello, ${params.arguments.name}! Welcome to MCP testing.`,
                },
              },
            ],
          };
          console.log(`✓ Got prompt: greeting for ${params.arguments.name}`);
        } else if (promptName === 'code_review') {
          result = {
            description: 'Code review',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: `Please review this ${params.arguments.language || 'code'}: ${params.arguments.code}`,
                },
              },
            ],
          };
          console.log('✓ Got prompt: code_review');
        }
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
            {
              uri: 'test://config',
              name: 'Config',
              description: 'Test configuration file',
              mimeType: 'application/json',
            },
          ],
        };
        console.log('✓ Listed resources');
        break;

      case 'resources/read':
        const uri = params.uri;
        if (uri === 'test://readme') {
          result = {
            contents: [
              {
                uri: uri,
                mimeType: 'text/plain',
                text: 'This is a test README file from the MCP server.\n\nFeatures:\n- Tool invocation\n- Prompts\n- Resources\n\nEnjoy testing!',
              },
            ],
          };
        } else if (uri === 'test://config') {
          result = {
            contents: [
              {
                uri: uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  name: 'Test MCP Server',
                  version: '1.0.0',
                  enabled: true,
                }, null, 2),
              },
            ],
          };
        }
        console.log(`✓ Read resource: ${uri}`);
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
    console.error(`✗ Error: ${error.message}`);
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         Test MCP Server Running                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`🚀 Server URL: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Available methods:');
  console.log('  • initialize - Initialize connection');
  console.log('  • tools/list - List available tools (echo, add, multiply)');
  console.log('  • tools/call - Invoke a tool');
  console.log('  • prompts/list - List available prompts');
  console.log('  • prompts/get - Get a prompt');
  console.log('  • resources/list - List available resources');
  console.log('  • resources/read - Read a resource');
  console.log('');
  console.log('Waiting for requests...');
  console.log('');
});
