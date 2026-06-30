/**
 * Pure function to convert a Hoppscotch CollectionFolder into MCP tool definitions.
 * Zero side effects — safe to unit test in isolation.
 */

import { CollectionFolder } from 'src/types/CollectionFolder';

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, { type: string; description: string }>;
  required: string[];
  /** Keys sourced from the JSON request body (used by non-GET requests). */
  bodyKeys: string[];
  /** Keys sourced from the URL query string. */
  queryKeys: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  _meta: {
    endpoint: string;
    method: string;
    headers: Array<{ key: string; value: string; active: boolean }>;
    auth: unknown;
    reqType: 'REST' | 'GQL';
    gqlQuery?: string;
    gqlVariables?: string;
  };
}

/**
 * Slugify a request title for use as an MCP tool name.
 * Lowercase, spaces → underscore, strip non-alphanumeric except underscore.
 * Max 64 chars (MCP spec).
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 64);
}

/**
 * Extract :param path parameters from an endpoint string.
 */
function extractPathParams(endpoint: string): string[] {
  const matches = endpoint.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
  if (!matches) return [];
  return matches.map((m) => m.substring(1));
}

/**
 * Infer a flat JSON Schema (one level deep, all optional strings) from a JSON body string.
 */
function inferBodySchema(
  bodyStr: string,
): Record<string, { type: string; description: string }> {
  try {
    const parsed = JSON.parse(bodyStr);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const props: Record<string, { type: string; description: string }> = {};
    for (const key of Object.keys(parsed)) {
      props[key] = { type: 'string', description: `Body field: ${key}` };
    }
    return props;
  } catch {
    return {};
  }
}

/**
 * Walk the collection tree and produce MCP tool definitions.
 * Handles name collisions by appending _2, _3, etc.
 */
export function collectionToMcpTools(
  collection: CollectionFolder,
): McpToolDefinition[] {
  const tools: McpToolDefinition[] = [];
  const nameCount: Record<string, number> = {};

  function walk(folder: CollectionFolder): void {
    for (const req of (folder.requests ?? []) as any[]) {
      const isGql = 'query' in req && req.query !== undefined;

      const rawTitle: string = req.name ?? req.title ?? 'request';
      let baseName = slugify(rawTitle) || 'request';

      nameCount[baseName] = (nameCount[baseName] ?? 0) + 1;
      const toolName =
        nameCount[baseName] === 1
          ? baseName
          : `${baseName}_${nameCount[baseName]}`;

      if (isGql) {
        // GraphQL tool
        const operationName =
          req.operationName ?? req.name ?? 'GraphQL operation';
        const description = `${rawTitle} — GraphQL: ${operationName}`;

        const properties: Record<string, { type: string; description: string }> =
          {};
        const required: string[] = [];

        try {
          const vars = JSON.parse(req.variables ?? '{}');
          if (typeof vars === 'object' && vars !== null) {
            for (const key of Object.keys(vars)) {
              properties[key] = {
                type: 'string',
                description: `GraphQL variable: ${key}`,
              };
            }
          }
        } catch {
          // ignore malformed variables JSON
        }

        tools.push({
          name: toolName,
          description,
          inputSchema: { type: 'object', properties, required, bodyKeys: [], queryKeys: [] },
          _meta: {
            endpoint: req.endpoint ?? '',
            method: 'POST',
            headers: (req.headers ?? []).filter((h: any) => h.active !== false),
            auth: req.auth,
            reqType: 'GQL',
            gqlQuery: req.query ?? '',
            gqlVariables: req.variables ?? '{}',
          },
        });
      } else {
        // REST tool
        const method = (req.method ?? 'GET').toUpperCase();
        const endpoint = req.endpoint ?? '';
        const description = `${rawTitle} — ${method} ${endpoint}`;

        const properties: Record<string, { type: string; description: string }> =
          {};
        const required: string[] = [];
        const queryKeys: string[] = [];
        const bodyKeys: string[] = [];

        // Path params: /:param or :param
        for (const param of extractPathParams(endpoint)) {
          properties[param] = {
            type: 'string',
            description: `Path parameter: ${param}`,
          };
          required.push(param);
        }

        // Query params (active ones)
        const queryParams: Array<{
          key: string;
          value: string;
          active: boolean;
        }> = req.params ?? [];
        for (const p of queryParams) {
          if (p.active !== false && p.key) {
            properties[p.key] = {
              type: 'string',
              description: `Query parameter: ${p.key}`,
            };
            queryKeys.push(p.key);
          }
        }

        // Body (JSON only, one level deep)
        const body = req.body;
        if (
          body?.contentType === 'application/json' &&
          body?.body &&
          typeof body.body === 'string' &&
          body.body.trim()
        ) {
          const bodyProps = inferBodySchema(body.body);
          for (const [k, v] of Object.entries(bodyProps)) {
            properties[k] = v;
            bodyKeys.push(k);
          }
        }

        tools.push({
          name: toolName,
          description,
          inputSchema: { type: 'object', properties, required, bodyKeys, queryKeys },
          _meta: {
            endpoint,
            method,
            headers: (req.headers ?? []).filter((h: any) => h.active !== false),
            auth: req.auth,
            reqType: 'REST',
          },
        });
      }
    }

    for (const sub of folder.folders ?? []) {
      walk(sub);
    }
  }

  walk(collection);
  return tools;
}
