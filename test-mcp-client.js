#!/usr/bin/env node

const http = require('http');

const MCP_SERVER_URL = 'http://localhost:3001/mcp';

// Utility to make JSON-RPC requests
async function jsonRpcRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            resolve(response.result);
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ✗ ${message}`);
    testsFailed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         MCP Client Automated Tests                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Test 1: Initialize connection
    console.log('Test 1: Initialize Connection');
    const initResult = await jsonRpcRequest('initialize', {
      protocolVersion: '1.0',
      clientInfo: {
        name: 'Hoppscotch MCP Client',
        version: '1.0.0',
      },
    });
    assert(initResult.protocolVersion === '1.0', 'Protocol version is 1.0');
    assert(initResult.serverInfo.name === 'Test MCP Server', 'Server name is correct');
    console.log('');

    // Test 2: List tools
    console.log('Test 2: List Tools');
    const toolsResult = await jsonRpcRequest('tools/list', {});
    assert(Array.isArray(toolsResult.tools), 'Tools is an array');
    assert(toolsResult.tools.length === 3, 'Has 3 tools');
    assert(toolsResult.tools[0].name === 'echo', 'First tool is echo');
    assert(toolsResult.tools[1].name === 'add', 'Second tool is add');
    assert(toolsResult.tools[2].name === 'multiply', 'Third tool is multiply');
    console.log('');

    // Test 3: Invoke echo tool
    console.log('Test 3: Invoke Echo Tool');
    const echoResult = await jsonRpcRequest('tools/call', {
      name: 'echo',
      arguments: {
        message: 'Hello MCP!',
      },
    });
    assert(Array.isArray(echoResult.content), 'Result has content array');
    assert(echoResult.content[0].text === 'Echo: Hello MCP!', 'Echo response is correct');
    console.log('');

    // Test 4: Invoke add tool
    console.log('Test 4: Invoke Add Tool');
    const addResult = await jsonRpcRequest('tools/call', {
      name: 'add',
      arguments: {
        a: 10,
        b: 20,
      },
    });
    assert(addResult.content[0].text === 'Result: 30', 'Add result is correct (10 + 20 = 30)');
    console.log('');

    // Test 5: Invoke multiply tool
    console.log('Test 5: Invoke Multiply Tool');
    const multiplyResult = await jsonRpcRequest('tools/call', {
      name: 'multiply',
      arguments: {
        a: 5,
        b: 7,
      },
    });
    assert(multiplyResult.content[0].text === 'Result: 35', 'Multiply result is correct (5 × 7 = 35)');
    console.log('');

    // Test 6: List prompts
    console.log('Test 6: List Prompts');
    const promptsResult = await jsonRpcRequest('prompts/list', {});
    assert(Array.isArray(promptsResult.prompts), 'Prompts is an array');
    assert(promptsResult.prompts.length === 2, 'Has 2 prompts');
    assert(promptsResult.prompts[0].name === 'greeting', 'First prompt is greeting');
    assert(promptsResult.prompts[1].name === 'code_review', 'Second prompt is code_review');
    console.log('');

    // Test 7: Get greeting prompt
    console.log('Test 7: Get Greeting Prompt');
    const greetingResult = await jsonRpcRequest('prompts/get', {
      name: 'greeting',
      arguments: {
        name: 'Tester',
      },
    });
    assert(greetingResult.description === 'Personalized greeting', 'Prompt description is correct');
    assert(greetingResult.messages[0].content.text.includes('Tester'), 'Greeting includes name');
    console.log('');

    // Test 8: List resources
    console.log('Test 8: List Resources');
    const resourcesResult = await jsonRpcRequest('resources/list', {});
    assert(Array.isArray(resourcesResult.resources), 'Resources is an array');
    assert(resourcesResult.resources.length === 2, 'Has 2 resources');
    assert(resourcesResult.resources[0].name === 'README', 'First resource is README');
    assert(resourcesResult.resources[1].name === 'Config', 'Second resource is Config');
    console.log('');

    // Test 9: Read README resource
    console.log('Test 9: Read README Resource');
    const readmeResult = await jsonRpcRequest('resources/read', {
      uri: 'test://readme',
    });
    assert(readmeResult.contents[0].mimeType === 'text/plain', 'README is text/plain');
    assert(readmeResult.contents[0].text.includes('README'), 'README content is correct');
    console.log('');

    // Test 10: Read Config resource
    console.log('Test 10: Read Config Resource');
    const configResult = await jsonRpcRequest('resources/read', {
      uri: 'test://config',
    });
    assert(configResult.contents[0].mimeType === 'application/json', 'Config is JSON');
    const config = JSON.parse(configResult.contents[0].text);
    assert(config.name === 'Test MCP Server', 'Config name is correct');
    console.log('');

    // Test 11: Error handling - invalid tool
    console.log('Test 11: Error Handling - Invalid Tool');
    try {
      await jsonRpcRequest('tools/call', {
        name: 'nonexistent',
        arguments: {},
      });
      assert(false, 'Should have thrown error for invalid tool');
    } catch (err) {
      assert(err.message.includes('Unknown tool'), 'Error message is correct');
    }
    console.log('');

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log('');

    if (testsFailed === 0) {
      console.log('🎉 All tests passed!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Open http://localhost:3000 in your browser');
      console.log('2. Navigate to Realtime → MCP');
      console.log('3. Configure:');
      console.log('   - Transport: HTTP');
      console.log('   - URL: http://localhost:3001/mcp');
      console.log('   - Method: POST');
      console.log('   - Auth: None');
      console.log('4. Click "Connect"');
      console.log('5. Click "Load Capabilities"');
      console.log('6. Test tools, prompts, and resources!');
    } else {
      console.log('❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('❌ Test execution failed:', error.message);
    console.error('');
    console.error('Make sure the MCP test server is running:');
    console.error('  node test-mcp-server.js');
    process.exit(1);
  }
}

// Check if server is running
http.get('http://localhost:3001/health', (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('✓ MCP test server is running');
    runTests();
  });
}).on('error', () => {
  console.error('');
  console.error('❌ MCP test server is not running!');
  console.error('');
  console.error('Please start it first:');
  console.error('  node test-mcp-server.js');
  console.error('');
  process.exit(1);
});
