# Dev Environment (AI-Ready Development OS)

This repository provides a **reproducible, AI-ready development OS** for your real projects. It standardizes tooling, MCP, and local LLM access while keeping your code in separate project repos.

## Why Use It

- Identical environment across humans and agents
- Clean separation between tools and project code
- Easy to scale: one project, many isolated agent worktrees
- Works on Windows, macOS, and Linux

## Mental Model

- dev_environment = the OS (tools, containers, MCP)
- your project repo lives in a sandbox folder and is mounted into containers

```
Host Machine
├── dev_environment/
└── sandbox/
    └── my_project/

Container
└── /workspace → sandbox/my_project
```

## Start Here

- Setup the environment: [SETUP.md](SETUP.md)
- Create your first project: [FIRST_PROJECT.md](FIRST_PROJECT.md)
- Advanced scenarios: [ADVANCED.md](ADVANCED.md)

## MCP Setup (Repo-Local)

This repo keeps MCP config in git-safe templates and copies them into `.vscode/` per workspace.

- Example config: [example-vscode/mcp.json](example-vscode/mcp.json)
- Local config (ignored): `.vscode/mcp.json`
- Containers auto-create `.vscode/mcp.json` from the template on startup

If you create additional agent worktrees, the container init script will create `.vscode/mcp.json` automatically on first boot.

## Default MCP Servers

This environment comes pre-configured with several MCP servers to enhance your AI coding experience:

### Lightweight MCPs (Run locally in each container)

- **Package Registry MCP** — Search and retrieve metadata for npm, PyPI, NuGet, and Cargo packages. Useful for dependency discovery and version info.
- **Augments** — Remote HTTP MCP providing code completion, analysis, and suggestion capabilities.
- **GitHub MCP** — Full GitHub API access via Copilot (remote). Manage issues, PRs, discussions, and repositories directly from chat.
- **Filesystem MCP** — Local filesystem access scoped to `/workspace`. Browse, read, and analyze files in your project.
- **GitMCP** — Remote MCP for fetching up-to-date documentation and code from any public GitHub repository. Prevents hallucinations by grounding responses in current docs.

### Shared Services (Run once, accessed by all containers)

- **Docs MCP Server** — Indexes third-party library documentation from npm, PyPI, GitHub, and local files. Provides version-aware search to ground AI responses in official docs. Accessible via web UI at `http://localhost/docs-mcp` for managing indexed libraries.
- **SonarQube MCP** — Code quality and security analysis. Requires `SONARQUBE_TOKEN` in your `.env` file. Configure the instance URL in `example-vscode/mcp.json` if not using default `localhost:9000`.
- **Parallel Search MCP** — General web search capabilities integrated into your AI assistant.
- **Nginx Reverse Proxy** — Unified web interface at `http://localhost` with links to all tool UIs. Eliminates port number memorization.

### Managing MCP Libraries

To index new documentation in Docs MCP Server:
1. Ensure the embedding model is available: `ollama pull nomic-embed-text`
2. Start the environment: `docker compose up -d`
3. Open `http://localhost/docs-mcp` in your browser (or `http://localhost` for all tools)
4. Click "Queue New Scrape Job" and provide the documentation URL
5. Once indexed, your AI assistant can search and reference that library's docs

### Enabling HTTPS (Optional)

To enable HTTPS on the nginx proxy with a self-signed certificate:

```powershell
# Generate self-signed certificate (valid for 365 days)
docker compose exec nginx sh -c "mkdir -p /etc/nginx/ssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/nginx-selfsigned.key -out /etc/nginx/ssl/nginx-selfsigned.crt -subj '/CN=localhost'"

# Uncomment the HTTPS server block in nginx/nginx.conf

# Restart nginx
docker compose restart nginx
```

Access tools at `https://localhost/docs-mcp` (browser will warn about self-signed cert).

For production: Replace self-signed cert with proper certificates from Let's Encrypt or your CA.

> The environment never owns your code.
> It only provides a place for your code to run.
