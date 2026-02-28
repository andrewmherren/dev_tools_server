# agent.ps1 - Agent container management
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [string]$Name = "",
    [string]$Role = "",
    [switch]$Background,
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"
$ConfigFile = Join-Path $ProjectRoot "config\agents\definitions.yaml"

function Show-Usage {
    Write-Host "Usage: agent.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  define -Name <name> -Role <role>   Register an agent"
    Write-Host "  run -Name <name> [-Background]     Run an agent"
    Write-Host "  list                               List defined agents"
    Write-Host "  status                             Show agent container status"
    Write-Host "  logs -Name <name>                  Show agent logs"
    Write-Host "  stop -Name <name>                  Stop agent container"
    Write-Host ""
    exit 1
}

if ($Help -or -not $Command) { Show-Usage }

function Get-AgentProfile([string]$AgentName) {
    $lines = Get-Content $ConfigFile -ErrorAction SilentlyContinue
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
        Write-Host "Agent definition (add to config\agents\definitions.yaml to persist):"
        Write-Host "  - name: $Name"
        Write-Host "    role: $Role"
        Write-Host "    profile: agent-dev"
        Write-Host "    mcp_profile: standard"
        Write-Host "    description: `"`""
    }
    "run" {
        if (-not $Name) { Write-Host "Error: -Name required"; Show-Usage }
        $profile = Get-AgentProfile $Name
        if (-not $env:WORKTREE_NAME) { $env:WORKTREE_NAME = Split-Path -Leaf $ProjectRoot }
        if ($Background) {
            Write-Host "Starting agent '$Name' (profile: $profile) in background..."
            docker compose -f $ComposeFile --profile $profile up -d
        } else {
            Write-Host "Starting agent '$Name' (profile: $profile) interactively..."
            docker compose -f $ComposeFile --profile $profile run --rm $profile
        }
    }
    "list" {
        Write-Host "Defined agents (from config\agents\definitions.yaml):"
        Get-Content $ConfigFile | Select-String "^\s+- name:" | ForEach-Object {
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
