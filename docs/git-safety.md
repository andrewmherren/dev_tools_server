# Safe Integration with the Dev Environment

## Overview

This shared dev server provides code quality analysis, documentation indexing, and AI-assisted development tools. Follow these patterns when integrating your projects.

## Security Principles

### No Autonomous Remote Operations
The dev server itself performs no autonomous remote git operations. All code modifications and pushes remain under your direct control.

### Credential Management
- **SonarQube Token**: Store in `.vscode/settings.json` or environment variables (never in code)
- **Git Credentials**: Use your standard git credential helper for repository access
- **API Tokens**: Keep out of `.env` files committed to git

## Best Practices

### 1. Isolate Configuration
- Keep `.vscode/mcp.json` in `.gitignore` if it contains tokens
- Use `.env.local` for sensitive values in local development
- Store CI/CD tokens in your git provider's secrets management

### 2. Local-Only MCP Development
When using the docs-mcp and sonarqube servers:
- They only read your local code and index it locally
- No automatic uploads to external services
- All analysis runs on your machine

### 3. Code Review Workflow
- Run SonarQube analysis before submitting PRs
- Use Copilot with the dev environment for code suggestions
- All push operations remain manual human actions

### 4. Team Development
If sharing this dev server across a team:
- Document URL access points (e.g., `http://sonarqube.localhost`)
- Use network segmentation to isolate dev-network from untrusted systems
- Keep storage paths on reliable storage media with backups

## Recommended `.gitignore` Entries

```gitignore
# VSCode MCP config with tokens
.vscode/mcp.json
.vscode/settings.json

# Local environment files
.env
.env.local
.env.*.local

# SonarQube analysis cache
.sonarqube/
```
