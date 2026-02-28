# dev.ps1 - Development environment management
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [Parameter(Position=1)]
    [string]$ProjectPath = "",
    [string]$Profile = "human",
    [string]$Service = "",
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $ProjectRoot "docker-compose.yml"
$TemplatesDir = Join-Path $ProjectRoot "templates"

function Show-Usage {
    Write-Host "Usage: dev.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  init <project-path>                        Scaffold config/docs into a project"
    Write-Host "  up [-Profile human|agent-dev|agent-qa]    Start shared services"
    Write-Host "  down                                       Stop shared services"
    Write-Host "  status                                     Show running services"
    Write-Host "  logs [-Service <name>]                     Show logs"
    Write-Host ""
    exit 1
}

if ($Help -or -not $Command) { Show-Usage }

switch ($Command.ToLower()) {
    "init" {
        if (-not $ProjectPath) { Write-Host "Error: project path required"; Show-Usage }
        if (-not (Test-Path $ProjectPath)) { Write-Host "Error: directory not found: $ProjectPath"; exit 1 }
        Write-Host "Scaffolding dev environment config into: $ProjectPath"
        $configSrc = Join-Path $TemplatesDir "config"
        $docsSrc   = Join-Path $TemplatesDir "docs"
        $configDst = Join-Path $ProjectPath "config"
        $docsDst   = Join-Path $ProjectPath "docs"
        if (-not (Test-Path $configDst)) { Copy-Item -Recurse $configSrc $configDst }
        else { Write-Host "  config/ already exists, skipping." }
        if (-not (Test-Path $docsDst)) { Copy-Item -Recurse $docsSrc $docsDst }
        else { Write-Host "  docs/ already exists, skipping." }
        Write-Host "Done. Edit $ProjectPath\config\qa\suites.yaml to configure your project's test commands."
    }
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

