# Test env-manager MCP Server via Stdio

## Initial Handshake Test

Send initialize request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "test-client",
      "version": "1.0.0"
    }
  }
}
```

## List Tools Test

After initialization, request tools:
```json
{
  "jsonrpc": "2.0",
  "id": 2, 
  "method": "tools/list"
}
```

Expected response should include:
- health_check
- create_project
- list_projects
- delete_project

## Transport Configuration

### VS Code Copilot (mcp.json)
```json
{
  "servers": {
    "env-manager": {
      "type": "stdio",
      "command": "docker",
      "args": ["exec", "-i", "env-manager", "node", "dist/stdio.js"]
    }
  }
}
```

### HTTP Transport (Alternative)
- Health endpoint: http://localhost:7272/health
- SSE endpoint: http://localhost:7272/sse  
- Web UI: http://localhost/env-manager/

## Phase 1 Tools Available

1. **create_project** - Create new project with Git repo and docker-compose service
2. **list_projects** - List all managed projects
3. **delete_project** - Delete project with optional data preservation
4. **health_check** - Service health and connectivity status
