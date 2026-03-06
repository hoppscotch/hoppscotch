import {
  Controller,
  Post,
  Param,
  Req,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as E from 'fp-ts/Either';
import { ThrottlerBehindProxyGuard } from 'src/guards/throttler-behind-proxy.guard';
import { McpShareService } from './mcp-share.service';
import { collectionToMcpTools, McpToolDefinition } from './mcp-tool-generator';
import { MCP_SHARE_TOOL_NOT_FOUND } from 'src/errors';
import { McpShare as DbMcpShare } from 'src/generated/prisma/client';

// JSON-RPC error codes per MCP spec
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_METHOD_NOT_FOUND = -32601;

// Abort upstream requests after 30 seconds to prevent hanging connections.
const FETCH_TIMEOUT_MS = 30_000;

// In-process TTL cache: shareToken → { tools, expiresAt }
// Bounded to MAX_CACHE_ENTRIES to prevent unbounded memory growth.
const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;
const toolsCache = new Map<
  string,
  { tools: McpToolDefinition[]; expiresAt: number }
>();

/**
 * Reject URLs that resolve to loopback or RFC-1918 private addresses to
 * prevent SSRF from user-controlled collection endpoints.
 */
function isPrivateUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true; // malformed URL — block it
  }
  const host = url.hostname;
  // Block loopback, link-local, RFC-1918 private ranges, and IPv6 loopback.
  // Patterns are anchored with full-segment boundaries to avoid false positives
  // on legitimate external hostnames like "10.0.0.1.cdn.example.com".
  // Node's URL parser normalises decimal/hex-encoded IPs (e.g. 0x7f000001 →
  // 127.0.0.1) so we only need to match the canonical dotted-decimal form.
  // IPv6 loopback is returned by URL as "[::1]" (brackets included).
  const privatePattern =
    /^(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[::1\]|localhost)$/i;
  return privatePattern.test(host);
}

function jsonRpcSuccess(id: unknown, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

@UseGuards(ThrottlerBehindProxyGuard)
@Controller({ path: 'mcp', version: '1' })
export class McpShareController {
  constructor(private readonly mcpShareService: McpShareService) {}

  /**
   * MCP Streamable HTTP endpoint.
   * POST /v1/mcp/:shareToken
   *
   * No JWT required — shareToken IS the auth credential.
   * Supports: initialize, tools/list, tools/call
   */
  @Post(':shareToken')
  async handleMcpRequest(
    @Param('shareToken') shareToken: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Validate the share exists and is active
    const shareResult = await this.mcpShareService.getShare(shareToken);
    if (E.isLeft(shareResult)) {
      return res.status(HttpStatus.NOT_FOUND).json({
        error: 'Not found',
        message: shareResult.left,
      });
    }
    const share = shareResult.right;

    const body = req.body;
    const id = body?.id ?? null;
    const method: string = body?.method ?? '';
    const params = body?.params ?? {};

    res.setHeader('Content-Type', 'application/json');

    // initialize
    if (method === 'initialize') {
      return res.status(200).json(
        jsonRpcSuccess(id, {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'hoppscotch-mcp',
            version: '1.0.0',
          },
          capabilities: { tools: {} },
        }),
      );
    }

    // tools/list
    if (method === 'tools/list') {
      const tools = await this.getToolsForShare(shareToken, share);
      if (E.isLeft(tools)) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(jsonRpcError(id, JSONRPC_INVALID_PARAMS, tools.left));
      }

      return res.status(200).json(
        jsonRpcSuccess(id, {
          tools: tools.right.map((t) => ({
            name: t.name,
            description: t.description,
            // Strip internal routing metadata (bodyKeys, queryKeys) — only
            // expose the JSON Schema fields that MCP clients understand.
            inputSchema: {
              type: t.inputSchema.type,
              properties: t.inputSchema.properties,
              required: t.inputSchema.required,
            },
          })),
        }),
      );
    }

    // tools/call
    if (method === 'tools/call') {
      const toolName: string = params.name ?? '';
      const args: Record<string, string> = params.arguments ?? {};

      const toolsResult = await this.getToolsForShare(shareToken, share);
      if (E.isLeft(toolsResult)) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(jsonRpcError(id, JSONRPC_INVALID_PARAMS, toolsResult.left));
      }

      const tool = toolsResult.right.find((t) => t.name === toolName);
      if (!tool) {
        return res
          .status(200)
          .json(
            jsonRpcError(
              id,
              JSONRPC_INVALID_PARAMS,
              MCP_SHARE_TOOL_NOT_FOUND,
            ),
          );
      }

      const callResult = await this.executeTool(tool, args);
      if (E.isLeft(callResult)) {
        return res.status(200).json(
          jsonRpcSuccess(id, {
            content: [{ type: 'text', text: callResult.left }],
            isError: true,
          }),
        );
      }

      return res.status(200).json(
        jsonRpcSuccess(id, {
          content: [{ type: 'text', text: callResult.right }],
        }),
      );
    }

    return res
      .status(200)
      .json(jsonRpcError(id, JSONRPC_METHOD_NOT_FOUND, `Unknown method: ${method}`));
  }

  private async getToolsForShare(
    shareToken: string,
    share: DbMcpShare,
  ): Promise<E.Either<string, McpToolDefinition[]>> {
    const cached = toolsCache.get(shareToken);
    if (cached && cached.expiresAt > Date.now()) {
      return E.right(cached.tools);
    }

    const treeResult = await this.mcpShareService.getCollectionTree(share);
    if (E.isLeft(treeResult)) return E.left(treeResult.left);

    const tools = collectionToMcpTools(treeResult.right);

    // Evict oldest entry when at capacity to keep memory bounded.
    if (toolsCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = toolsCache.keys().next().value;
      if (oldest) toolsCache.delete(oldest);
    }
    toolsCache.set(shareToken, { tools, expiresAt: Date.now() + CACHE_TTL_MS });
    return E.right(tools);
  }

  private async executeTool(
    tool: McpToolDefinition,
    args: Record<string, string>,
  ): Promise<E.Either<string, string>> {
    try {
      const meta = tool._meta;

      if (isPrivateUrl(meta.endpoint)) {
        return E.left('Request blocked: endpoint resolves to a private address');
      }

      if (meta.reqType === 'GQL') {
        // GQL execution: POST to the stored endpoint
        let variables: Record<string, unknown> = {};
        try {
          variables = JSON.parse(meta.gqlVariables ?? '{}');
        } catch {
          // use args directly
          variables = args;
        }
        // Override with tool call args
        Object.assign(variables, args);

        const response = await fetch(meta.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.buildHeaders(meta.headers),
          },
          body: JSON.stringify({ query: meta.gqlQuery, variables }),
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        const text = await response.text();
        return E.right(text);
      }

      // REST execution
      let endpoint = meta.endpoint;

      // Substitute path params (:param) — required keys
      for (const key of tool.inputSchema.required) {
        if (args[key] !== undefined) {
          endpoint = endpoint.replace(`:${key}`, encodeURIComponent(String(args[key])));
        }
      }

      // Build query string from schema-defined query keys
      const queryEntries = tool.inputSchema.queryKeys
        .filter((k) => args[k] !== undefined)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(args[k])}`);

      if (queryEntries.length > 0) {
        const sep = endpoint.includes('?') ? '&' : '?';
        endpoint = endpoint + sep + queryEntries.join('&');
      }

      const fetchOptions: RequestInit = {
        method: meta.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.buildHeaders(meta.headers),
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      };

      // Build body for non-GET/HEAD requests using schema-tracked body keys
      if (meta.method !== 'GET' && meta.method !== 'HEAD') {
        const bodyObj: Record<string, string> = {};
        for (const k of tool.inputSchema.bodyKeys) {
          if (args[k] !== undefined) {
            bodyObj[k] = args[k];
          }
        }
        if (Object.keys(bodyObj).length > 0) {
          fetchOptions.body = JSON.stringify(bodyObj);
        }
      }

      const response = await fetch(endpoint, fetchOptions);
      const text = await response.text();
      return E.right(text);
    } catch (err) {
      return E.left(`Request failed: ${(err as Error).message}`);
    }
  }

  private buildHeaders(
    headers: Array<{ key: string; value: string; active: boolean }>,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const h of headers) {
      if (h.active !== false && h.key) {
        result[h.key] = h.value;
      }
    }
    return result;
  }
}
