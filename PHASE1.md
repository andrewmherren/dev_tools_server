# PHASE 1: Balanced Script-Driven Agentic Environment

## Project
Balanced, reproducible, VS Code/Copilot-centric AI development environment with containerized services, secure agent execution, and worktree-based handoff workflows.

## Scope (Middle Ground Option)
- Prioritize host safety and practical exfiltration resistance without requiring heavy host reconfiguration.
- Keep local developer experience smooth for Windows, macOS, and Linux.
- Disable autonomous agent remote git pushes by default.
- Support both usage models:
  - central "server-like" environment per machine
  - project boilerplate clone per repo

## Phase 1 Deliverable: Unified Config-Driven Architecture

Phase 1 completes with a script-driven orchestration system backed by unified YAML configuration. Users interact via cross-platform command wrappers (`dev.ps1|sh`, `agent.ps1|sh`, `qa.ps1|sh`, `flow.ps1|sh`) that read machine+workflow state from:

```
config/
├── workflows/
│   ├── lifecycle.yaml           # Global multi-agent handoff sequence
│   └── roles/
│       ├── planner.yaml
│       ├── architect.yaml
│       ├── developer.yaml
│       ├── qa.yaml
│       └── bugfix.yaml
├── agents/
│   └── definitions.yaml         # Agent registry (name, role, profile, mcp access)
├── qa/
│   ├── suites.yaml              # fast, full suite definitions
│   └── gates.yaml               # Pass/fail + coverage requirements
├── docker/
│   └── profiles.yaml            # Compose profile definitions
└── mcp/
    └── allowlist.yaml           # MCP tool whitelist

docs/
└── features/
    ├── <feature-id>.yaml        # Feature brief with description (can link to .md)
    └── <feature-id>.md          # Optional extended description per feature
```

No human-facing scripts or agent invocation requires editing code; all orchestration is config-driven.

## Concrete Workflow Contract (Phase 1 Implementation)
The project will implement and support this exact daily UX:

- Agent definition:
  - Role definitions in `config/workflows/roles/<agent>.yaml`
  - Agent registry in `config/agents/definitions.yaml`
  - Registration command: `agent define --name <name> --role <role>`
- Background execution:
  - `agent run --background` supported for all non-interactive stages.
- Container targeting:
  - Agent jobs always run in containerized execution.
  - Profile targeting via `--profile agent-dev|agent-qa`.
- QA execution:
  - `qa run --suite fast|full` with standardized gates (lint, static analysis, tests, e2e where applicable).
- Multi-agent orchestration:
  - `flow run --feature <id> --max-fix-loops <n>` lifecycle:
    reads `config/workflows/lifecycle.yaml` + `docs/features/<id>.yaml` + per-stage agent config.
    Linear or conditional stages: planner → architect → developer → qa → bugfix (conditional loop) → qa re-run → human review gate.

Cross-platform command wrappers are mandatory:
- Windows: `./scripts/*.ps1`
- macOS/Linux: `./scripts/*.sh`
- Functional parity is required between wrappers.

## Delivery Phases (Phase 1 Internal Milestones)

### Phase 1A — Security Baseline + Secret Hygiene
Goals:
- Remove plaintext/hardcoded secrets from tracked files.
- Standardize local secret injection.
- Correct obvious configuration defects.

Work:
- Replace tracked secret values with environment placeholders.
- Add/normalize `.env.example` and local-only `.env.local` usage.
- Fix malformed SonarQube URL in MCP template config.

Exit criteria:
- No hardcoded tokens in repo configs.
- Fresh setup works with local env injection.

### Phase 1B — Compose Hardening (Balanced)
Goals:
- Improve container isolation with minimal usability loss.

Work:
- Add non-root runtime where feasible.
- Add `cap_drop`, `security_opt: no-new-privileges`, resource limits.
- Add mount hygiene (read-only where possible, scoped RW where required).
- Add profile structure for `human`, `agent-dev`, `agent-qa`.

Exit criteria:
- Stack runs with hardened defaults.
- Existing core services still function (`docs-mcp`, `ollama`, `nginx`, `sonarqube`).

### Phase 1C — Network Segmentation + Exposure Controls
Goals:
- Reduce unnecessary service exposure and lateral movement.

Work:
- Segment Compose networks by trust zone.
- Bind externally exposed ports to localhost where practical.
- Keep ingress centralized through `nginx` where possible.

Exit criteria:
- Reachability matches intended access model.
- Internal-only services not directly exposed to host network.

### Phase 1D — Unified Config Structure + Worktree Agent Workflow
Goals:
- Establish unified config structure (YAML-based, feature-agnostic).
- Enable isolated background agents per worktree.

Work:
- Create config/ structure (`workflows/lifecycle.yaml`, `workflows/roles/*.yaml`, `agents/definitions.yaml`, `qa/suites.yaml`, `docker/profiles.yaml`, `mcp/allowlist.yaml`).
- Create docs/features/ structure for project work (features live outside setup config).
- Add scripts to provision/teardown one agent container per worktree.
- Deterministic naming, logs, cleanup, and conflict-safe behavior.
- Preserve good UX for human + agent concurrent usage.
- Implement `agent define`, `agent run` command surfaces with background support.
- Implement agent profile resolution from `config/agents/definitions.yaml`.
- Implement lifecycle orchestration reading `config/workflows/lifecycle.yaml` + feature YAML.

Exit criteria:
- Multiple worktrees can run agents independently.
- Agent containers are isolated from each other as designed.
- Users can define new features in `docs/features/`.
- All config is in `config/` (no code editing required for orchestration changes).

### Phase 1E — Git Safety Guardrails
Goals:
- Prevent autonomous unapproved remote writes by default.

Work:
- Ensure agent containers have no SSH key mounts.
- Avoid persisted credentials in agent runtime.
- Add policy docs and optional local guard hooks.

Exit criteria:
- Agent remote push is blocked by default.
- Path remains available for future selective enablement in low-risk repos.

### Phase 1F — MCP Governance + Tooling Policy
Goals:
- Keep MCP usage powerful but controlled.

Work:
- Define trusted MCP allowlist in `config/mcp/allowlist.yaml`.
- Document hosted vs local MCP risk tiering.
- Add approval expectations for side-effecting tools.

Exit criteria:
- MCP configuration is reproducible and policy-driven.
- Unsafe defaults are removed.

### Phase 1G — Agentic Handoff Workflow
Goals:
- Support structured handoffs: Human Planner -> Architect -> Developer -> QA.

Work:
- Define required artifacts and acceptance checks per role in `config/workflows/roles/*.yaml`.
- Implement `flow run` orchestration command for full feature lifecycle.
- Implement configurable QA-fix loop (`max-fix-loops`) with deterministic stop conditions.
- Add `qa run --suite fast|full` as a standalone and orchestration-integrated gate.

Exit criteria:
- Handoff flow is documented and repeatable.
- QA path includes lint/static analysis/tests/log inspection.

### Phase 1H — Reproducibility + Cross-Platform Validation
Goals:
- Ensure stable behavior on Windows/macOS/Linux.

Work:
- Pin image/tool versions where practical.
- Replace path assumptions with configurable env vars.
- Validate startup and core flows on all three OS families.
- Test command wrappers (`*.ps1` and `*.sh`) for functional parity.

Exit criteria:
- New machine bootstrap succeeds from docs alone.
- Core commands are consistent across operating systems.

## Acceptance Criteria (Phase 1)
- Reproducible setup from clean clone.
- Sandboxed agent workflows can install deps, run tests, inspect logs, and host test apps without harming host.
- No default agent pathway can push remote code unapproved.
- Static analysis/testing flow works in containerized workflows.
- VS Code/Copilot-centric usage is first-class.
- A user can define a new agent role without editing orchestration code.
- A user can run any agent in background and inspect status/logs.
- A user can explicitly target `agent-dev` vs `agent-qa` container profiles.
- A user can run `qa` standalone and from orchestration.
- A user can execute one-command feature lifecycle and receive a human review handoff artifact.
- Features are managed in `docs/features/` with optional markdown descriptions.
- Feature YAML can reference external `.md` file for description.

## Risks and Mitigations
- Security vs productivity tradeoff: keep balanced defaults and reserve stricter controls for advanced mode.
- Cross-platform path/volume differences: centralize paths in env vars and provide OS-specific command examples.
- MCP trust drift: maintain explicit allowlist and review process.

## Deferred Advanced Hardening (to become `ADVANCED.md` later)
Planned advanced topics:
- Docker Desktop Enhanced Container Isolation (where available) and tradeoffs.
- Rootless/container-user namespace remapping options.
- Egress allowlisting / outbound filtering patterns.
- Read-only root filesystem + tmpfs overlays for more services.
- Mandatory policy as code checks for compose security posture.
- Strict host firewall/profile guidance by OS.
- Enhanced branch/ruleset protections for CI-integrated org workflows.

Status:
- This content is intentionally deferred to a dedicated `ADVANCED.md` deliverable later in the project.

## What Comes Next: Phase 2 (See PHASE2.md)
Phase 2 (deferred, documented separately) adds an MCP `environment-manager` server that wraps Phase 1 scripts and config, enabling human operators to orchestrate everything via Copilot chat and a dedicated PM agent. No Phase 1 refactoring required; Phase 2 is a purely additive layer.

## Immediate Next Step
- Proceed with Phase 1A implementation after user approval.
