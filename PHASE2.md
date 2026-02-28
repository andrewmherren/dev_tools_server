# PHASE 2: MCP-Driven Environment Management (Future)

## Vision
Phase 2 adds an optional MCP (`environment-manager`) server that wraps Phase 1's script-driven orchestration, enabling human operators and agents to manage the entire development environment and multi-agent workflows via Copilot chat interactions.

In Phase 2, users interact primarily through a "Project Manager" agent that communicates via Copilot, rather than invoking command-line scripts directly. The underlying config structure and scripts from Phase 1 remain unchanged; Phase 2 is a purely additive layer.

## Why Phase 2?
Phase 1 delivers a fully functional, config-driven system that works great from the CLI. Phase 2 adds Copilot-driven UX for human operators who prefer chat-based collaboration and want agents to manage environment lifecycle as part of multi-agent orchestration.

No Phase 1 refactoring required for Phase 2 implementation.

## Phase 2 Deliverable: MCP Environment Manager

### New Directory
```
mcp-servers/
└── environment-manager/
    ├── server.js|py             # MCP server implementation
    ├── config/
    │   └── tools.yaml           # Tool definitions (dev, agent, qa, flow)
    └── README.md                # MCP server docs
```

### MCP Tools Exposed
The server exposes Phase 1 commands as MCP tools for Copilot agents:

**Environment Tools:**
- `dev.up` -> `./scripts/dev.<ps1|sh> up`
- `dev.down` -> `./scripts/dev.<ps1|sh> down`
- `dev.status` -> `./scripts/dev.<ps1|sh> status`
- `dev.logs` -> `./scripts/dev.<ps1|sh> logs --service <name>`

**Agent Tools:**
- `agent.run` -> `./scripts/agent.<ps1|sh> run --name <name> --feature <id> [--background]`
- `agent.status` -> `./scripts/agent.<ps1|sh> status --feature <id>`
- `agent.logs` -> `./scripts/agent.<ps1|sh> logs --feature <id>`
- `agent.define` -> Register new agent from YAML (validates config)

**QA Tools:**
- `qa.run` -> `./scripts/qa.<ps1|sh> run --feature <id> --suite <fast|full>`
- `qa.status` -> Check QA run status and results

**Orchestration Tools:**
- `flow.run` -> `./scripts/flow.<ps1|sh> run --feature <id> --max-fix-loops <n>`
- `flow.status` -> Monitor multi-stage feature delivery
- `flow.logs` -> Stream logs from active orchestration

**Config Tools:**
- `config.validate` -> Validate all YAML configs (lifecycle, agents, qa, etc.)
- `config.read` -> Read any config file (lifecycle.yaml, feature definitions, etc.)
- `config.list_features` -> List all features in `docs/features/`
- `config.list_agents` -> List all registered agents from `config/agents/definitions.yaml`

### Project Manager Agent (Phase 2)

A new agent role is defined in `config/agents/definitions.yaml`:

```yaml
agents:
  project-manager:
    role: project-manager
    container_profile: null          # Runs in user's VS Code
    mcp_tools: [environment-manager-mcp, docs-mcp, github-mcp]
    instructions: "config/workflows/roles/project-manager.yaml"
    human_interactive: true
    mcp_context: "orchestrator"
```

**Project Manager Responsibilities:**
1. Manages environment lifecycle (start/stop stack).
2. Monitors all concurrent feature deliveries.
3. Handles multi-agent orchestration queries from human operators.
4. Escalates blockers, QA failures, and handoff decisions to humans.
5. Provides status summaries and logs on demand.

**Project Manager Instructions** (`config/workflows/roles/project-manager.yaml`):
```yaml
role: project-manager
purpose: |
  Manage development environment, orchestrate multi-agent feature delivery,
  and provide human operators with real-time visibility and control.
responsibilities:
  - Start/stop development stack on human request
  - Execute feature delivery workflows (planner → architect → dev → qa → bugfix loops)
  - Monitor and report progress on active features
  - Escalate QA failures, blockers, or handoff decisions
  - Provide environment status and logs
  - Validate configuration changes
constraints:
  - Cannot independently approve feature handoff; requires human review
  - Cannot commit/push code; all changes remain in worktrees for human approval
  - Must log all initiated actions and report outcomes
mcp_access:
  - Full environment-manager-mcp tool suite
  - Read-only github-mcp for PR context
  - docs-mcp for technical context
```

## Daily Workflow Evolution (Phase 2)

### Phase 1 (Script-Based)
```bash
./scripts/dev.ps1 up
./scripts/flow.ps1 run --feature user-auth-oauth --max-fix-loops 3
./scripts/dev.ps1 logs --service docs-mcp
```

### Phase 2 (Copilot-Driven)
User opens VS Code chat and interacts with @project-manager agent:

```
Human: "Start the dev environment and run the user-auth-oauth feature 
through the full pipeline. Let me know when QA passes or if you need my input."

@project-manager: (calling environment-manager-mcp tools)
1. dev.up ✓ (Core services started)
2. flow.run --feature user-auth-oauth --max-fix-loops 3 ✓
   → Planner stage: creating implementation plan...
   → Architect stage: drafting design & tasks...
   → Developer stage: implementing (worktree branch-xxx)...
   → QA stage: full suite running...
   
[5 minutes later]
@project-manager:
QA found 2 issues. Bugfix loop 1/3 starting...
- Fix 1: Linting error in oauth-service.py
- Fix 2: Missing test for account linking edge case

[2 minutes later]
@project-manager:
Bugfix committed, QA re-running...

[3 minutes later]
@project-manager:
✓ QA passed (100%, 87% coverage)
Feature ready for human review: [PR link]
Do you want to review now, or shall I summarize the changes?
```

## Advanced Phase 2 Features (Optional)

### Multi-Feature Orchestration
PM agent can manage multiple concurrent features with dependency tracking:

```
Human: "Run features auth-oauth, email-notifications, and user-dashboard"

@project-manager:
- Feature 1 (email-notifications): planner → architect stages ✓
- Feature 2 (auth-oauth): developer → qa ✓
- Feature 3 (user-dashboard): depends on auth-oauth completion
  Waiting for auth-oauth QA...
```

### Anomaly Detection and Auto-Escalation
- If QA repeatedly fails after N bugfix loops, escalate to human with context.
- If a stage times out unexpectedly, capture logs and alert.
- If MCP tool calls fail or MCP services go offline, notify immediately.

### Config Change Validation
PM agent validates any proposed config changes before applying:

```
Human: "Add a new qa suite called 'stress-test' to the config"

@project-manager:
I'll need the full YAML definition. Alternatively, I can guide you through 
creating it interactively. Do you have the stress-test suite config ready?
[After human provides config]
Validating config.validate ✓
Stage dependencies check ✓
Tool whitelist check ✓
Ready to add stress-test suite to config/qa/suites.yaml. Confirm?
```

## Implementation Notes

### Phase 1 Dependencies (No Changes Required)
- Phase 2 server reads and invokes Phase 1 scripts without modification.
- Phase 2 server reads Phase 1 config YAML files (read-only).
- Phase 1 scripts remain unchanged; they are the orchestration engine.

### MCP Server Hosting Options
- Local: run in a dev container alongside the main stack (`mcp-servers/environment-manager/`)
- Or: expose as a separate network service registered in VS Code's MCP config

### Copilot Agent Registration
In VS Code's `settings.json` or `.vscode/settings.json`:
```json
{
  "github.copilot.agent.environment-manager": {
    "transport": "stdio",
    "command": "node",
    "args": ["mcp-servers/environment-manager/server.js"]
  }
}
```

## Acceptance Criteria (Phase 2)
- MCP server exposes all Phase 1 command surfaces as tools.
- Project Manager agent can start/stop/monitor environment and orchestrate features via Copilot chat.
- All Phase 1 functionality remains unchanged and callable via CLI or MCP.
- Human operators can interact exclusively via Copilot chat (zero CLI invocations) for routine tasks.
- Logs, status, and escalations are visible in Copilot chat in real-time or summarized on demand.
- Phase 1 config structure is unchanged; Phase 2 is additive only.

## Timeline
- Phase 2 is deferred until Phase 1 is stable and fully operational.
- Expected: 1–2 releases after Phase 1 completion.

## Future Beyond Phase 2
- **Phase 3:** Enhanced observability (metrics, distributed tracing) for multi-agent workflows.
- **Phase 4:** Policy-as-Code enforcement (mandatory code reviews, security gates, compliance checks).
- **Phase 5:** Cross-project orchestration (manage multiple projects + shared services).
