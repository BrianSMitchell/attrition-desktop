# Render MCP Server

A Model Context Protocol (MCP) server for interacting with Render services. This server provides tools for retrieving deployment information, logs, and triggering new deployments through the MCP protocol.

## Features

- **deploy_info**: Get information about the latest deployment
- **deploy_logs**: Get logs from a deployment (with optional limit)
- **trigger_deploy**: Trigger a new deployment

## Prerequisites

- Node.js >= 18.0.0
- A Render account and API key
- An MCP-compatible client (like Claude in Cursor)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

## Configuration

1. Create a `.env` file in the root directory:
```bash
RENDER_API_KEY=your_render_api_key_here
```

2. Replace `your_render_api_key_here` with your actual Render API key from https://dashboard.render.com/account/api-keys

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm start
```

## Running the Server

```bash
npm start
```

The server will start on port 3000 (or the port specified in the `PORT` environment variable).

## API Endpoints

### MCP Endpoint
- URL: `http://localhost:3000/mcp`
- Method: `POST`

### Health Check
- URL: `http://localhost:3000/health`
- Method: `GET`

## Using with Claude

1. Start the server:
```bash
npm start
```

2. In Cursor, click the '+' button next to "MCP Servers" and add:
```
http://localhost:3000/mcp
```

3. After connecting, you can ask Claude to interact with your Render deployments, for example:
```
Can you check the status of my latest deployment on service srv-abc123?
```

## Tool Reference

### deploy_info
Get information about the latest deployment for a service.

**Parameters:**
- `service_id` (string, required): The Render service ID

**Example Response:**
```json
{
  "id": "dep-abc123",
  "status": "live",
  "commit": {
    "id": "abc123",
    "message": "Update README.md"
  },
  "createdAt": "2024-02-20T12:34:56Z"
}
```

### deploy_logs
Get logs from a deployment.

**Parameters:**
- `service_id` (string, required): The Render service ID
- `limit` (number, optional): Number of log lines to fetch (default: 100)

**Example Response:**
```json
{
  "lines": [
    {
      "timestamp": "2024-02-20T12:34:56Z",
      "message": "Starting build..."
    }
  ]
}
```

### trigger_deploy
Trigger a new deployment.

**Parameters:**
- `service_id` (string, required): The Render service ID

**Example Response:**
```json
{
  "id": "dep-xyz789",
  "status": "created"
}
```

## Error Handling

The server handles errors gracefully and returns them in the standard JSON-RPC 2.0 format:

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "Error message here"
  },
  "id": "request-id"
}
```

Common errors:
- Invalid/missing service ID
- Invalid/expired API key
- Network errors
- Service not found
- Rate limiting

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License

MIT License