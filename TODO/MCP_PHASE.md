# MCP Phase: Route Registration Automation (Future)

## Status

Current model:

- Dockerized apps auto-register through Traefik Docker labels.
- Non-Docker apps are registered manually in `traefik/dynamic/dev-projects.yml`.

This document describes a future custom MCP service that can automate non-Docker registration and unregistration.

## Problem to Solve

Manual edits in `traefik/dynamic/dev-projects.yml` work, but they are easy to forget and can drift over time.

Desired future behavior:

- Ask an agent to register a local app at `http://<project-name>.localhost`
- Ask an agent to unregister it when no longer needed
- Keep route definitions consistent and validated

## Proposed MCP Service

Suggested service name: `traefik-route-manager-mcp`

### Candidate Tools

1. `route.register`
   - Inputs: `name`, `targetUrl`, optional `entrypoint`
   - Action: add router/service block to `traefik/dynamic/dev-projects.yml`

2. `route.unregister`
   - Inputs: `name`
   - Action: remove router/service block for that project

3. `route.list`
   - Inputs: optional filters
   - Action: list current manual routes from file-provider config

4. `route.validate`
   - Inputs: none
   - Action: validate file syntax and route conventions (`*.localhost`)

## Safety Requirements

- Enforce localhost-only targets (`host.docker.internal`, `127.0.0.1`, `localhost`) by default.
- Reject privileged/system endpoints.
- Keep an audit log for route add/remove actions.
- Require explicit confirmation before destructive deletes.

## Integration Notes

- Service can be exposed via stdio or HTTP MCP transport.
- Keep write scope restricted to `traefik/dynamic/dev-projects.yml`.
- Pair with policy controls from `docs/mcp-policy.md` before enabling write-capable agent roles.

## Adoption Trigger

Implement this phase when manual non-Docker route management becomes a bottleneck or frequent source of mistakes.
