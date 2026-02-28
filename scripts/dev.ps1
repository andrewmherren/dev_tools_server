# dev.ps1 - Development environment management
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [string]$Profile = "human",
    [string]$Service = "",
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"

function Show-Usage {
    Write-Host "Usage: dev.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  up [-Profile human|agent-dev|agent-qa]  Start services"
    Write-Host "  down                                     Stop services"
    Write-Host "  status                                   Show running services"
    Write-Host "  logs [-Service <name>]                   Show logs"
    Write-Host ""
    exit 1
}

if ($Help -or -not $Command) { Show-Usage }

switch ($Command.ToLower()) {
    "up" {
        Write-Host "Starting services with profile: $Profile"
        docker compose -f $ComposeFile --profile $Profile up -d
    }
    "down" {
        docker compose -f $ComposeFile down
    }
    "status" {
        docker compose -f $ComposeFile ps
    }
    "logs" {
        if ($Service) {
            docker compose -f $ComposeFile logs -f $Service
        } else {
            docker compose -f $ComposeFile logs -f
        }
    }
    default { Show-Usage }
}
