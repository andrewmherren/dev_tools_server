# QUICKSTART

This guide gets you running quickly and covers daily usage.

## 1) Prerequisites
- Docker Desktop (or Docker Engine + Compose v2)
- Git
- VS Code

Optional but useful:
- NVIDIA GPU + toolkit for local model acceleration (if used by your profile)

## 2) Clone and enter repo
### Windows (PowerShell)
```powershell
git clone <your-repo-url> dev_environment
Set-Location dev_environment
```

### macOS/Linux (bash/zsh)
```bash
git clone <your-repo-url> dev_environment
cd dev_environment
```

## 3) Configure environment values
- Copy example env file if present and fill local paths/tokens.
- Keep local secrets out of git-tracked files.

Typical pattern:
- `.env.example` -> committed template
- `.env.local` -> local machine values (not committed)

## 4) Start the stack
### Windows (PowerShell)
```powershell
docker compose up -d --build
```

### macOS/Linux (bash/zsh)
```bash
docker compose up -d --build
```

## 5) Verify health
### Any OS
```bash
docker compose ps
docker compose logs --tail=100 nginx docs-mcp sonarqube
```

If using PowerShell, the same commands work.

## 6) Configuration structure (Phase 1)
All orchestration + agent + QA configuration is in YAML files (no code editing required):

```
config/
├── workflows/
│   ├── lifecycle.yaml           # Master orchestration sequence
│   └── roles/
│       ├── planner.yaml
│       ├── architect.yaml
│       ├── developer.yaml
│       ├── qa.yaml
│       └── bugfix.yaml
├── agents/
│   └── definitions.yaml         # Agent registry
├── qa/
│   ├── suites.yaml              # fast, full suite definitions
│   └── gates.yaml               # Pass/fail criteria
└── docker/
    └── profiles.yaml            # Compose profiles (agent-dev, agent-qa)

docs/
└── features/
    ├── feature-id.yaml          # Feature brief (description can link to .md)
    └── feature-id.md            # Optional extended description
```

## 7) Command surface (used every day)
Cross-platform wrappers handle all operations:

- Windows: `./scripts/*.ps1`
- macOS/Linux: `./scripts/*.sh`

Core commands:
- `dev up|down|status|logs` -> start/stop/check core stack.
- `flow run --feature <id> --max-fix-loops 3` -> orchestrate full lifecycle.
- `agent run --name <agent> --feature <id> --background` -> run one agent in container.
- `qa run --feature <id> --suite fast|full` -> run QA gates.

## 8) Daily workflow (Phase 1 completed-state)
1. Start core environment.
   - Windows: `./scripts/dev.ps1 up`
   - macOS/Linux: `./scripts/dev.sh up`
2. Create a feature brief in `docs/features/<feature-id>.yaml`.
   - Optionally add extended description in `docs/features/<feature-id>.md`.
3. Run orchestration for the feature.
   - Windows: `./scripts/flow.ps1 run --feature <feature-id> --max-fix-loops 3`
   - macOS/Linux: `./scripts/flow.sh run --feature <feature-id> --max-fix-loops 3`
4. Monitor progress/logs.
   - Windows: `./scripts/dev.ps1 logs --service agent-<feature-id>`
   - macOS/Linux: `./scripts/dev.sh logs --service agent-<feature-id>`
5. Review final worktree/PR and approve or request changes.
6. Shut down when done.
   - Windows: `./scripts/dev.ps1 down`
   - macOS/Linux: `./scripts/dev.sh down`

## 9) Define a new agent
Agents are registered in `config/agents/definitions.yaml` and use role instructions from `config/workflows/roles/`.

1. Add or update role instructions in:
   - `config/workflows/roles/<role-name>.yaml`
2. Register agent in:
   - `config/agents/definitions.yaml`
   - Example: add entry with name, role, container_profile (agent-dev|agent-qa), mcp_tools list
3. Use the agent immediately:
   - Windows: `./scripts/agent.ps1 run --name <agent-name> --feature <feature-id>`
   - macOS/Linux: `./scripts/agent.sh run --name <agent-name> --feature <feature-id>`

Result: no code changes needed; config-driven agent definition.

## 10) Run agents in the background
Background execution is first-class and default for non-interactive stages.

- Windows:
  - `./scripts/agent.ps1 run --name developer --feature <feature-id> --background`
- macOS/Linux:
  - `./scripts/agent.sh run --name developer --feature <feature-id> --background`

Monitor status/logs:
- `./scripts/agent.<ps1|sh> status --feature <feature-id>`
- `./scripts/agent.<ps1|sh> logs --feature <feature-id>`

## 11) Force an agent to run in a specific container profile
Agents always execute in containers. Container profile selection is explicit via `config/agents/definitions.yaml`:

```yaml
agents:
  developer:
    role: developer
    container_profile: agent-dev    # or agent-qa for QA tasks
    mcp_tools: [docs-mcp, github-mcp]
```

Run the agent:
- Windows: `./scripts/agent.ps1 run --name developer --feature <feature-id> --background`
- macOS/Linux: `./scripts/agent.sh run --name developer --feature <feature-id> --background`

## 12) Run QA workflows
QA suites are defined in `config/qa/suites.yaml` and runnable standalone or inside orchestration.

- Full gate:
  - Windows: `./scripts/qa.ps1 run --feature <feature-id> --suite full`
  - macOS/Linux: `./scripts/qa.sh run --feature <feature-id> --suite full`
- Fast gate (pre-check):
  - `./scripts/qa.<ps1|sh> run --feature <feature-id> --suite fast`

Suites defined in config:
- lint
- static analysis
- unit/integration tests
- e2e/browser verification (where applicable)

## 13) Orchestrate end-to-end multi-agent delivery
Use one command to execute the full lifecycle defined in `config/workflows/lifecycle.yaml`.
Loop automatically until QA passes or max-fix-loops is reached.

Lifecycle (from `config/workflows/lifecycle.yaml`):
1. planner -> creates implementation plan from feature brief
2. architect -> produces technical design/tasks
3. developer -> implements in isolated worktree
4. qa -> validates with QA suite
5. bugfix -> addresses QA failures (conditional, repeats if qa fails)
6. qa re-run -> repeats full qa suite
7. human review gate -> final approval (manual)

Command:
- Windows: `./scripts/flow.ps1 run --feature <feature-id> --max-fix-loops 3`
- macOS/Linux: `./scripts/flow.sh run --feature <feature-id> --max-fix-loops 3`

Result: PR/worktree is handed off to human for review.

## 14) Useful commands
### Rebuild specific service
```bash
docker compose up -d --build <service-name>
```

### Stream logs
```bash
docker compose logs -f <service-name>
```

### Full reset (destructive)
```bash
docker compose down -v
```

## 15) Troubleshooting
- Port conflicts: check what is using `80`, `443`, or `9000`.
- Docker resources: increase CPU/RAM in Docker Desktop if services fail to stabilize.
- Environment values: verify path and token variables are set correctly.
- Service startup order: inspect `docker compose logs` for dependency failures.

## 16) Cross-platform notes
- Use forward-slash paths in compose/env where possible.
- Keep host-specific paths in env vars, not hardcoded in compose.
- Keep both script wrappers functionally equivalent (`*.ps1` and `*.sh`).
