import Anthropic from '@anthropic-ai/sdk';

/**
 * The AI chat tool contract.
 *
 * These schemas are the single source of truth for what the chat model can do;
 * every tool here is executed CLIENT-SIDE by the frontend:
 * - request-field edits map to `applyToolCall` in
 *   `hoppscotch-common/src/helpers/aichat/commands.ts`
 * - app actions map to `APP_ACTION_TOOLS` / `runAppAction` in
 *   `hoppscotch-common/src/helpers/aichat/app-actions.ts` and
 *   `hoppscotch-common/src/services/ai-chat.service.ts`
 *
 * Tool names must stay in sync with those files — renaming a tool here without
 * updating the frontend silently turns it into a no-op ("Done." with no effect).
 *
 * Naming follows the hoppscotch-mcp-server convention: snake_case, verb-first
 * (`set_`/`add_`/`remove_` mutate, `run_`/`open_`/`switch_` act on the app).
 */

/** Builds an input schema of `{ [itemsKey]: { key, value }[] }`. */
const keyValueArraySchema = (itemsKey: string) => ({
  type: 'object' as const,
  properties: {
    [itemsKey]: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['key', 'value'],
      },
    },
  },
  required: [itemsKey],
});

/** Builds an environment-variable schema, including a local-only secret marker. */
const environmentVariableArraySchema = (itemsKey: string) => ({
  type: 'object' as const,
  properties: {
    [itemsKey]: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: {
            type: 'string',
            description:
              'For a <<local-ref:...>> reference shown in user input, copy it unchanged and set secret to true.',
          },
          secret: {
            type: 'boolean',
            description:
              'Marks the value as a local-only secret. Use true for API keys, tokens, and passwords.',
          },
        },
        required: ['key', 'value'],
      },
    },
  },
  required: [itemsKey],
});

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'set_method',
    description: 'Set the HTTP method of the current request.',
    input_schema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
        },
      },
      required: ['method'],
    },
  },
  {
    name: 'set_url',
    description: 'Set the URL / endpoint of the current request.',
    input_schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
  },
  {
    name: 'set_body',
    description:
      'Set or replace the request body and its content type (JSON, XML, ' +
      'form-urlencoded, text, etc.; not multipart). Provide the full new body.',
    input_schema: {
      type: 'object',
      properties: {
        body: { type: 'string' },
        contentType: {
          type: 'string',
          enum: [
            'application/json',
            'application/ld+json',
            'application/hal+json',
            'application/vnd.api+json',
            'application/xml',
            'text/xml',
            'text/html',
            'text/plain',
            'application/x-www-form-urlencoded',
          ],
        },
      },
      required: ['body'],
    },
  },
  {
    name: 'add_or_update_headers',
    description:
      'Add or update one or more request headers, matched by key (case-insensitive).',
    input_schema: keyValueArraySchema('headers'),
  },
  {
    name: 'add_or_update_params',
    description: 'Add or update one or more query parameters, matched by key.',
    input_schema: keyValueArraySchema('params'),
  },
  {
    name: 'add_or_update_request_variables',
    description: 'Add or update one or more request variables, matched by key.',
    input_schema: keyValueArraySchema('variables'),
  },
  {
    name: 'set_bearer_auth',
    description: 'Set Bearer token authentication on the current request.',
    input_schema: {
      type: 'object',
      properties: { token: { type: 'string' } },
      required: ['token'],
    },
  },
  {
    name: 'remove_header',
    description: 'Remove a request header by key.',
    input_schema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
  },
  {
    name: 'remove_param',
    description: 'Remove a query parameter by key.',
    input_schema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
  },
  {
    name: 'run_request',
    description:
      'Send / run the current request. Call this (after any edits) when the ' +
      'user asks to run, send, execute, or fire the request. On a GraphQL ' +
      'tab whose query document contains multiple operations, pass the ' +
      'operation name to run that one — otherwise the FIRST operation runs.',
    input_schema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          description:
            'GraphQL only: name of the operation to run when the query ' +
            'document defines more than one.',
        },
      },
    },
  },
  {
    name: 'set_request_name',
    description: 'Rename the current request.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'set_query',
    description:
      'Set or replace the GraphQL query of the current GraphQL request tab. ' +
      'Provide the full new query. Only valid on GraphQL request tabs.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'set_gql_variables',
    description:
      'Set or replace the GraphQL query variables (a JSON string) of the ' +
      'current GraphQL request tab. Provide the full new variables JSON. ' +
      'Only valid on GraphQL request tabs.',
    input_schema: {
      type: 'object',
      properties: { variables: { type: 'string' } },
      required: ['variables'],
    },
  },
  {
    name: 'set_prerequest_script',
    description:
      'Set or replace the pre-request script: JavaScript run before the ' +
      'request is sent, using the Hoppscotch `pw`/`hopp` sandbox API (e.g. ' +
      'pw.env.set). Provide the full new script.',
    input_schema: {
      type: 'object',
      properties: { script: { type: 'string' } },
      required: ['script'],
    },
  },
  {
    name: 'set_test_script',
    description:
      'Set or replace the post-request test script: JavaScript run after the ' +
      'response arrives, using pw.test / pw.expect. Provide the full new script.',
    input_schema: {
      type: 'object',
      properties: { script: { type: 'string' } },
      required: ['script'],
    },
  },
  {
    name: 'save_request',
    description:
      'Save the current request, persisting edits (opens the Save dialog for ' +
      'an unsaved request). Call after making edits the user wants to keep.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'open_new_tab',
    description: 'Open a new, empty request tab.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'close_tab',
    description: 'Close the current request tab.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'duplicate_tab',
    description: 'Duplicate the current request tab into a new tab.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'switch_tab',
    description: 'Switch to another open tab.',
    input_schema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['next', 'previous', 'first', 'last'],
        },
      },
      required: ['direction'],
    },
  },
  {
    name: 'switch_protocol',
    description:
      'Switch the current tab between a REST request and a GraphQL request. ' +
      'The edits of the protocol being left are kept as a draft and restored ' +
      'when switching back.',
    input_schema: {
      type: 'object',
      properties: {
        protocol: {
          type: 'string',
          enum: ['rest', 'graphql'],
        },
      },
      required: ['protocol'],
    },
  },
  {
    name: 'set_interceptor',
    description:
      'Change the active interceptor / connection agent used to send requests ' +
      '(e.g. Browser, Proxy, Agent). Provide a name hint to match.',
    input_schema: {
      type: 'object',
      properties: { interceptor: { type: 'string' } },
      required: ['interceptor'],
    },
  },
  {
    name: 'create_environment',
    description:
      'Create a new environment in the current workspace (a team environment ' +
      'when a team workspace is active, otherwise personal) and make it ' +
      'active. Optionally seed it with variables. The active workspace is ' +
      'provided in the context.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        variables:
          environmentVariableArraySchema('variables').properties.variables,
      },
      required: ['name'],
    },
  },
  {
    name: 'select_environment',
    description:
      'Switch the active environment by name. Pass "none" to clear the active ' +
      'environment.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'add_or_update_environment_variables',
    description:
      'Add or update variables (matched by key) in the currently selected ' +
      'environment.',
    input_schema: environmentVariableArraySchema('variables'),
  },
  {
    name: 'create_collection',
    description: 'Create a new top-level REST collection.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'save_request_to_collection',
    description:
      'Save the current request into an existing collection, matched by name.',
    input_schema: {
      type: 'object',
      properties: { collection: { type: 'string' } },
      required: ['collection'],
    },
  },
  {
    name: 'add_or_update_collection_requests',
    description:
      'Create or update multiple REST requests directly in a named personal ' +
      'collection. Each request is saved with its full endpoint configuration ' +
      'and optional pre-request/test scripts. Match existing requests by exact name. ' +
      'Omit an optional field when updating to retain its current value; pass an empty ' +
      'string or array to clear it. Use <<environmentVariable>> placeholders for ' +
      'environment-specific values.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        requests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              method: {
                type: 'string',
                enum: [
                  'GET',
                  'POST',
                  'PUT',
                  'PATCH',
                  'DELETE',
                  'HEAD',
                  'OPTIONS',
                ],
              },
              url: { type: 'string' },
              headers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    value: { type: 'string' },
                  },
                  required: ['key', 'value'],
                },
              },
              params: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    value: { type: 'string' },
                  },
                  required: ['key', 'value'],
                },
              },
              body: { type: 'string' },
              contentType: {
                type: 'string',
                enum: [
                  'application/json',
                  'application/ld+json',
                  'application/hal+json',
                  'application/vnd.api+json',
                  'application/xml',
                  'text/xml',
                  'text/html',
                  'text/plain',
                  'application/x-www-form-urlencoded',
                ],
              },
              preRequestScript: { type: 'string' },
              testScript: { type: 'string' },
            },
            required: ['name', 'method', 'url'],
          },
        },
      },
      required: ['collection', 'requests'],
    },
  },
  {
    name: 'open_request',
    description:
      'Open a saved request from the collections into a tab, matched by name. ' +
      'Optionally scope the search to a collection/folder by name.',
    input_schema: {
      type: 'object',
      properties: {
        request: { type: 'string' },
        collection: { type: 'string' },
      },
      required: ['request'],
    },
  },
  {
    name: 'run_collection',
    description:
      'Run every request in a named personal REST collection through the ' +
      'collection runner. This executes each request and its test scripts, ' +
      'then returns the actual verification summary. Optionally select a ' +
      'personal environment by name immediately before running.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        environment: { type: 'string' },
      },
      required: ['collection'],
    },
  },
];
