import type { MCPAuth, MCPEnvVar } from "@hoppscotch/data"

export interface MCPServerEntry {
  id: string
  name: string
  description: string
  category:
    | "ai"
    | "database"
    | "filesystem"
    | "web"
    | "development"
    | "productivity"
    | "other"
  transport: "http" | "stdio"
  url?: string
  auth?: MCPAuth
  command?: string
  args?: string[]
  envVars?: MCPEnvVar[]
  documentation?: string
  homepage?: string
  tags?: string[]
  popular?: boolean
}

export const MCP_SERVER_CATALOG: MCPServerEntry[] = [
  {
    id: "github-mcp",
    name: "GitHub MCP Server",
    description:
      "Access repositories, issues, pull requests, and code search from GitHub.",
    category: "development",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envVars: [
      {
        key: "GITHUB_PERSONAL_ACCESS_TOKEN",
        value: "",
        active: true,
      },
    ],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["github", "git", "code-search"],
    popular: true,
  },
  {
    id: "filesystem-mcp",
    name: "Filesystem MCP Server",
    description:
      "Read, write, and search local files through a filesystem MCP server.",
    category: "filesystem",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["filesystem", "local", "files"],
    popular: true,
  },
  {
    id: "postgres-mcp",
    name: "PostgreSQL MCP Server",
    description: "Query and inspect PostgreSQL databases with MCP tools.",
    category: "database",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    envVars: [
      {
        key: "POSTGRES_CONNECTION_STRING",
        value: "",
        active: true,
      },
    ],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["postgres", "sql", "database"],
    popular: true,
  },
  {
    id: "fetch-mcp",
    name: "Web Fetch MCP Server",
    description: "Fetch web content and inspect responses through MCP.",
    category: "web",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["http", "fetch", "web"],
  },
  {
    id: "memory-mcp",
    name: "Memory MCP Server",
    description: "Knowledge graph memory server for AI assistant workflows.",
    category: "ai",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["memory", "knowledge", "assistant"],
    popular: true,
  },
  {
    id: "custom-http",
    name: "Custom HTTP Server",
    description: "Connect to your own MCP endpoint over HTTP.",
    category: "other",
    transport: "http",
    url: "http://localhost:3001/mcp",
    auth: {
      authType: "none",
      authActive: false,
    },
    tags: ["custom", "http"],
  },
  {
    id: "custom-stdio",
    name: "Custom STDIO Server",
    description: "Run a custom local MCP server command through STDIO.",
    category: "other",
    transport: "stdio",
    command: "",
    args: [],
    envVars: [],
    tags: ["custom", "stdio"],
  },
]

export const SERVER_CATEGORIES = [
  { id: "ai", name: "AI & ML" },
  { id: "database", name: "Databases" },
  { id: "filesystem", name: "Filesystem" },
  { id: "web", name: "Web & APIs" },
  { id: "development", name: "Development" },
  { id: "productivity", name: "Productivity" },
  { id: "other", name: "Other" },
] as const

export function getPopularServers() {
  return MCP_SERVER_CATALOG.filter((server) => server.popular)
}

export function searchServers(query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return MCP_SERVER_CATALOG
  }

  return MCP_SERVER_CATALOG.filter((server) => {
    const tagMatch = server.tags?.some((tag) =>
      tag.toLowerCase().includes(normalizedQuery)
    )

    return (
      server.name.toLowerCase().includes(normalizedQuery) ||
      server.description.toLowerCase().includes(normalizedQuery) ||
      tagMatch === true
    )
  })
}
