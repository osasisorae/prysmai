/**
 * MCP Documentation Server — Streamable HTTP Transport
 *
 * Exposes Prysm AI documentation as MCP resources and tools.
 * Any MCP-compatible client (Claude Desktop, Cursor, Windsurf, etc.)
 * can connect and query the docs in real-time.
 *
 * Tools:
 *   - prysm_search_docs: Full-text search across all documentation
 *   - prysm_get_section: Get a specific documentation section by ID
 *   - prysm_list_sections: List all available documentation sections
 *
 * Resources:
 *   - prysm://docs/full: Complete documentation as a single Markdown document
 *   - prysm://docs/{section_id}: Individual section Markdown
 *
 * Transport: Streamable HTTP at POST /api/mcp/docs
 * Auth: None required — documentation is public
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Express, Request, Response } from "express";
import {
  DOCS,
  DOC_GROUPS,
  getAllDocsMarkdown,
  getSectionMarkdown,
  searchDocs,
} from "../../shared/docs-content";

/**
 * Create a fresh MCP docs server instance scoped to a single request.
 */
function createDocsServer(): Server {
  const server = new Server(
    {
      name: "prysm-docs",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // ─── Tools ───────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "prysm_search_docs",
        description:
          "Search Prysm AI documentation by keyword. Returns matching sections with relevance snippets. Use this to find specific topics, API references, or troubleshooting guides.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description:
                "Search query — a keyword, phrase, or topic to find in the documentation (e.g., 'governance', 'API key', 'LangGraph', 'prompt injection')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "prysm_get_section",
        description:
          "Get the full Markdown content of a specific documentation section by its ID. Use prysm_list_sections first to discover available section IDs.",
        inputSchema: {
          type: "object" as const,
          properties: {
            section_id: {
              type: "string",
              description:
                "The section ID (e.g., 'getting-started', 'governance', 'python-sdk', 'security'). Use prysm_list_sections to see all available IDs.",
            },
          },
          required: ["section_id"],
        },
      },
      {
        name: "prysm_list_sections",
        description:
          "List all available documentation sections with their IDs, titles, groups, and summaries. Use this to discover what documentation is available before fetching specific sections.",
        inputSchema: {
          type: "object" as const,
          properties: {
            group: {
              type: "string",
              description:
                "Optional: filter by group name (getting-started, sdk, platform, security, reference). Omit to list all sections.",
            },
          },
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case "prysm_search_docs": {
        const query = (args as any)?.query;
        if (!query || typeof query !== "string") {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: 'query' parameter is required and must be a string.",
              },
            ],
          };
        }

        const results = searchDocs(query);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No documentation found matching "${query}". Try a different keyword or use prysm_list_sections to browse all available topics.`,
              },
            ],
          };
        }

        const formatted = results
          .map(
            (r, i) =>
              `### ${i + 1}. ${r.title} (id: \`${r.id}\`)\n${r.summary}\n\n> ${r.snippet}`
          )
          .join("\n\n---\n\n");

        return {
          content: [
            {
              type: "text" as const,
              text: `Found ${results.length} matching section(s) for "${query}":\n\n${formatted}\n\n---\n\nUse \`prysm_get_section\` with any section ID above to get the full content.`,
            },
          ],
        };
      }

      case "prysm_get_section": {
        const sectionId = (args as any)?.section_id;
        if (!sectionId || typeof sectionId !== "string") {
          return {
            content: [
              {
                type: "text" as const,
                text: "Error: 'section_id' parameter is required. Use prysm_list_sections to see available IDs.",
              },
            ],
          };
        }

        const markdown = getSectionMarkdown(sectionId);
        if (!markdown) {
          const available = DOCS.map((d) => d.id).join(", ");
          return {
            content: [
              {
                type: "text" as const,
                text: `Section "${sectionId}" not found. Available sections: ${available}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: markdown,
            },
          ],
        };
      }

      case "prysm_list_sections": {
        const groupFilter = (args as any)?.group;

        let sections = DOCS;
        if (groupFilter && typeof groupFilter === "string") {
          sections = DOCS.filter((d) => d.group === groupFilter);
          if (sections.length === 0) {
            const validGroups = DOC_GROUPS.map((g) => g.key).join(", ");
            return {
              content: [
                {
                  type: "text" as const,
                  text: `No sections found in group "${groupFilter}". Valid groups: ${validGroups}`,
                },
              ],
            };
          }
        }

        const grouped: Record<string, typeof sections> = {};
        for (const section of sections) {
          if (!grouped[section.group]) grouped[section.group] = [];
          grouped[section.group].push(section);
        }

        let output = "# Prysm AI Documentation\n\n";
        for (const group of DOC_GROUPS) {
          const items = grouped[group.key];
          if (!items) continue;
          output += `## ${group.label}\n\n`;
          for (const item of items) {
            output += `- **${item.title}** (id: \`${item.id}\`) — ${item.summary}\n`;
          }
          output += "\n";
        }

        output +=
          "\n---\n\nUse `prysm_get_section` with any section ID to get the full Markdown content.";

        return {
          content: [
            {
              type: "text" as const,
              text: output,
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: "text" as const,
              text: `Unknown tool: ${name}. Available tools: prysm_search_docs, prysm_get_section, prysm_list_sections`,
            },
          ],
        };
    }
  });

  // ─── Resources ───────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "prysm://docs/full",
        name: "Complete Prysm AI Documentation",
        description:
          "The entire Prysm AI documentation as a single Markdown document. Use for comprehensive context or when you need to reference multiple sections.",
        mimeType: "text/markdown",
      },
      ...DOCS.map((section) => ({
        uri: `prysm://docs/${section.id}`,
        name: section.title,
        description: section.summary,
        mimeType: "text/markdown",
      })),
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    if (uri === "prysm://docs/full") {
      return {
        contents: [
          {
            uri: "prysm://docs/full",
            mimeType: "text/markdown",
            text: getAllDocsMarkdown(),
          },
        ],
      };
    }

    const match = uri.match(/^prysm:\/\/docs\/(.+)$/);
    if (match) {
      const sectionId = match[1];
      const markdown = getSectionMarkdown(sectionId);
      if (markdown) {
        return {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: markdown,
            },
          ],
        };
      }
    }

    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: `Resource not found: ${uri}`,
        },
      ],
    };
  });

  return server;
}

/**
 * Register the MCP docs endpoint on the Express app.
 * POST /api/mcp/docs — handles MCP JSON-RPC messages for documentation queries.
 * GET  /api/mcp/docs — health check / server metadata.
 */
export function registerMcpDocsRoutes(app: Express): void {
  // POST /api/mcp/docs — Streamable HTTP transport (one Server per request)
  app.post("/api/mcp/docs", async (req: Request, res: Response) => {
    let mcpServer: Server | null = null;

    try {
      // Create a fresh server + transport for this request
      mcpServer = createDocsServer();

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // stateless mode
      });

      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      await mcpServer.close();
      mcpServer = null;
    } catch (err: any) {
      console.error("[MCP Docs] Request error:", err);

      if (mcpServer) {
        try {
          await mcpServer.close();
        } catch {
          // Ignore cleanup errors
        }
      }

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: req.body?.id ?? null,
        });
      }
    }
  });

  // GET /api/mcp/docs — health check / connection info
  app.get("/api/mcp/docs", (_req: Request, res: Response) => {
    res.json({
      name: "prysm-docs",
      version: "1.0.0",
      protocol: "mcp",
      transport: "streamable-http",
      description:
        "Prysm AI documentation server. Connect from Claude Desktop, Cursor, or any MCP client to query docs in real-time.",
      tools: [
        "prysm_search_docs",
        "prysm_get_section",
        "prysm_list_sections",
      ],
      resources: [
        "prysm://docs/full",
        ...DOCS.map((s) => `prysm://docs/${s.id}`),
      ],
      sections: DOCS.length,
      connection: {
        url: "/api/mcp/docs",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        note: "No authentication required — documentation is public.",
      },
    });
  });

  console.log("[MCP Docs] Documentation MCP server registered at /api/mcp/docs");
}
