# First Project

This creates your first project and an example agent workspace.

## 1. Create the project repo

Navigate to wherever you keep your projects and create or clone one.

**Example** (if using the suggested `sandbox` folder structure):

```bash
mkdir -p ../sandbox
cd ../sandbox
git clone git@github.com:GitUsername/my_project.git my_project
# or: git init my_project
```

**Or use your own path** (adjust commands accordingly):

```bash
cd ~/my-projects
git clone git@github.com:GitUsername/my_project.git my_project
# or: git init my_project
```

Then make sure to note the **full path to your project** for the next step. If you're using [.env](.env) overrides, update `PROJECT_ROOT_PATH` there.

## 2. Work in the container

**Always start with:**

```bash
cd dev_environment  # if you're not already there
docker compose up -d  # ensure services are running
```

**Option A: VS Code** (recommended)

From the `dev_environment` directory:

```bash
code .
```

In VS Code, open Command Palette and select: **`Dev Containers: Attach to Running Container`**

Then select `ai-dev-human` from the list.

You edit your project but run inside the container.

> Note: Do NOT use "Reopen in Container"—that would start a separate container. We want to attach to the one managed by docker-compose.

**Option B: Terminal**

```bash
docker exec -it ai-dev-human bash
cd /workspace  # this is your project mounted inside the container
```

## 3. Add one agent workspace (example)

From your project folder:

```bash
cd ../my_project  # your project folder

# Create agent worktree based on main branch
git worktree add ../my_project-agent-1 -b agent-1 main
```

If your project doesn't have a `main` branch yet, omit it:

```bash
git worktree add ../my_project-agent-1 -b agent-1
```

(You'll see a message like "No possible source branch, inferring '--orphan'"—this is expected for new projects.)

Then start the agent container:

```bash
cd ../../dev_environment

docker compose --profile agents up -d agent-1
docker exec -it ai-dev-agent-1 bash
```

## Stopping Agents

Agents run independently from the main environment, so you can stop them without affecting the human container:

```bash
cd dev_environment

# Stop a specific agent
docker compose --profile agents down --remove-orphans agent-1

# Or stop all agents (keeps human container running)
docker compose --profile agents down
```

To stop everything (human + agents + Ollama):

```bash
docker compose down
```

## Project Differences (Short Answer)

Most projects use the **same environment**. Differences usually live in the project repo, not here.

- React: Node is already installed.
- Laravel: you may want PHP/Composer (see Advanced).
- C++: build tools are already installed.

<details>
<summary>When the environment needs changes</summary>

If a project needs system-level dependencies (e.g., PHP, Java, CUDA), extend the environment in [ADVANCED.md](ADVANCED.md). Keep the base stable and add project-specific layers only when needed.
</details>

<details>
<summary>Custom project or agent paths</summary>

If your project or agent worktrees are not under the default location, update [.env](.env):

**Use absolute paths** (clearest):
```bash
PROJECT_ROOT_PATH=D:/sandbox/my_project
AGENT_1_PATH=D:/sandbox/my_project-agent-1
```

**Or use relative paths from dev_environment/**:
```bash
PROJECT_ROOT_PATH=../my_project
AGENT_1_PATH=../my_project-agent-1
```

These are used by [docker-compose.yml](docker-compose.yml). See [.env.example](.env.example) for more examples.
</details>
