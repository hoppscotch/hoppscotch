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
              'Copy a <<local-ref:...>> unchanged and set secret to true.',
          },
          secret: {
            type: 'boolean',
            description: 'true for API keys, tokens, and passwords.',
          },
        },
        required: ['key', 'value'],
      },
    },
  },
  required: [itemsKey],
});

const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
];
const STRING_BODY_CONTENT_TYPES = [
  'application/json',
  'application/ld+json',
  'application/hal+json',
  'application/vnd.api+json',
  'application/xml',
  'text/xml',
  'text/html',
  'text/plain',
  'application/x-www-form-urlencoded',
];
const keyValueItems = {
  type: 'array',
  items: {
    type: 'object',
    properties: { key: { type: 'string' }, value: { type: 'string' } },
    required: ['key', 'value'],
  },
};

export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'set_method',
    description: 'Set the HTTP method of the current request.',
    input_schema: {
      type: 'object',
      properties: {
        method: { type: 'string', enum: HTTP_METHODS },
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
      'Replace the request body (full text) and optionally its content type. Not multipart.',
    input_schema: {
      type: 'object',
      properties: {
        body: { type: 'string' },
        contentType: { type: 'string', enum: STRING_BODY_CONTENT_TYPES },
      },
      required: ['body'],
    },
  },
  {
    name: 'add_or_update_headers',
    description: 'Add or update request headers (matched by key).',
    input_schema: keyValueArraySchema('headers'),
  },
  {
    name: 'add_or_update_params',
    description: 'Add or update query parameters (matched by key).',
    input_schema: keyValueArraySchema('params'),
  },
  {
    name: 'add_or_update_request_variables',
    description: 'Add or update request variables (matched by key).',
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
      'Run the active request (after any edits). GraphQL: pass the operation name when the document has several, else the first runs.',
    input_schema: {
      type: 'object',
      properties: {
        operation: { type: 'string', description: 'GraphQL operation name' },
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
    description: 'Replace the GraphQL query (full text). GraphQL tabs only.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
    },
  },
  {
    name: 'set_gql_variables',
    description:
      'Replace the GraphQL variables (full JSON string). GraphQL tabs only.',
    input_schema: {
      type: 'object',
      properties: { variables: { type: 'string' } },
      required: ['variables'],
    },
  },
  {
    name: 'set_prerequest_script',
    description:
      'Replace the pre-request script (full JavaScript, pw sandbox API).',
    input_schema: {
      type: 'object',
      properties: { script: { type: 'string' } },
      required: ['script'],
    },
  },
  {
    name: 'set_test_script',
    description:
      'Replace the test script (full JavaScript, pw.test / pw.expect).',
    input_schema: {
      type: 'object',
      properties: { script: { type: 'string' } },
      required: ['script'],
    },
  },
  {
    name: 'save_request',
    description:
      'Save the current request (opens the Save dialog if it was never saved).',
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
      'Convert the current tab between REST and GraphQL; the other protocol keeps its edits as a draft.',
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
      'Change the interceptor used to send requests (Browser, Proxy, Agent) by name.',
    input_schema: {
      type: 'object',
      properties: { interceptor: { type: 'string' } },
      required: ['interceptor'],
    },
  },
  {
    name: 'create_environment',
    description:
      'Create an environment, make it active, optionally with variables.',
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
    description: 'Select the active environment by name ("none" clears it).',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'add_or_update_environment_variables',
    description:
      'Add or update variables (matched by key) in the active environment.',
    input_schema: environmentVariableArraySchema('variables'),
  },
  {
    name: 'create_collection',
    description: 'Create a top-level REST collection.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'save_request_to_collection',
    description: 'Save the current request into a collection (by name).',
    input_schema: {
      type: 'object',
      properties: { collection: { type: 'string' } },
      required: ['collection'],
    },
  },
  {
    name: 'add_or_update_collection_requests',
    description:
      'Create or update several REST requests in a collection (matched by exact request name). Omitted optional fields keep their current value; "" clears one.',
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
              method: { type: 'string', enum: HTTP_METHODS },
              url: { type: 'string' },
              headers: keyValueItems,
              params: keyValueItems,
              body: { type: 'string' },
              contentType: { type: 'string', enum: STRING_BODY_CONTENT_TYPES },
              preRequestScript: { type: 'string' },
              testScript: { type: 'string' },
              description: {
                type: 'string',
                description: 'Markdown documentation for the request',
              },
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
      'Open a saved request into a tab by name, optionally scoped to a collection/folder.',
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
    name: 'create_team',
    description:
      'Create a new team workspace and switch to it. Its collections and environments are shared with the team members.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'switch_workspace',
    description:
      'Switch the active workspace: "personal" or the name of one of the user\'s teams (listed in the context).',
    input_schema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: '"personal" or a team name',
        },
      },
      required: ['workspace'],
    },
  },
  {
    name: 'rename_team',
    description:
      'Rename a team (owners only). Defaults to the active team when no team name is given.',
    input_schema: {
      type: 'object',
      properties: {
        new_name: { type: 'string' },
        team: {
          type: 'string',
          description: 'Team to rename (default: active)',
        },
      },
      required: ['new_name'],
    },
  },
  {
    name: 'set_collection_properties',
    description:
      'Set collection/folder-level properties inherited by its requests: auth, headers, variables (with secrets), and pre-request/test scripts. Only the given sections change; headers and variables are merged by key.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        auth: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['none', 'inherit', 'bearer', 'basic', 'api-key'],
            },
            token: { type: 'string', description: 'bearer' },
            username: { type: 'string', description: 'basic' },
            password: { type: 'string', description: 'basic' },
            key: { type: 'string', description: 'api-key header/param name' },
            value: { type: 'string', description: 'api-key value' },
            add_to: { type: 'string', enum: ['headers', 'query'] },
          },
          required: ['type'],
        },
        headers: keyValueItems,
        remove_headers: { type: 'array', items: { type: 'string' } },
        variables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              value: {
                type: 'string',
                description:
                  'Copy a <<local-ref:...>> unchanged and set secret to true.',
              },
              secret: { type: 'boolean' },
            },
            required: ['key', 'value'],
          },
        },
        remove_variables: { type: 'array', items: { type: 'string' } },
        pre_request_script: { type: 'string' },
        test_script: { type: 'string' },
      },
      required: ['collection'],
    },
  },
  {
    name: 'set_request_description',
    description:
      'Set the Markdown documentation (description) of the active request tab, or of a saved request when `request` (and optionally `collection`) names it.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        request: { type: 'string', description: 'Saved request name' },
        collection: {
          type: 'string',
          description: 'Collection/folder to search',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'set_collection_description',
    description:
      'Set the Markdown documentation (description) of a collection or folder, by name.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['collection', 'description'],
    },
  },
  {
    name: 'publish_documentation',
    description:
      'Publish the public documentation page of a collection (new version: CURRENT, auto-synced), or update the title/environment of an existing version. Attaching an environment exposes its values publicly.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        title: { type: 'string' },
        version: { type: 'string', description: 'e.g. CURRENT, v1, 2.0' },
        environment: {
          type: 'string',
          description: 'Environment name to attach',
        },
      },
      required: ['collection'],
    },
  },
  {
    name: 'unpublish_documentation',
    description:
      'Remove a published documentation version of a collection (the only version when `version` is omitted).',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        version: { type: 'string' },
      },
      required: ['collection'],
    },
  },
  {
    name: 'create_mock_server',
    description:
      'Create a mock server for a root collection. It serves the saved example responses of the requests; requests without examples answer 404.',
    input_schema: {
      type: 'object',
      properties: {
        collection: { type: 'string' },
        name: {
          type: 'string',
          description: 'Letters, digits, spaces, . _ - ( ) [ ] { } < >',
        },
        delay_ms: { type: 'integer', description: 'Response delay 0-60000' },
        public: {
          type: 'boolean',
          description: 'true = no API key needed (default)',
        },
      },
      required: ['collection'],
    },
  },
  {
    name: 'list_mock_servers',
    description: 'List the mock servers with their URLs.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'update_mock_server',
    description:
      'Update a mock server by name: enable/disable it, change its delay, visibility, or name.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        active: { type: 'boolean' },
        delay_ms: { type: 'integer' },
        public: { type: 'boolean' },
        new_name: { type: 'string' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_mock_server',
    description: 'Delete a mock server by its exact name.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'get_graphql_schema',
    description:
      'Return the introspected GraphQL schema of the active GraphQL tab (operation roots and types). Call it before writing a query or mutation.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_collections',
    description:
      'Return the outline of the collections (folders and request names) of the active workspace. Call it before opening, saving into, or running a collection by name.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'run_collection',
    description:
      'Run a collection through the runner (requests + tests) and return its summary; optionally select an environment first.',
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

/**
 * Tools that stay loaded in every request: the ones almost every turn needs.
 * Everything else is declared with `defer_loading` and discovered on demand
 * through the tool search tool, which keeps the static prefix small.
 */
export const CORE_TOOL_NAMES = new Set<string>([
  'set_method',
  'set_url',
  'set_body',
  'add_or_update_headers',
  'add_or_update_params',
  'set_bearer_auth',
  'remove_header',
  'remove_param',
  'run_request',
  'save_request',
  // Tiny, and referenced by name from the context hints.
  'get_graphql_schema',
  'list_collections',
]);

/** Anthropic's server-side tool search (regex variant, GA — no beta header). */
export const TOOL_SEARCH_TOOL = {
  type: 'tool_search_tool_regex_20251119' as const,
  name: 'tool_search_tool_regex' as const,
};

/**
 * The `tools` array for one request. With deferral on, the search tool leads
 * and every non-core tool is sent with `defer_loading: true` (the API needs
 * the full definitions server-side to run the search and expand results).
 */
export const buildChatTools = (deferNonCore: boolean): Anthropic.ToolUnion[] =>
  deferNonCore
    ? [
        TOOL_SEARCH_TOOL,
        ...CHAT_TOOLS.map((tool) =>
          CORE_TOOL_NAMES.has(tool.name)
            ? tool
            : { ...tool, defer_loading: true },
        ),
      ]
    : [...CHAT_TOOLS];
