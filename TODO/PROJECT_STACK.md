example vscode dir with mcp tools

initial ai agents, prompts setup, instructions

specific instructions about the setup itself including documentation about the dev_tools_server.

local containers

🔬 Category 2 — Per Project Containers

(Isolated, disposable, indexed per repo)

1️⃣ CocoIndex

This is your structured code indexer.
Uses tree-sitter → embeddings → stores per project collection in Qdrant/Postgres.
Best balance of automation + real structure.

2️⃣ BifrostMCP

Exposes LSP features (find usages, definitions, symbols) to agents.
Run per VSCode workspace. Zero bleed between projects.

3️⃣ CodeXRay (optional but powerful)

Use this only for larger repos (Unreal, multi-repo systems).
It builds a real dependency graph + impact model. Overkill for small SPAs.