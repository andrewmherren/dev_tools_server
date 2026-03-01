# TLS Phase (Deferred)

## Status

TLS is intentionally deferred for the Traefik migration phase.
Current routing is HTTP-only on localhost (`http://*.localhost`).

## Goal for TLS Phase

Enable trusted HTTPS endpoints for local development:

- `https://docs.localhost`
- `https://ollama.localhost`
- `https://sonarqube.localhost`
- `https://<project-name>.localhost`

## Recommended Approach

Use a local development CA (for example, `mkcert`) and configure Traefik to use locally trusted certificates.

## TLS Phase Checklist

1. Generate and trust local CA certificates on developer machines.
2. Add Traefik `websecure` entrypoint on port `443`.
3. Configure Traefik TLS certificates for `*.localhost`.
4. Update Docker Compose to expose `127.0.0.1:443:443`.
5. Add HTTP->HTTPS redirect middleware for local routes.
6. Update docs and MCP endpoint examples to use `https://`.
7. Validate browser trust and MCP client compatibility.

## Notes

- Keep certificate artifacts out of source control.
- Maintain HTTP fallback only if specific local tools require it.
- Revisit this phase once Traefik routing is stable for both Docker and manual non-Docker routes.
