# qa.ps1 - QA suite runner
# Reads suite config from $env:PROJECT_PATH/config/qa/suites.yaml
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [string]$Suite = "fast",
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Show-Usage {
    Write-Host "Usage: qa.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  run [-Suite fast|full]    Run QA suite"
    Write-Host "  gates                     Show gate requirements"
    Write-Host ""
    Write-Host "Environment:"
    Write-Host "  PROJECT_PATH   Path to project containing config/qa/"
    Write-Host ""
    exit 1
}

function Get-ProjectPath {
    if (-not $env:PROJECT_PATH) {
        Write-Host "Error: PROJECT_PATH not set. Run: `$env:PROJECT_PATH = 'C:\path\to\your\project'"
        exit 1
    }
    return $env:PROJECT_PATH
}

if ($Help -or -not $Command) { Show-Usage }

switch ($Command.ToLower()) {
    "run" {
        $project    = Get-ProjectPath
        $suitesFile = Join-Path $project "config\qa\suites.yaml"
        Write-Host "Running QA suite: $Suite"
        Write-Host "Suite config: $suitesFile"
        Write-Host ""
        Write-Host "--- LINT ---"
        Write-Host "Configure lint command in $project\config\qa\suites.yaml"
        Write-Host ""
        if ($Suite -eq "full") {
            Write-Host "--- STATIC ANALYSIS ---"
            Write-Host "Configure SonarQube project key and token in .env, then run sonar-scanner."
            Write-Host ""
            Write-Host "--- INTEGRATION TESTS ---"
            Write-Host "Configure integration test command in $project\config\qa\suites.yaml"
            Write-Host ""
        }
        Write-Host "--- UNIT TESTS ---"
        Write-Host "Configure unit test command in $project\config\qa\suites.yaml"
        Write-Host ""
        Write-Host "QA suite '$Suite' complete. Update config\qa\suites.yaml with real commands."
    }
    "gates" {
        $project   = Get-ProjectPath
        $gatesFile = Join-Path $project "config\qa\gates.yaml"
        Get-Content $gatesFile
    }
    default { Show-Usage }
}
