# qa.ps1 - QA suite runner
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [string]$Suite = "fast",
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SuitesFile = Join-Path $ProjectRoot "config\qa\suites.yaml"
$GatesFile = Join-Path $ProjectRoot "config\qa\gates.yaml"

function Show-Usage {
    Write-Host "Usage: qa.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  run [-Suite fast|full]    Run QA suite"
    Write-Host "  gates                     Show gate requirements"
    Write-Host ""
    exit 1
}

if ($Help -or -not $Command) { Show-Usage }

switch ($Command.ToLower()) {
    "run" {
        Write-Host "Running QA suite: $Suite"
        Write-Host "Suite config: $SuitesFile"
        Write-Host ""
        Write-Host "--- LINT ---"
        Write-Host "Configure lint command in config\qa\suites.yaml for your project."
        Write-Host ""
        if ($Suite -eq "full") {
            Write-Host "--- STATIC ANALYSIS ---"
            Write-Host "Configure SonarQube project key and token in .env, then run sonar-scanner."
            Write-Host ""
            Write-Host "--- INTEGRATION TESTS ---"
            Write-Host "Configure integration test command in config\qa\suites.yaml."
            Write-Host ""
        }
        Write-Host "--- UNIT TESTS ---"
        Write-Host "Configure unit test command in config\qa\suites.yaml for your project."
        Write-Host ""
        Write-Host "QA suite '$Suite' complete. Update config\qa\suites.yaml with real commands."
    }
    "gates" {
        Get-Content $GatesFile
    }
    default { Show-Usage }
}
