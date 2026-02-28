# agent.ps1 - Agent container management
# Reads agent config from $env:PROJECT_PATH/config (set PROJECT_PATH env var)
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [string]$Name = "",
    [string]$Role = "",
    [switch]$Background,
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DevEnvRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $DevEnvRoot "docker-compose.yml"

function Show-Usage {
    Write-Host "Usage: agent.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  define -Name <name> -Role <role>   Print agent definition to add to definitions.yaml"
    Write-Host "  run -Name <name> [-Background]     Run an agent"
    Write-Host "  list                               List defined agents"
    Write-Host "  status                             Show agent container status"
    Write-Host "  logs -Name <name>                  Show agent logs"
    Write-Host "  stop -Name <name>                  Stop agent container"
    Write-Host ""
    Write-Host "Environment:"
    Write-Host "  PROJECT_PATH   Path to project containing config/agents/definitions.yaml"
    Write-Host ""
    exit 1
}

if ($Help -or -not $Command) { Show-Usage }

function Get-ConfigFile {
    if (-not $env:PROJECT_PATH) {
        Write-Host "Error: PROJECT_PATH not set. Run: `$env:PROJECT_PATH = 'C:\path\to\your\project'"
        exit 1
    }
    return Join-Path $env:PROJECT_PATH "config\agents\definitions.yaml"
}

function Get-AgentProfile([string]$AgentName) {
    $configFile = Get-ConfigFile
    $lines = Get-Content $configFile -ErrorAction SilentlyContinue
    $found = $false
    foreach ($line in $lines) {
        if ($line -match "^\s+- name: $AgentName\s*$") { $found = $true }
        if ($found -and $line -match "^\s+profile: (\S+)") { return $Matches[1] }
    }
    return "agent-dev"
}

switch ($Command.ToLower()) {
    "define" {
        if (-not $Name -or -not $Role) { Write-Host "Error: -Name and -Role required"; Show-Usage }
        Write-Host "Add the following to `$env:PROJECT_PATH\config\agents\definitions.yaml:"
        Write-Host "  - name: $Name"
        Write-Host "    role: $Role"
        Write-Host "    profile: agent-dev"
        Write-Host "    mcp_profile: standard"
        Write-Host "    description: `"`""
    }
    "run" {
        if (-not $Name) { Write-Host "Error: -Name required"; Show-Usage }
        $profile = Get-AgentProfile $Name
        $projectBase = if ($env:PROJECT_PATH) { Split-Path -Leaf $env:PROJECT_PATH } else { Split-Path -Leaf $DevEnvRoot }
        if (-not $env:WORKTREE_NAME) { $env:WORKTREE_NAME = $projectBase }
        if ($Background) {
            Write-Host "Starting agent '$Name' (profile: $profile) in background..."
            docker compose -f $ComposeFile --profile $profile up -d
        } else {
            Write-Host "Starting agent '$Name' (profile: $profile) interactively..."
            docker compose -f $ComposeFile --profile $profile run --rm $profile
        }
    }
    "list" {
        $configFile = Get-ConfigFile
        Write-Host "Defined agents (from $configFile):"
        Get-Content $configFile | Select-String "^\s+- name:" | ForEach-Object {
            Write-Host "  -$($_ -replace '.*- name:', '')"
        }
    }
    "status" {
        docker compose -f $ComposeFile ps
    }
    "logs" {
        if (-not $Name) { Write-Host "Error: -Name required"; Show-Usage }
        docker compose -f $ComposeFile logs -f $Name
    }
    "stop" {
        if (-not $Name) { Write-Host "Error: -Name required"; Show-Usage }
        docker compose -f $ComposeFile stop $Name
    }
    default { Show-Usage }
}
