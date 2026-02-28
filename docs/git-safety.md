# Git Safety Guardrails

## Default Policy: No Autonomous Remote Pushes

Agent containers are configured by default to prevent autonomous remote git operations.

### How It Works

1. **No SSH key mounts** — Agent container definitions in `docker-compose.yml` do not mount `~/.ssh` or any SSH keys.
2. **No persisted credentials** — Agent containers do not receive git credential helpers or token env vars by default.
3. **No remote write tools in MCP allowlist** — `config/mcp/allowlist.yaml` explicitly disallows `create_or_update_file`, `push_files`, and branch creation tools in the `standard` profile.

### What Agents Can Do

- Read and modify local workspace files
- Run local git commands (`git status`, `git diff`, `git log`, `git commit`)
- All remote push/create operations require explicit human action

### Enabling Remote Access (Advanced)

If you need to grant an agent remote push access for a specific low-risk workflow:

1. Create a dedicated `agent-dev-write` MCP profile in `config/mcp/allowlist.yaml`
2. Mount an appropriately scoped deploy key (not your personal key)
3. Document the decision in your feature brief

This path is intentionally not the default. See `ADVANCED.md` (planned) for details.

### Optional Local Guard Hook

A pre-push hook can block accidental pushes from agent worktrees:

```bash
#!/usr/bin/env bash
# .git/hooks/pre-push  (chmod +x this file)
# Block pushes from agent worktrees by default.
if [[ "${GIT_DIR:-}" == *"worktree"* || "$(git branch --show-current)" == agent/* ]]; then
  echo "ERROR: Remote push blocked in agent worktree. Use human review workflow."
  exit 1
fi
```
