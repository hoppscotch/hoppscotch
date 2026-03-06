import { collectionToMcpTools } from './mcp-tool-generator';
import { CollectionFolder } from 'src/types/CollectionFolder';

function makeCollection(overrides: Partial<CollectionFolder> = {}): CollectionFolder {
  return {
    id: 'col1',
    name: 'My Collection',
    folders: [],
    requests: [],
    data: undefined,
    ...overrides,
  };
}

describe('collectionToMcpTools', () => {
  it('returns empty array for empty collection', () => {
    const tools = collectionToMcpTools(makeCollection());
    expect(tools).toEqual([]);
  });

  it('generates a tool for a REST GET request with path params', () => {
    const collection = makeCollection({
      requests: [
        {
          name: 'Get User',
          method: 'GET',
          endpoint: 'https://api.example.com/users/:id',
          headers: [],
          params: [],
          body: { contentType: null, body: '' },
          auth: null,
        },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.name).toBe('get_user');
    expect(tool.description).toBe('Get User — GET https://api.example.com/users/:id');
    expect(tool._meta.method).toBe('GET');
    expect(tool._meta.reqType).toBe('REST');
    expect(tool.inputSchema.properties).toHaveProperty('id');
    expect(tool.inputSchema.required).toContain('id');
  });

  it('generates a tool for a REST request with query params', () => {
    const collection = makeCollection({
      requests: [
        {
          name: 'List Items',
          method: 'GET',
          endpoint: 'https://api.example.com/items',
          headers: [],
          params: [
            { key: 'page', value: '1', active: true },
            { key: 'limit', value: '10', active: true },
            { key: 'disabled', value: '', active: false },
          ],
          body: { contentType: null, body: '' },
          auth: null,
        },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.name).toBe('list_items');
    expect(tool.inputSchema.properties).toHaveProperty('page');
    expect(tool.inputSchema.properties).toHaveProperty('limit');
    expect(tool.inputSchema.properties).not.toHaveProperty('disabled');
    // query params are not required
    expect(tool.inputSchema.required).not.toContain('page');
  });

  it('generates a tool for a GQL request with variables', () => {
    const collection = makeCollection({
      requests: [
        {
          name: 'Get Repo',
          query: 'query GetRepo($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { id } }',
          variables: '{"owner": "octocat", "name": "hello-world"}',
          endpoint: 'https://api.github.com/graphql',
          headers: [],
          auth: null,
        },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools).toHaveLength(1);

    const tool = tools[0];
    expect(tool.name).toBe('get_repo');
    expect(tool._meta.reqType).toBe('GQL');
    expect(tool._meta.gqlQuery).toContain('query GetRepo');
    expect(tool.inputSchema.properties).toHaveProperty('owner');
    expect(tool.inputSchema.properties).toHaveProperty('name');
  });

  it('walks nested folders and collects all requests', () => {
    const collection = makeCollection({
      requests: [
        { name: 'Root Request', method: 'GET', endpoint: '/root', headers: [], params: [], body: { contentType: null, body: '' }, auth: null },
      ],
      folders: [
        {
          id: 'f1',
          name: 'Sub Folder',
          folders: [],
          requests: [
            { name: 'Nested Request', method: 'POST', endpoint: '/nested', headers: [], params: [], body: { contentType: null, body: '' }, auth: null },
          ],
          data: undefined,
        },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools).toHaveLength(2);
    expect(tools.map((t) => t.name)).toContain('root_request');
    expect(tools.map((t) => t.name)).toContain('nested_request');
  });

  it('handles tool name collisions by appending _2, _3', () => {
    const collection = makeCollection({
      requests: [
        { name: 'Get Item', method: 'GET', endpoint: '/a', headers: [], params: [], body: { contentType: null, body: '' }, auth: null },
        { name: 'Get Item', method: 'GET', endpoint: '/b', headers: [], params: [], body: { contentType: null, body: '' }, auth: null },
        { name: 'Get Item', method: 'GET', endpoint: '/c', headers: [], params: [], body: { contentType: null, body: '' }, auth: null },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools).toHaveLength(3);
    expect(tools[0].name).toBe('get_item');
    expect(tools[1].name).toBe('get_item_2');
    expect(tools[2].name).toBe('get_item_3');
  });

  it('slugifies titles correctly', () => {
    const collection = makeCollection({
      requests: [
        {
          name: 'Create New   User (Admin)',
          method: 'POST',
          endpoint: '/users',
          headers: [],
          params: [],
          body: { contentType: null, body: '' },
          auth: null,
        },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools[0].name).toBe('create_new___user_admin');
  });

  it('truncates tool names to 64 chars', () => {
    const longName = 'a'.repeat(100);
    const collection = makeCollection({
      requests: [
        { name: longName, method: 'GET', endpoint: '/x', headers: [], params: [], body: { contentType: null, body: '' }, auth: null },
      ],
    });

    const tools = collectionToMcpTools(collection);
    expect(tools[0].name.length).toBeLessThanOrEqual(64);
  });

  it('excludes inactive headers from _meta.headers', () => {
    const collection = makeCollection({
      requests: [
        {
          name: 'Auth Request',
          method: 'GET',
          endpoint: '/secure',
          headers: [
            { key: 'Authorization', value: 'Bearer token', active: true },
            { key: 'X-Disabled', value: 'no', active: false },
          ],
          params: [],
          body: { contentType: null, body: '' },
          auth: null,
        },
      ],
    });

    const tools = collectionToMcpTools(collection);
    const meta = tools[0]._meta;
    expect(meta.headers).toHaveLength(1);
    expect(meta.headers[0].key).toBe('Authorization');
  });
});
