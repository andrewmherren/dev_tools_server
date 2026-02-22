# Advanced Usage

Short notes for edge cases and custom setups.

## Project-Specific Dependencies

If a project needs extra system packages (PHP, Java, CUDA):

- Option A: extend the base image in [.devcontainer/Dockerfile](.devcontainer/Dockerfile)
- Option B: add a project-specific override file (recommended if only one project needs it)

<details>
<summary>Project-specific override idea</summary>

Create a local override file and keep it out of git:

- Add to [.gitignore](.gitignore): [docker-compose.override.yml](docker-compose.override.yml)
- Add project-only services or packages there

This keeps the base repo clean while letting a single project add tooling.
</details>

## Agent-Specific Tooling

Default: all agents share the same tools. This is simplest and usually fine.

If some agents need special tools or limits:

- Duplicate the `agent-1` service in [docker-compose.yml](docker-compose.yml)
- Use different images or env vars per agent
- Use `profiles` to enable only when needed

<details>
<summary>Cost control idea</summary>

If a tool has usage costs, only enable it in the specific agent service that needs it.
</details>

## Host Ollama vs Docker Ollama

- Docker Ollama = reproducible, isolated, consistent across agents
- Host Ollama = faster startup, shared models with host tools

If you want host Ollama:

- Stop the `ollama` service in [docker-compose.yml](docker-compose.yml)
- Point `OLLAMA_BASE_URL` to `http://host.docker.internal:11434`

## Future: Dockerized MCP Servers

If a local MCP server requires a daemon or long-running process, run it in Docker and connect via HTTP.

Suggested pattern:

1. Add a service in [docker-compose.yml](docker-compose.yml)
2. Expose it on an internal port
3. Add an HTTP MCP entry in `.vscode/mcp.json`

Example (placeholder):

```yaml
# docker-compose.yml
services:
	example-mcp:
		image: your-org/example-mcp:latest
		ports:
			- "4005:4005"
```

```json
// .vscode/mcp.json
{
	"servers": {
		"example-mcp": {
			"transport": "http",
			"url": "http://localhost:4005/mcp"
		}
	}
}
```

## WSL Note (Windows)

If you run Docker from WSL, keep your project on the Windows drive only if you accept slower file access. For best performance, keep projects on the same filesystem as Docker.
