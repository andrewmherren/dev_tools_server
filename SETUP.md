# Setup

This gets the environment ready for your first project.

## Prereqs

- Docker Desktop
- Git
- VS Code (optional)

## Steps

1. Clone the environment

```bash
git clone git@github.com:you/dev_environment.git
cd dev_environment
```

2. Create your local config

```bash
cp .env.example .env
```

Edit [.env](.env) and set:

- `OLLAMA_STORAGE_PATH` (large models, use a spacious drive)
- Optional overrides:
  - `PROJECT_ROOT_PATH`
  - `AGENT_1_PATH`

Note: Containers now auto-create `.vscode/mcp.json` on first boot.

3. Create the model storage directory

```bash
mkdir D:\ollama-models     # Windows
mkdir /Volumes/ollama-models  # macOS
mkdir /mnt/ollama-models   # Linux
```

4. Start the environment

```bash
docker compose up -d
```

5. Quick verify

```bash
docker compose ps
```

You should see `ollama-server` and `ai-dev-human` running.

## Shutdown

To stop the environment:

```bash
docker compose down
```

Models and data are persisted, so stopping and restarting doesn't lose anything.

## SonarQube Setup (Optional)

The environment includes a local SonarQube server for code quality analysis. This is useful for getting immediate AI feedback on code quality without hitting SonarCloud limits.

### First-Time Setup

1. Wait for SonarQube to start (takes ~2 minutes on first launch):

```powershell
docker logs -f sonarqube-server
# Wait for "SonarQube is operational" message
```

2. Access SonarQube at `http://localhost:9000` or `http://localhost/sonarqube/`

3. Log in with default credentials:
   - Username: `admin`
   - Password: `admin`
   - **You'll be prompted to change the password immediately**

4. Generate an authentication token:
   - Click on **User Avatar** (top right) → **My Account** → **Security** tab
   - Under "Generate Tokens", enter a name (e.g., "MCP Server")
   - Select expiration (e.g., 90 days) and click **Generate**
   - **Copy the token** (you won't see it again)

5. Add the token to your `.env` file:

```bash
SONARQUBE_TOKEN=your-generated-token-here
```

6. The SonarQube MCP server in VS Code will now use your local instance at `http://localhost:9000`

### Using SonarQube with AI Tools

Once configured, your AI assistant can:
- Analyze code quality in real-time
- Get immediate feedback on security issues
- Check code smells and technical debt
- View test coverage reports

The MCP server connects automatically when you use SonarQube-related commands in Copilot.

## What's Next

You're set up! Now:

→ [FIRST_PROJECT.md](FIRST_PROJECT.md) - Create your first project and add an agent workspace

<details>
<summary>Notes</summary>

- Settings live in [.env](.env) and are not committed.
- If you change [.env](.env), restart services:

```bash
docker compose up -d
```

- If you change [.devcontainer/Dockerfile](.devcontainer/Dockerfile), rebuild:

```bash
docker compose up -d --build
```
</details>
