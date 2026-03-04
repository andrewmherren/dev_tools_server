# Dev Environment Infrastructure

Shared infrastructure server providing AI-driven development tools, code quality analysis, CI/CD, and security scanning for local development projects.

## Architecture

This stack provides foundational services that individual coding projects can leverage without needing to manage their own infrastructure. Services run in isolated Docker containers with security hardening and resource limits.

### Service Stack

| Service | Purpose | Access URL | Network |
|---------|---------|------------|---------|
| **Homepage** | Landing page with links to all services | `http://localhost` | internal |
| **Ollama** | Local LLM inference with GPU acceleration | `http://ollama.localhost` | internal |
| **docs-mcp** | Documentation indexing MCP server | `http://docs.localhost` | internal |
| **SonarQube** | Code quality and security analysis | `http://sonarqube.localhost` | internal |
| **Trivy** | Container and IaC vulnerability scanner | `http://trivy.localhost` | dev + internal |
| **Drone** | Container-native CI/CD platform | `http://drone.localhost` | internal |
| **Postgres** | Database backend (with pgvector) | Internal only | internal |
| **Traefik** | Reverse proxy and load balancer | `http://traefik.localhost` | dev + internal |

### Network Architecture

- **internal-network**: Isolated network for core services (no external internet access)
- **dev-network**: Bridge network for services that need host/project communication
- **Traefik**: Acts as gateway between networks, providing `*.localhost` subdomain routing

## Quick Start

### Prerequisites

- Docker Desktop with Compose V2
- NVIDIA GPU with Docker runtime configured (for Ollama)
- Minimum 14GB free RAM
- 20GB+ free disk space

### Setup

1. **Create environment configuration**:
   ```powershell
   Copy-Item .env.example .env
   ```

2. **Edit `.env` and configure**:
   ```env
   # Storage paths (create these directories first)
   OLLAMA_STORAGE_PATH=D:/dev_env/ollama
   SONARQUBE_STORAGE_PATH=D:/dev_env/sonarqube
   
   # Drone CI configuration
   DRONE_RPC_SECRET=$(openssl rand -hex 16)
   DRONE_GITEA_SERVER=http://your-gitea-server
   DRONE_GITEA_CLIENT_ID=your-client-id
   DRONE_GITEA_CLIENT_SECRET=your-client-secret
   ```

3. **Create storage directories**:
   ```powershell
   New-Item -Path "D:/dev_env/ollama" -ItemType Directory -Force
   New-Item -Path "D:/dev_env/sonarqube" -ItemType Directory -Force
   ```

4. **Start services**:
   ```powershell
   docker compose up -d
   ```

5. **Verify services are running**:
   ```powershell
   docker compose ps
   ```

6. **Access the homepage**:
   Open `http://localhost` in your browser to see links to all running services.

### First-Time Configuration

#### Initial Setup
When services first start, Ollama automatically downloads the `nomic-embed-text` embedding model (~260MB) needed for documentation indexing. This may take a few minutes on first run.

Check download progress: `docker logs ollama-server`

Once complete, all services will be ready to use.

#### SonarQube Setup
1. Access `http://sonarqube.localhost`
2. Default credentials: `admin` / `admin`
3. Change password when prompted
4. Generate user token: User > My Account > Security > Generate Token
5. Add token to `.vscode/mcp.json` for MCP integration

#### Drone CI Setup
1. Access `http://drone.localhost`
2. Authorize with your Git provider (Gitea/GitHub)
3. Activate repositories you want to build
4. Add `.drone.yml` to your projects to define pipelines

#### Trivy Setup
Trivy runs as a server and is ready to use immediately:
```powershell
# Scan a Docker image
docker exec trivy trivy image sonarqube:10-community

# Scan local filesystem
docker exec trivy trivy fs /path/to/code
```

## Service Details

### Homepage

#### Dev Environment Dashboard
- **Landing page** with quick access to all services
- Lightweight nginx server serving static HTML
- Displays service cards with descriptions and direct links
- Accessible at `http://localhost`
- Resource limit: 32MB RAM

### AI Layer

#### Ollama
- **GPU-accelerated LLM inference** for embeddings and completions
- Models stored at `${OLLAMA_STORAGE_PATH}`
- Required embedding model (nomic-embed-text) **automatically downloaded on first start** (~260MB)
- Additional models can be pulled: `docker exec ollama-server ollama pull <model-name>`
- Resource limit: 8GB RAM, 1 NVIDIA GPU

#### docs-mcp
- **Documentation indexing** using `@arabold/docs-mcp-server`
- Exposes SSE endpoint for VSCode Copilot integration
- Uses Ollama for embedding generation
- Web UI at `http://docs.localhost:6281`
- Resource limit: 512MB RAM

### Code Quality & Security

#### SonarQube
- **Static code analysis** for bugs, vulnerabilities, code smells
- Supports 25+ programming languages
- Postgres backend with pgvector for data storage
- Exposed via `sonarqube-mcp` to Copilot agents
- Resource limit: 2GB RAM

#### Trivy
- **Vulnerability scanning** for containers, IaC, and source code
- Scans Docker images, Kubernetes manifests, Terraform configs
- API server at `http://trivy.localhost`
- Vulnerability database cached in `trivy-cache` volume
- Resource limit: 512MB RAM

### CI/CD

#### Drone CI
- **Container-native CI/CD** pipelines
- Runs builds in isolated Docker containers
- Integrates with Gitea, GitHub, GitLab
- **drone-server**: Pipeline orchestration (512MB RAM limit)
- **drone-agent**: Executes builds (1GB RAM limit, 2 concurrent jobs)
- Define pipelines in `.drone.yml` in your project repos

### Data Layer

#### Postgres
- **PostgreSQL 15** with pgvector extension
- Primary backend for SonarQube
- Can store embeddings for code indexing projects
- Resource limit: 512MB RAM

### Gateway

#### Traefik
- **HTTP reverse proxy** with subdomain routing
- File-based configuration (Docker provider disabled)
- Dashboard at `http://traefik.localhost`
- Add project routes in `traefik/dynamic/dev-projects.yml`
- Resource limit: 128MB RAM

## Security

All services follow hardened security patterns:
- Non-root execution (user 1000:1000, except Traefik as root for port 80)
- Capability dropping: `cap_drop: ALL` on every service
- `no-new-privileges` security option
- Network isolation (internal services on `internal-network`)
- Read-only mounts where applicable
- Resource limits to prevent resource exhaustion

## Integration

For comprehensive instructions on configuring your projects to use this dev server, see **[PROJECT_SETUP.md](docs/PROJECT_SETUP.md)**.

This guide covers:
- Configuring VSCode MCP servers (docs-mcp, sonarqube)
- Docker Compose integration
- Running code analysis
- Using local LLMs
- Routing project services via Traefik
- Troubleshooting

## Maintenance

### View logs
```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f ollama
```

### Restart services
```powershell
# All services
docker compose restart

# Specific service
docker compose restart drone-server
```

### Update images
```powershell
docker compose pull
docker compose up -d
```

### Cleanup
```powershell
# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

## Troubleshooting

### Services won't start
```powershell
# Check Docker Desktop is running
docker version

# Check for port conflicts (port 80)
netstat -ano | findstr :80

# View detailed service status
docker compose ps -a
```

### GPU not available for Ollama
```powershell
# Verify NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Traefik routes not working
1. Verify service is running: `docker compose ps`
2. Check Traefik logs: `docker compose logs traefik`
3. Verify route configuration: `traefik/dynamic/dev-projects.yml`
4. Restart Traefik: `docker compose restart traefik`

### Drone builds failing
1. Check agent logs: `docker compose logs drone-agent`
2. Verify Docker socket is accessible
3. Check RPC secret matches between server and agent
4. Ensure agent has capacity: check `DRONE_RUNNER_CAPACITY`

## Future Enhancements

Potential additions for expanded functionality:
- Redis cache layer for embedding deduplication
- Per-project code indexers (CocoIndex, BifrostMCP)
- Additional MCP servers (filesystem, package-registry)
- TLS/HTTPS support with mkcert
- Agent orchestration layer for multi-step workflows
