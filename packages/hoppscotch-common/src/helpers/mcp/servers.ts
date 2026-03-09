/**
 * MCP Server Catalog
 * Registry of known MCP servers for quick connection
 */

import { HoppMCPAuth } from "@hoppscotch/data"

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
  // HTTP transport config
  url?: string
  auth?: HoppMCPAuth
  // STDIO transport config
  command?: string
  args?: string[]
  envVars?: { key: string; value: string }[]
  // Metadata
  documentation?: string
  homepage?: string
  tags?: string[]
  popular?: boolean
}

/**
 * Built-in MCP Server Catalog
 */
export const MCP_SERVER_CATALOG: MCPServerEntry[] = [
  // Development Tools
  {
    id: "github-mcp",
    name: "GitHub MCP Server",
    description:
      "Access GitHub repositories, issues, pull requests, and code search",
    category: "development",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envVars: [{ key: "GITHUB_PERSONAL_ACCESS_TOKEN", value: "" }],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["github", "git", "version-control"],
    popular: true,
  },
  {
    id: "gitlab-mcp",
    name: "GitLab MCP Server",
    description:
      "Interact with GitLab repositories, issues, and merge requests",
    category: "development",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    envVars: [{ key: "GITLAB_PERSONAL_ACCESS_TOKEN", value: "" }],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["gitlab", "git", "version-control"],
  },

  // Filesystem
  {
    id: "filesystem-mcp",
    name: "Filesystem MCP Server",
    description: "Read, write, and search files on your local filesystem",
    category: "filesystem",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["filesystem", "files", "local"],
    popular: true,
  },

  // Database
  {
    id: "postgres-mcp",
    name: "PostgreSQL MCP Server",
    description: "Query and manage PostgreSQL databases",
    category: "database",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    envVars: [{ key: "POSTGRES_CONNECTION_STRING", value: "" }],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["postgresql", "database", "sql"],
    popular: true,
  },
  {
    id: "sqlite-mcp",
    name: "SQLite MCP Server",
    description: "Query SQLite databases",
    category: "database",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/database.db"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["sqlite", "database", "sql"],
  },

  // Web & APIs
  {
    id: "fetch-mcp",
    name: "Web Fetch MCP Server",
    description: "Make HTTP requests and fetch web content",
    category: "web",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["http", "fetch", "web"],
  },
  {
    id: "puppeteer-mcp",
    name: "Puppeteer MCP Server",
    description: "Browser automation and web scraping",
    category: "web",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["puppeteer", "browser", "automation"],
  },

  // Productivity
  {
    id: "google-drive-mcp",
    name: "Google Drive MCP Server",
    description: "Access and manage Google Drive files",
    category: "productivity",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gdrive"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["google-drive", "storage", "cloud"],
  },
  {
    id: "slack-mcp",
    name: "Slack MCP Server",
    description: "Send messages and interact with Slack workspaces",
    category: "productivity",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    envVars: [
      { key: "SLACK_BOT_TOKEN", value: "" },
      { key: "SLACK_TEAM_ID", value: "" },
    ],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["slack", "chat", "communication"],
  },

  // AI & ML
  {
    id: "memory-mcp",
    name: "Memory MCP Server",
    description: "Knowledge graph memory for AI assistants",
    category: "ai",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    documentation: "https://github.com/modelcontextprotocol/servers",
    tags: ["memory", "knowledge-graph", "ai"],
    popular: true,
  },

  // Custom/Testing
  {
    id: "custom-http",
    name: "Custom HTTP Server",
    description: "Connect to your own MCP server via HTTP",
    category: "other",
    transport: "http",
    url: "http://localhost:3001/mcp",
    auth: { authType: "none", authActive: false },
    tags: ["custom", "http"],
  },
  {
    id: "custom-stdio",
    name: "Custom STDIO Server",
    description: "Run your own MCP server process",
    category: "other",
    transport: "stdio",
    command: "",
    args: [],
    tags: ["custom", "stdio"],
  },
]

/**
 * Get servers by category
 */
export function getServersByCategory(
  category: MCPServerEntry["category"]
): MCPServerEntry[] {
  return MCP_SERVER_CATALOG.filter((server) => server.category === category)
}

/**
 * Get popular servers
 */
export function getPopularServers(): MCPServerEntry[] {
  return MCP_SERVER_CATALOG.filter((server) => server.popular === true)
}

/**
 * Search servers by name, description, or tags
 */
export function searchServers(query: string): MCPServerEntry[] {
  const lowerQuery = query.toLowerCase()
  return MCP_SERVER_CATALOG.filter(
    (server) =>
      server.name.toLowerCase().includes(lowerQuery) ||
      server.description.toLowerCase().includes(lowerQuery) ||
      server.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  )
}

/**
 * Get server by ID
 */
export function getServerById(id: string): MCPServerEntry | undefined {
  return MCP_SERVER_CATALOG.find((server) => server.id === id)
}

/**
 * Server categories with metadata
 */
export const SERVER_CATEGORIES = [
  { id: "ai", name: "AI & ML", icon: "brain" },
  { id: "database", name: "Databases", icon: "database" },
  { id: "filesystem", name: "Filesystem", icon: "folder" },
  { id: "web", name: "Web & APIs", icon: "globe" },
  { id: "development", name: "Development", icon: "code" },
  { id: "productivity", name: "Productivity", icon: "zap" },
  { id: "other", name: "Other", icon: "more-horizontal" },
] as const
