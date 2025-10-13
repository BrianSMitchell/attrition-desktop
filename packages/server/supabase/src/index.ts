import { ENV_VARS } from '../../../shared/src/constants/env-vars';

#!/usr/bin/env node

/**
 * Supabase MCP Server
 * Provides tools to interact with Supabase database and storage.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Environment variables should be set via MCP configuration.
 * Do NOT use dotenv or any file-based config loading as it may
 * produce stdout/stderr output that breaks MCP protocol.
 */

/**
 * Initialize Supabase client
 */
const supabaseUrl = process.env[ENV_VARS.SUPABASE_URL];
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY must be set"
  );
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

/**
 * Create an MCP server with capabilities for Supabase operations
 */
const server = new Server(
  {
    name: "supabase",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

/**
 * Handler for listing available resources (database tables)
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  try {
    // Get all tables from the public schema
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) throw error;

    return {
      resources: (tables || []).map((table: any) => ({
        uri: `supabase://table/${table.table_name}`,
        mimeType: "application/json",
        name: table.table_name,
        description: `Supabase table: ${table.table_name}`
      }))
    };
  } catch (error) {
    // Avoid stdout/stderr logging per MCP best practices
    return { resources: [] };
  }
});

/**
 * Handler for reading the contents of a specific table
 */
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  try {
    const url = new URL(request.params.uri);
    const tableName = url.pathname.replace(/^\//, '');

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(100);

    if (error) throw error;

    return {
      contents: [{
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Error reading table: ${error}`);
  }
});

/**
 * Handler that lists available Supabase tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Execute a query on a Supabase table",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Name of the table to query"
            },
            select: {
              type: "string",
              description: "Columns to select (default: '*')",
              default: "*"
            },
            filters: {
              type: "object",
              description: "Filter conditions (e.g., {column: 'value'})",
              additionalProperties: true
            },
            limit: {
              type: "number",
              description: "Maximum number of rows to return",
              default: 100
            }
          },
          required: ["table"]
        }
      },
      {
        name: "insert",
        description: "Insert data into a Supabase table",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Name of the table"
            },
            data: {
              type: "object",
              description: "Data to insert (single object or array of objects)",
              additionalProperties: true
            }
          },
          required: ["table", "data"]
        }
      },
      {
        name: "update",
        description: "Update data in a Supabase table",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Name of the table"
            },
            data: {
              type: "object",
              description: "Data to update",
              additionalProperties: true
            },
            filters: {
              type: "object",
              description: "Filter conditions to identify rows to update",
              additionalProperties: true
            }
          },
          required: ["table", "data", "filters"]
        }
      },
      {
        name: "delete",
        description: "Delete data from a Supabase table",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Name of the table"
            },
            filters: {
              type: "object",
              description: "Filter conditions to identify rows to delete",
              additionalProperties: true
            }
          },
          required: ["table", "filters"]
        }
      },
      {
        name: "execute_sql",
        description: "Execute raw SQL query (use with caution)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute"
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

/**
 * Handler for Supabase tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      case "query": {
        const { table, select = '*', filters = {}, limit = 100 } = request.params.arguments as any;
        
        let query = supabase.from(table).select(select).limit(limit);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      case "insert": {
        const { table, data } = request.params.arguments as any;
        
        const { data: result, error } = await supabase
          .from(table)
          .insert(data)
          .select();
        
        if (error) throw error;
        
        return {
          content: [{
            type: "text",
            text: `Successfully inserted: ${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case "update": {
        const { table, data, filters } = request.params.arguments as any;
        
        let query = supabase.from(table).update(data);
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { data: result, error } = await query.select();
        
        if (error) throw error;
        
        return {
          content: [{
            type: "text",
            text: `Successfully updated: ${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case "delete": {
        const { table, filters } = request.params.arguments as any;
        
        let query = supabase.from(table).delete();
        
        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
        
        const { error } = await query;
        
        if (error) throw error;
        
        return {
          content: [{
            type: "text",
            text: `Successfully deleted rows from ${table}`
          }]
        };
      }

      case "execute_sql": {
        const { query } = request.params.arguments as any;
        
        const { data, error } = await supabase.rpc('execute_sql', { query });
        
        if (error) throw error;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(data, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(() => {
  // Avoid writing to stdio. Exit with failure code.
  process.exit(1);
});
