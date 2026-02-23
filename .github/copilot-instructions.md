# Project Guidelines

## Code Style
- TypeScript in env-manager uses ESM (`"type": "module"`) and TSOA for REST routes; follow existing patterns in [mcp-servers/env-manager/src/server.ts](mcp-servers/env-manager/src/server.ts) and [mcp-servers/env-manager/src/controllers/ProjectController.ts](mcp-servers/env-manager/src/controllers/ProjectController.ts).
- REST responses are JSON-first with `status` fields for preview vs confirm; keep gateway path awareness (`/env-manager/api/...`) as described in [mcp-servers/env-manager/README.md](mcp-servers/env-manager/README.md).

## Architecture
- This repo is the "dev OS"; project code lives in a sibling sandbox and is mounted into containers. See the mental model in [README.md](README.md).
- Core services are defined in [docker-compose.yml](docker-compose.yml): `ollama`, `docs-mcp`, `env-manager`, and `nginx` (reverse proxy to `/env-manager/api/...`).
- The env-manager MCP server runs HTTP/SSE and orchestrates Docker + filesystem changes; request flow overview is in [mcp-servers/env-manager/README.md](mcp-servers/env-manager/README.md).

## Build and Test
- Start services (PowerShell commands): `docker compose up -d` (repo root) per [SETUP.md](SETUP.md).
- Build env-manager (PowerShell commands): `docker compose build env-manager` and `docker compose up -d env-manager` per [mcp-servers/env-manager/README.md](mcp-servers/env-manager/README.md).
- Run env-manager tests (PowerShell commands): `docker exec env-manager npm test` or `npm run test:coverage` in [mcp-servers/env-manager/package.json](mcp-servers/env-manager/package.json).

## Project Conventions
- For destructive actions in REST APIs, support `confirm: true` and return `status: "preview" | "success" | "error"` as specified in [mcp-servers/env-manager/README.md](mcp-servers/env-manager/README.md).
- MCP tools and REST routes share the same capability set; tool list and stdio test flow are documented in [mcp-servers/env-manager/TESTING.md](mcp-servers/env-manager/TESTING.md).
- Follow the phased env-manager roadmap (Phases 0-5) and its principles: preview/confirm, transaction-style rollback, validation, and dual transport (stdio + HTTP/SSE) per [LOCAL_INTERFACE_PLAN.md](LOCAL_INTERFACE_PLAN.md).
- For long-term work, align with the TMP project roadmap around MCP validation and Ollama-as-tool integration per [LOCAL_TMP_PROJECT.md](LOCAL_TMP_PROJECT.md).

## Integration Points
- Nginx gateway provides Swagger UI at `http://localhost/env-manager/api/docs` and OpenAPI at `http://localhost/env-manager/api/swagger.json` per [mcp-servers/env-manager/README.md](mcp-servers/env-manager/README.md).
- Docs MCP uses Ollama for embeddings; startup depends on `.env` values like `OLLAMA_STORAGE_PATH` in [SETUP.md](SETUP.md).

## Security
- The env-manager container mounts the Docker socket and host filesystem; treat any new tools/routes as privileged operations. See the deployment model in [LOCAL_INTERFACE.md](LOCAL_INTERFACE.md).
- Project/agent operations should validate names and avoid path traversal; the intended behaviors are outlined in [LOCAL_INTERFACE.md](LOCAL_INTERFACE.md).
