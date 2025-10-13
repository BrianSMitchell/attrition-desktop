import { MCPProtocolHandler, MCPHttpTransport, MCPTool } from '@agentdb/mcp-protocol';
import fetch, { Response } from 'node-fetch';
import { config as dotenvConfig } from 'dotenv';
import express from 'express';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ERROR_MESSAGES } from '../constants/response-formats';



// Load environment variables
import { HTTP_STATUS } from '../packages/shared/src/response-formats';
dotenvConfig();

const RENDER_API_URL = 'https://api.render.com/v1';

interface Deploy {
  id: string;
  [key: string]: unknown;
}

class RenderToolsProvider {
  getTools(): MCPTool[] {
    return [
      {
        name: 'deploy_info',
        description: 'Get information about the latest deployment',
        inputSchema: {
          type: 'object' as const,
          properties: {
            service_id: {
              type: 'string',
              description: 'The Render service ID'
            }
          },
          required: ['service_id']
        }
      },
      {
        name: 'deploy_logs',
        description: 'Get logs from the latest deployment',
        inputSchema: {
          type: 'object' as const,
          properties: {
            service_id: {
              type: 'string',
              description: 'The Render service ID'
            },
            limit: {
              type: 'number',
              description: 'Number of log lines to fetch',
              default: 100
            }
          },
          required: ['service_id']
        }
      },
      {
        name: 'trigger_deploy',
        description: 'Trigger a new deployment',
        inputSchema: {
          type: 'object' as const,
          properties: {
            service_id: {
              type: 'string',
              description: 'The Render service ID'
            }
          },
          required: ['service_id']
        }
      }
    ];
  }
}

interface ServiceHandler {
  service_id: string;
}

interface LogsHandler extends ServiceHandler {
  limit?: number;
}

async function toolHandler(name: string, args: Record<string, any>) {
  const service_id = args.service_id;
  if (!service_id) {
    throw new Error('service_id is required');
  }

  switch (name) {
    case 'deploy_info': {
      const response = await fetch(`${RENDER_API_URL}/services/${service_id}/deploys`, {
        headers: {
          'Authorization': `Bearer ${process.env.RENDER_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch deploy info: ${response.statusText}`);
      }

      const deploys = await response.json() as Deploy[];
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(deploys[0], null, 2)
        }]
      };
    }

    case 'deploy_logs': {
      const limit = args.limit ?? 100;
      
      // First get the latest deploy ID
      const deployResponse = await fetch(`${RENDER_API_URL}/services/${service_id}/deploys`, {
        headers: {
          'Authorization': `Bearer ${process.env.RENDER_API_KEY}`
        }
      });

      if (!deployResponse.ok) {
        throw new Error(`Failed to fetch deploy info: ${deployResponse.statusText}`);
      }

      const deploys = await deployResponse.json() as Deploy[];
      const latestDeploy = deploys[0];

      if (!latestDeploy) {
        throw new Error('No deployments found');
      }

      // Now fetch the logs for this deployment
      const logsResponse = await fetch(
        `${RENDER_API_URL}/services/${service_id}/deploys/${latestDeploy.id}/logs?limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.RENDER_API_KEY}`
          }
        }
      );

      if (!logsResponse.ok) {
        throw new Error(`Failed to fetch logs: ${logsResponse.statusText}`);
      }

      const logs = await logsResponse.json();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(logs, null, 2)
        }]
      };
    }

    case 'trigger_deploy': {
      const response = await fetch(`${RENDER_API_URL}/services/${service_id}/deploys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RENDER_API_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger deployment: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2)
        }]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create MCP server components
const serverConfig = {
  serverInfo: {
    name: 'Render MCP Server',
    version: '1.0.0'
  },
  enableDebug: true
};

const toolsProvider = new RenderToolsProvider();
const protocolHandler = new MCPProtocolHandler(serverConfig, toolsProvider, toolHandler);
const httpTransport = new MCPHttpTransport(protocolHandler);

// Create Express app
const app = express();
app.use(express.json());

// Handle MCP requests
app.all('/mcp', async (req, res) => {
  try {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value[0];
      }
    }

    const response = await httpTransport.handleHttpRequest(
      req.method,
      req.method === 'POST' ? JSON.stringify(req.body) : null,
      headers,
      { debug: true }
    );
    
    res.status(response.statusCode);
    Object.entries(response.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
    res.send(response.body);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: ERROR_MESSAGES.INTERNAL_ERROR });
  }
});

// Health check endpoint
app.get(API_ENDPOINTS.SYSTEM.HEALTH, (req, res) => {
  res.json({ status: 'ok', server: 'Render MCP Server' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Render MCP Server running on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log('\nExample MCP requests:');
  console.log('1. Initialize: POST /mcp with {"jsonrpc":"2.0","method":"initialize","params":{},"id":"1"}');
  console.log('2. List tools: POST /mcp with {"jsonrpc":"2.0","method":"tools/list","params":{},"id":"2"}');
  console.log('3. Call tool: POST /mcp with {"jsonrpc":"2.0","method":"tools/call","params":{"name":"deploy_info","arguments":{"service_id":"srv-xyz"}},"id":"3"}');
});




