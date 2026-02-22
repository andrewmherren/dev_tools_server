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
