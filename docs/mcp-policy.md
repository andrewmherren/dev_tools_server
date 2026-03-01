# MCP Servers & Access Policy

This dev environment provides shared MCP (Model Context Protocol) servers for code analysis and documentation. This document describes what's available and how to use it safely.

## Available MCP Servers

### docs-mcp (Documentation Indexing)

**Purpose:** Index and search local documentation and code using embeddings

**Type:** SSE (Server-Sent Events)  
**URL (primary):** `http://docs.localhost/sse` (from host)  
**URL (Windows fallback):** `http://localhost/docs/sse` (if `.localhost` DNS fails)  
**URL (from containers):** `http://docs-mcp:6280/sse`

**Capabilities:**
- Full-text and semantic search across documentation
- Code snippet indexing
- Uses local Ollama for embeddings (no external API calls)

**Risk Level:** Low
- Operates entirely on local data
- No external network calls
- Read-only access

**Configuration:**
```json
{
  "mcpServers": {
    "docs-mcp": {
      "type": "sse",
      "url": "http://docs.localhost/sse"
    }
  }
}
```

**Windows Compatibility Note:**  
If you experience connection issues on Windows ("fetch failed" errors), try the fallback URL:
```json
{
  "mcpServers": {
    "docs-mcp": {
      "type": "sse",
      "url": "http://localhost/docs/sse"
    }
  }
}
```

---

### sonarqube (Code Quality Analysis)

**Purpose:** Analyze code for bugs, vulnerabilities, and code smells

**Type:** Process (stdio)  
**Service URL:** `http://sonarqube.localhost` (from host) or `http://sonarqube:9000` (from containers)

**Capabilities:**
- Vulnerability scanning
- Code quality metrics
- Technical debt analysis
- Support for 25+ languages

**Risk Level:** Low to Medium
- Requires authentication token (store securely)
- Read-only by default for analysis
- Credential should have limited permissions

**Configuration:**
```json
{
  "mcpServers": {
    "sonarqube": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "sonarqube-mcp-server"],
      "env": {
        "SONARQUBE_URL": "http://sonarqube.localhost",
        "SONARQUBE_TOKEN": "sqp_xxxxxxx"
      }
    }
  }
}
```

**Getting a Token:**
1. Access `http://sonarqube.localhost`
2. Login (default: admin/admin)
3. Go to User > My Account > Security
4. Generate a token
5. Store in environment variable: `SONARQUBE_TOKEN=sqp_xxxxx`

---

## Access Policy

### Authentication
- **docs-mcp:** No authentication required
- **sonarqube:** Token-based authentication
  - Keep tokens in `.env.local` or environment variables
  - Never commit tokens to git
  - Rotate tokens periodically

### Data Handling
- All analysis occurs locally on the dev server
- No automatic uploads to external services
- Analysis results stored in local Postgres database
- Embeddings stored on local disk

### Project Integration
- Each project analyzes its own code
- Results isolated by project key in SonarQube
- Documentation indexing includes all indexed sources

---

## Usage Guidelines

### Before Using MCP Servers
1. Confirm dev server is running: `docker compose ps`
2. Verify services are healthy: `docker compose logs -f`
3. For SonarQube: generate and store your token

### In Your Project
1. Copy `example-vscode/mcp.json` to `.vscode/mcp.json`
2. Update `SONARQUBE_TOKEN` environment variable
3. Reload VS Code window to activate MCP servers

### Troubleshooting
- **docs-mcp not connecting?** Check Ollama is running: `docker compose logs ollama`
- **SonarQube can't authenticate?** Verify token is valid and hasn't expired
- **Services unreachable?** Ensure `http://localhost` resolves (check Traefik: `docker compose logs traefik`)
