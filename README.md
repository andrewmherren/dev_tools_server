# Dev Tools Server

Local development services for AI-powered workflows. Provides Ollama, docs-mcp, SonarQube, and nginx in hardened Docker containers.

## Services

- **Ollama** - Local LLM inference with GPU acceleration (`http://localhost/ollama/`)
- **docs-mcp** - Documentation indexing MCP server (`http://localhost/docs-mcp/`)
- **SonarQube** - Code quality and security analysis (`http://localhost/sonarqube/`)
- **nginx** - Unified access point and reverse proxy (`http://localhost`)

## Quick Start

### Prerequisites

- Docker Desktop with GPU support
- 30+ GB disk space for models

### Setup

1. **Configure storage paths:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local to set OLLAMA_STORAGE_PATH and SONARQUBE_STORAGE_PATH
   ```

2. **Start services:**
   ```bash
   docker compose --profile human up -d
   ```

3. **Access services:**
   - Landing page: http://localhost
   - Individual services linked from landing page

### Daily Usage

```bash
# Start
docker compose --profile human up -d

# Stop
docker compose down

# View status
docker compose ps

# View logs (all services)
docker compose logs -f

# View logs (specific service)
docker compose logs -f ollama
docker compose logs -f docs-mcp
docker compose logs -f sonarqube
```

### Using Ollama

```bash
# Pull a model
docker compose exec ollama ollama pull llama3.2:latest

# List models
docker compose exec ollama ollama list

# Test API
curl http://localhost/ollama/api/generate -d '{"model": "llama3.2", "prompt": "Hello"}'
```

### Using Docs MCP

1. Navigate to http://localhost/docs-mcp/
2. Click "Queue New Scrape Job"
3. Enter documentation URL (e.g., `https://docs.python.org/3/`)
4. Wait for indexing to complete
5. Configure MCP in your projects to access indexed docs

### Using SonarQube

1. Navigate to http://localhost/sonarqube/
2. Login with default credentials: `admin` / `admin` (change on first login)
3. Create project token
4. Configure projects to send analysis to `http://localhost/sonarqube/`

## Connecting Projects

### MCP Configuration

Add to your project's `.vscode/settings.json`:

```json
{
  "github.copilot.advanced": {
    "mcp": {
      "servers": {
        "docs": {
          "type": "sse",
          "url": "http://localhost/docs-mcp/sse"
        }
      }
    }
  }
}
```

### Docker Network

If your project uses Docker, connect containers to the shared network:

```yaml
# In your project's docker-compose.yml
networks:
  default:
    external: true
    name: dev-network
```

Then access services by name: `http://ollama:11434`, `http://docs-mcp:6280`, etc.

## Security Features

- All containers run as non-root users
- Capabilities dropped to minimum required
- `no-new-privileges` security option enabled
- Resource limits prevent runaway processes
- Services exposed only to localhost (127.0.0.1)
- Backend services on isolated internal network

## Storage

Configure persistent storage locations in `.env.local`:

- **Ollama models:** `OLLAMA_STORAGE_PATH` (default: `$HOME/.ollama`, 5-50GB)
- **SonarQube data:** `SONARQUBE_STORAGE_PATH` (default: `$HOME/.sonarqube`, 1-10GB)
- **Docs MCP data:** Docker volume `docs-mcp-data` (100MB-5GB)

## Troubleshooting

**Port conflicts:**
```bash
# Check what's using port 80
netstat -ano | findstr ":80"  # Windows
lsof -i :80                    # macOS/Linux
```

**GPU not detected:**
```bash
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

**Complete reset (removes all data):**
```bash
docker compose down -v
```

## Additional Documentation

- [docs/git-safety.md](docs/git-safety.md) - Security guidelines
- [docs/mcp-policy.md](docs/mcp-policy.md) - MCP integration policies
