import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Request, Response } from 'express';
import { nexusTools } from './tools';

/**
 * Creates and configures the standard MCP Server instance.
 */
export function createNexusMcpServer() {
  const server = new Server(
    {
      name: 'nexus-memory-fabric',
      version: '0.4.2'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Register tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: nexusTools.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema
      }))
    };
  });

  // Register tools/call
  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    const tool = nexusTools.find(t => t.name === name);

    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      const result = await tool.handler(args || {});
      return {
        content: [
          {
            type: 'text' as const,
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: `Error executing tool ${name}: ${err.message}`
          }
        ]
      };
    }
  });

  return server;
}

/**
 * Streamable HTTP JSON-RPC 2.0 endpoint handler for POST /mcp.
 * Enables web-based agent access (Cursor, Claude Code, etc.) over standard HTTP.
 */
export async function handleMcpHttpRequest(req: Request, res: Response) {
  const body = req.body;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: Expected JSON-RPC 2.0 object' },
      id: null
    });
  }

  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return res.status(400).json({
      jsonrpc: '2.0',
      error: { code: -32600, message: 'Invalid Request: jsonrpc must be "2.0"' },
      id: id ?? null
    });
  }

  try {
    switch (method) {
      case 'initialize': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: { listChanged: false }
            },
            serverInfo: {
              name: 'nexus-memory-fabric',
              version: '0.4.2'
            }
          }
        });
      }

      case 'ping': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {}
        });
      }

      case 'tools/list': {
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            tools: nexusTools.map(t => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema
            }))
          }
        });
      }

      case 'tools/call': {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const tool = nexusTools.find(t => t.name === toolName);

        if (!tool) {
          return res.status(404).json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool not found: ${toolName}` }
          });
        }

        const output = await tool.handler(toolArgs);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof output === 'string' ? output : JSON.stringify(output, null, 2)
              }
            ],
            isError: false
          }
        });
      }

      default: {
        return res.status(400).json({
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not supported: ${method}` }
        });
      }
    }
  } catch (err: any) {
    return res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: err.message }
    });
  }
}

/**
 * Runs stdio transport if invoked directly with --stdio.
 */
async function main() {
  if (process.argv.includes('--stdio')) {
    const server = createNexusMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Nexus MCP Server running on stdio');
  }
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('server/mcp/server.ts')) {
  main().catch(err => {
    console.error('MCP Stdio startup failure:', err);
    process.exit(1);
  });
}
