# Configuring Your Project to Use the Dev Environment

This guide walks you through integrating your project with the shared development infrastructure (Ollama, SonarQube, documentation indexing, etc.).

## Quick Start

### 1. Verify Dev Server is Running

From the dev environment directory:

```powershell
cd d:\sandbox\dev_environment
docker compose ps
```

All services should show `healthy` or `running` status.

### 2. Access the Homepage

Open [http://localhost](http://localhost) in your browser to see all available services.

---

## VSCode Integration (MCP Servers)

### Copy Example Configuration

```powershell
# From your project root
mkdir -p .vscode
Copy-Item d:\sandbox\dev_environment\example-vscode\mcp.json .vscode\mcp.json
```

### Configure SonarQube Token

1. Get your SonarQube token:
   - Open [http://sonarqube.localhost](http://sonarqube.localhost)
   - Login (default: `admin` / `admin`)
   - Menu: User > My Account > Security
   - Click "Generate Token"
   - Copy the token

2. Set the environment variable in your project:

   **PowerShell:**
   ```powershell
   $env:SONARQUBE_TOKEN = "sqp_your_token_here"
   ```

   **Bash/WSL:**
   ```bash
   export SONARQUBE_TOKEN="sqp_your_token_here"
   ```

   **Persistent (add to `.env.local`):**
   ```env
   SONARQUBE_TOKEN=sqp_your_token_here
   ```

3. Add to `.gitignore`:
   ```gitignore
   .env.local
   .vscode/mcp.json
   ```

4. Restart VS Code to activate MCP servers

### Available MCP Servers

Once configured, you'll have access to:

| Server | Purpose | Status |
|--------|---------|--------|
| **docs-mcp** | Search documentation and code using AI embeddings | Always available |
| **sonarqube** | Code quality, vulnerability, and security analysis | Requires token |

---

## Docker Compose Integration

If your project also runs Docker containers and needs to access shared services:

### Add Dev Network to Your `docker-compose.yml`

```yaml
version: '3.8'

services:
  myapp:
    build: .
    environment:
      # Access internal services via container network
      OLLAMA_API_URL: http://ollama:11434
      SONARQUBE_URL: http://sonarqube:9000
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
    networks:
      - default

networks:
  default:
    external: true
    name: dev_environment_dev-network  # Must match the dev environment's dev-network name
```

### Service Endpoints (from containers)

When your container is on the `dev_environment_dev-network`, use these internal addresses:

| Service | Internal URL | Port |
|---------|--------------|------|
| Ollama | `http://ollama:11434` | 11434 |
| SonarQube | `http://sonarqube:9000` | 9000 |
| Postgres | `postgres:5432` | 5432 |
| docs-mcp | `http://docs-mcp:6280` | 6280 |
| Traefik | `http://traefik:80` | 80 |

---

## Using SonarQube for Code Analysis

### Analyze Your Code

```powershell
# Install scanner (one-time)
npm install -g sonarqube-scanner

# Run analysis from your project root
sonar-scanner `
  -Dsonar.projectKey=my-project `
  -Dsonar.sources=. `
  -Dsonar.host.url=http://sonarqube.localhost `
  -Dsonar.login=$env:SONARQUBE_TOKEN
```

### View Results

1. Open [http://sonarqube.localhost](http://sonarqube.localhost)
2. Navigate to your project
3. Review issues, vulnerabilities, and metrics

---

## Using Ollama for Local LLMs

### Available Models

By default, the `nomic-embed-text` embedding model is available. Additional models can be pulled:

```powershell
# Add the model to your compose file volumes
docker exec ollama-server ollama pull llama2
```

### From Your Application

```python
import requests
import json

# Connect to Ollama from your app
response = requests.post(
    'http://ollama.localhost:11434/api/generate',
    json={
        'model': 'llama2',
        'prompt': 'Hello!',
        'stream': False
    }
)
print(response.json()['response'])
```

### From Your Container

```python
# Use internal network address
response = requests.post(
    'http://ollama:11434/api/generate',
    json={'model': 'llama2', 'prompt': 'Hello!', 'stream': False}
)
```

---

## Exposing Your Project's Services

If you want to expose your dev server on Traefik (e.g., `http://my-project.localhost`):

1. Edit `d:\sandbox\dev_environment\traefik\dynamic\dev-projects.yml`:

```yaml
http:
  routers:
    my-project:
      entryPoints:
        - web
      rule: Host(`my-project.localhost`)
      service: my-project-service

  services:
    my-project-service:
      loadBalancer:
        servers:
          - url: http://host.docker.internal:3000  # Your app's port on host
```

2. Reload Traefik:

```powershell
cd d:\sandbox\dev_environment
docker compose restart traefik
```

3. Access your app at [http://my-project.localhost](http://my-project.localhost)

---

## Troubleshooting

### Services Not Reachable from `localhost`

**Issue:** `http://sonarqube.localhost` returns "Cannot GET"

**Solution:**
1. Verify Traefik is running: `docker compose ps traefik`
2. Check Traefik logs: `docker compose logs traefik`
3. Verify route config: `traefik/dynamic/dev-projects.yml`
4. Restart Traefik: `docker compose restart traefik`

### MCP Servers Not Connecting in VS Code

**Issue:** "Unable to connect to sonarqube" or "docs-mcp not responding"

**Solution:**
1. Verify dev server is running: `docker compose ps`
2. Check container logs: `docker compose logs sonarqube` or `docker compose logs docs-mcp`
3. Verify SONARQUBE_TOKEN is set: Check your environment variable
4. Reload VS Code window (Cmd+P → Developer: Reload Window)

### Ollama Model Not Available

**Issue:** "Model not found" errors when querying Ollama

**Solution:**
```powershell
# List available models
docker exec ollama-server ollama list

# Pull a new model
docker exec ollama-server ollama pull mistral
```

### Docker Container Can't Reach Dev Services

**Issue:** `Connection refused` when container tries `http://ollama:11434`

**Solution:**
1. Verify container is on correct network: `docker network inspect dev_environment_dev-network`
2. Update `docker-compose.yml` to use external network (see Docker Compose Integration section)
3. Restart your containers after network changes

---

## Security Considerations

- **Never commit tokens to git**: Use `.env.local` or environment variables
- **Keep credentials secret**: Don't share your SonarQube token
- **Rotate tokens periodically**: Generate new tokens for long-running services
- **Review shared access**: If team members share this dev server, document who has access
- **Isolate sensitive code**: Don't analyze proprietary/confidential code in shared analysis tools

---

## Next Steps

1. **Set up VSCode integration** (follow VSCode Integration section above)
2. **Generate SonarQube token** and configure it
3. **Run your first analysis**: Use sonarqube-mcp or sonar-scanner
4. **Explore documentation search**: Try docs-mcp in Copilot
5. **Add Traefik route** if you want to expose your app
