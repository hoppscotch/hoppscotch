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
import { CollectionFolder } from 'src/types/CollectionFolder';
import { MCP_SHARE_TOOL_NOT_FOUND } from 'src/errors';

// JSON-RPC error codes per MCP spec
const JSONRPC_INVALID_PARAMS = -32602;
const JSONRPC_METHOD_NOT_FOUND = -32601;

// In-process TTL cache: shareToken → { tools, expiresAt }
const toolsCache = new Map<
  string,
  { tools: McpToolDefinition[]; expiresAt: number }
>();
const CACHE_TTL_MS = 60_000;

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
            inputSchema: t.inputSchema,
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
    share: any,
  ): Promise<E.Either<string, McpToolDefinition[]>> {
    const cached = toolsCache.get(shareToken);
    if (cached && cached.expiresAt > Date.now()) {
      return E.right(cached.tools);
    }

    const treeResult = await this.mcpShareService.getCollectionTree(share);
    if (E.isLeft(treeResult)) return E.left(treeResult.left);

    const tools = collectionToMcpTools(treeResult.right as CollectionFolder);
    toolsCache.set(shareToken, { tools, expiresAt: Date.now() + CACHE_TTL_MS });
    return E.right(tools);
  }

  private async executeTool(
    tool: McpToolDefinition,
    args: Record<string, string>,
  ): Promise<E.Either<string, string>> {
    try {
      const meta = tool._meta;

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
        });
        const text = await response.text();
        return E.right(text);
      }

      // REST execution
      let endpoint = meta.endpoint;

      // Substitute path params (:param)
      for (const [key, value] of Object.entries(args)) {
        endpoint = endpoint.replace(`:${key}`, encodeURIComponent(String(value)));
      }

      // Build query string from schema-defined query params
      const queryProps = Object.keys(tool.inputSchema.properties).filter(
        (k) => !tool.inputSchema.required.includes(k),
      );
      const queryEntries = queryProps
        .filter((k) => args[k] !== undefined)
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(args[k])}`);

      if (queryEntries.length > 0) {
        const sep = endpoint.includes('?') ? '&' : '?';
        endpoint = endpoint + sep + queryEntries.join('&');
      }

      // Build body for non-GET requests
      const bodyFields = Object.keys(tool.inputSchema.properties).filter(
        (k) =>
          !tool.inputSchema.required.includes(k) &&
          !queryProps.includes(k) &&
          args[k] !== undefined,
      );

      const fetchOptions: RequestInit = {
        method: meta.method,
        headers: {
          'Content-Type': 'application/json',
          ...this.buildHeaders(meta.headers),
        },
      };

      if (meta.method !== 'GET' && meta.method !== 'HEAD' && bodyFields.length > 0) {
        const bodyObj: Record<string, string> = {};
        for (const k of bodyFields) {
          bodyObj[k] = args[k];
        }
        fetchOptions.body = JSON.stringify(bodyObj);
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
