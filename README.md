# Dev Environment Infrastructure

A Docker-based shared infrastructure server providing AI-driven development tools, code quality analysis, CI/CD, and security scanning for local development projects.

## Quick Start

```powershell
# Clone or navigate to the repository
cd d:\sandbox\dev_environment

# Copy environment configuration
Copy-Item .env.example .env

# Edit .env with your storage paths and settings
# Example:
#   OLLAMA_STORAGE_PATH=D:/dev_env/ollama
#   SONARQUBE_STORAGE_PATH=D:/dev_env/sonarqube

# Start all services
docker compose up -d

# Access the homepage
# Open http://localhost in your browser
```

## Services Included

- **Ollama** — GPU-accelerated local LLM inference
- **SonarQube** — Code quality and security analysis
- **docs-mcp** — AI-powered documentation indexing
- **Traefik** — Reverse proxy and load balancer
- **Drone CI** — Container-native CI/CD pipelines
- **Trivy** — Vulnerability scanner
- **Postgres** — Database backend with pgvector

## Documentation

- **[Full Infrastructure Guide](homepage/README.md)** — Complete architecture, setup, and service details
- **[Project Integration Guide](homepage/PROJECT_SETUP.md)** — How to configure your projects to use this dev environment
- **[Safe Integration Patterns](docs/git-safety.md)** — Best practices for consuming shared services
- **[MCP Servers & Policy](docs/mcp-policy.md)** — Available servers and access control

## Requirements

- Docker Desktop with Docker Compose V2
- NVIDIA GPU with Docker runtime (for Ollama)
- ~14GB free RAM
- 20GB+ free disk space

## System Requirements

- **Total Memory**: ~14.2GB
- **Total Disk**: Variable (2-10GB per LLM model)

See [Full Guide](homepage/README.md) for detailed resource breakdown.

## License

Provided as-is for local development use.
