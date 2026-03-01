# MCP Tool Policy & Risk Tiering

This document defines trust tiers for MCP tools and approved access patterns in the dev environment.

## Risk Tiers

### Tier 1: Local, Read-Only (Low Risk)
**Characteristics:**
- Operates only on local machine, no remote access
- Read-only operations (no mutations)
- No exfiltration vectors

**Examples:**
- `docs-mcp` (local documentation indexing)
- `filesystem` (read-only file access)
- `package-registry` (lookup only)

**Policy:**
- Enabled by default in all agent profiles
- No approval required
- Can be used in untrusted/minimal profiles

---

### Tier 2: Hosted, Read-Only (Medium Risk)
**Characteristics:**
- Remote service access but read-only
- Potential for information disclosure (e.g., reading private repositories)
- No direct remote mutations

**Examples:**
- `github` (read file contents, list branches, search code)
- `sonarqube` (view issues, retrieve metrics)

**Policy:**
- Enabled in `standard` and `agent-dev-write` profiles
- Requires valid credentials (tokens stored in `.env.local`, never in code)
- Logs should be monitored for unusual patterns
- Agents should not cache sensitive data locally

---

### Tier 3: Hosted, Write Access (High Risk)
**Characteristics:**
- Remote mutations (pushes, creates, deletes)
- Direct impact on remote repositories or systems
- Requires strong approval and audit trail

**Examples:**
- `github` (create/update files, push, merge)
- `sonarqube` (mark issues, change settings)

**Policy:**
- **Disabled by default** in agent profiles
- Requires explicit opt-in via role definition + `--allow-remote-writes` flag
- Supported profiles: `agent-dev-write` (developer role only)
- All mutations must log to audit trail (workflow logs)
- Should never be enabled in agent-qa profile
- Agent containers must not have SSH keys mounted

---

### Tier 4: System-Critical (Forbidden by Default)
**Characteristics:**
- Could compromise host or dev environment integrity
- Persistent credential installation
- Infrastructure reconfiguration

**Examples:**
- Host OS command execution
- Docker daemon access
- Permanent credential storage on host

**Policy:**
- Completely disabled for agents
- System operations only via human-initiated scripts
- Documented in advanced hardening guide (ADVANCED.md, when created)

---

## Access Control Matrix

| Tool | default | minimal | standard | agent-dev-write | agent-qa |
|------|---------|---------|----------|-----------------|----------|
| docs-mcp (read-only) | ✅ | ✅ | ✅ | ✅ | ✅ |
| filesystem (read) | ✅ | ❌ | ✅ | ✅ | ✅ |
| filesystem (write) | ❌ | ❌ | ❌ | ✅ | ❌ |
| github (read) | ❌ | ❌ | ✅ | ✅ | ✅ |
| github (write) | ❌ | ❌ | ❌ | ✅ | ❌ |
| sonarqube (read) | ❌ | ❌ | ✅ | ✅ | ✅ |
| sonarqube (mutate) | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## Implementation

MCP access is controlled via `config/mcp/allowlist.yaml`, which defines profiles and their permitted tools. See that file for detailed tool-by-tool allowlist.

### For Agent Developers
- When defining a new agent role in `config/workflows/roles/<role>.yaml`, specify which MCP profile to use.
- Example:
  ```yaml
  roles:
    developer:
      mcp_profile: agent-dev-write
      description: "Developer agent with write access to repos"
  ```

### For System Administrators
- Review `config/mcp/allowlist.yaml` periodically.
- Update tool allowlists when new MCP tools are added.
- Monitor agent logs for unexpected tool invocations.
- If a tool breach is suspected, immediately disable it and audit usage.

---

## Future Work
- Audit logging: Track all MCP tool invocations with timestamp, agent, tool, and arguments
- Rate limiting: Throttle high-risk tier 3 operations to prevent automated abuse
- Approval workflow: Require human approval before tier 3 operations in shared environments
