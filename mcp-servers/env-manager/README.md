# env-manager MCP Server

AI-powered development environment orchestration via natural language.

## Phase 0: Foundation (Current)

Initial implementation with:
- MCP server scaffold with HTTP/SSE transport
- Health check tool
- Docker client for daemon communication
- Basic logging and configuration

## Quick Start

### Build and Start

```bash
cd d:/sandbox/dev_environment
docker compose build env-manager
docker compose up -d env-manager
```

### Test Health Check

```bash
curl http://localhost:7272/health
```

## REST API (JSON)

The REST API is available via the nginx gateway:

- Swagger UI: http://localhost/env-manager/api/docs
- OpenAPI spec: http://localhost/env-manager/api/swagger.json

Example: list projects

```bash
curl http://localhost/env-manager/api/projects
```

Example response:

```json
{
  "count": 1,
  "projects": [
    {
      "name": "web_ui_demo",
      "path": "/sandbox/web_ui_demo",
      "service": "web_ui_demo-human",
      "status": "configured",
      "human_container": "web_ui_demo-human",
      "agents": []
    }
  ]
}
```

### Configure Copilot

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "env-manager": {
      "type": "sse",
      "url": "http://localhost:7272/sse"
    }
  }
}
```

Then ask Copilot to run the health_check tool.

## Development

### Run Tests

```bash
docker exec env-manager npm test
```

### Watch Mode

```bash
docker exec env-manager npm run test:watch
```

## Architecture

```
Host VS Code (Copilot)
  ↓ HTTP/SSE: localhost:7272
env-manager container
  ↓ Docker socket: /var/run/docker.sock
  ↓ Filesystem: /dev_environment, /sandbox
Docker daemon
```

## API Conventions (Required for New Routes)

When adding REST routes, keep these conventions:

1) **JSON-first responses**
  - REST endpoints must return structured JSON.
  - MCP tools can keep `ToolResponse` text output.

2) **Swagger documentation**
  - Add JSDoc on every request field to document required/optional inputs.
  - Include examples in field descriptions when helpful.

3) **Gateway-aware URLs**
  - All REST endpoints are served behind nginx at `/env-manager/api/...`.
  - Swagger UI must work with the gateway path.

4) **Preview vs confirm**
  - For destructive actions, support `confirm: true`.
  - Return `status: "preview" | "success" | "error"` for REST responses.

## Next Phases

- Phase 1: Project Management (create, list, delete)
- Phase 2: Environment Operations (start, stop, restart)
- Phase 3: Agent Management (git worktrees)
- Phase 4: Configuration & Utilities
- Phase 5: Production Readiness

## License

See main repository LICENSE.
