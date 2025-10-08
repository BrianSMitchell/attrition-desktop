# Supabase MCP Server

A Model Context Protocol (MCP) server that provides tools to interact with your Supabase database.

## Features

This MCP server provides the following capabilities:

### Resources
- **List Tables**: View all tables in your Supabase database
- **Read Table**: View contents of any table (limited to 100 rows)

### Tools
- **query**: Execute queries on Supabase tables with filters
- **insert**: Insert data into tables
- **update**: Update existing data
- **delete**: Delete data from tables
- **execute_sql**: Execute raw SQL queries (use with caution)

## Development

Install dependencies:
```bash
npm install
```

Build the server:
```bash
npm run build
```

For development with auto-rebuild:
```bash
npm run watch
```

## Setup

### 1. Environment Variables

You need to set these environment variables for the MCP server to connect to your Supabase instance:

- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### 2. Configure in Warp

Add the following to your Warp MCP configuration. On Windows, this is typically in:
`%APPDATA%\Warp\mcp_settings.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["C:\\Projects\\Attrition\\packages\\server\\supabase\\build\\index.js"],
      "env": {
        "SUPABASE_URL": "your_supabase_url_here",
        "SUPABASE_ANON_KEY": "your_supabase_anon_key_here"
      }
    }
  }
}
```

**Replace** `your_supabase_url_here` and `your_supabase_anon_key_here` with your actual Supabase credentials.

### 3. Restart Warp

After configuring, restart Warp for the changes to take effect.

## Usage Examples

Once configured, you can use the Supabase MCP tools in your conversations:

### Query a table
```
Can you query the users table and show me all active users?
```

### Insert data
```
Insert a new user with email "test@example.com" and name "Test User"
```

### Update data
```
Update the user with id 123 to set their status to "active"
```

### Delete data
```
Delete all users where status is "inactive"
```

### Debugging

Since MCP servers communicate over stdio, debugging can be challenging. We recommend using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector), which is available as a package script:

```bash
npm run inspector
```

The Inspector will provide a URL to access debugging tools in your browser.

## Security Notes

- The `execute_sql` tool allows raw SQL execution - use with extreme caution
- Row Level Security (RLS) policies in your Supabase database still apply
- The anon key is used, so only operations permitted by your RLS policies will succeed
- For production use, consider implementing additional validation and rate limiting

## Troubleshooting

### Connection Issues
- Verify your `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that your Supabase project is accessible
- Ensure your network allows connections to Supabase

### Permission Errors
- Check your Row Level Security (RLS) policies in Supabase
- Ensure the anon key has the necessary permissions
- Review your Supabase table permissions
