# flow.ps1 - Multi-agent feature lifecycle orchestration
param(
    [Parameter(Position=0)]
    [string]$Command = "",
    [string]$Feature = "",
    [int]$MaxFixLoops = 3,
    [switch]$Help
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DevEnvRoot = Split-Path -Parent $ScriptDir

function Get-ProjectPath {
    if (-not $env:PROJECT_PATH) {
        Write-Host "Error: PROJECT_PATH not set. Run: `$env:PROJECT_PATH = 'C:\path\to\your\project'"
        exit 1
    }
    return $env:PROJECT_PATH
}

function Show-Usage {
    Write-Host "Usage: flow.ps1 <command> [options]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  run -Feature <id> [-MaxFixLoops <n>]   Run full feature lifecycle"
    Write-Host "  status -Feature <id>                    Show lifecycle artifact status"
    Write-Host ""
    exit 1
}

if ($Help -or -not $Command) { Show-Usage }

switch ($Command.ToLower()) {
    "run" {
        if (-not $Feature) { Write-Host "Error: -Feature required"; Show-Usage }
        $project       = Get-ProjectPath
        $lifecycleFile = Join-Path $project "config\workflows\lifecycle.yaml"
        $featuresDir   = Join-Path $project "docs\features"
        $featureFile   = Join-Path $featuresDir "$Feature.yaml"
        if (-not (Test-Path $featureFile)) {
            Write-Host "Error: Feature file not found: $featureFile"; exit 1
        }

        Write-Host "========================================"
        Write-Host "  FEATURE LIFECYCLE: $Feature"
        Write-Host "  Max fix loops:     $MaxFixLoops"
        Write-Host "========================================"
        Write-Host ""
        Write-Host "Lifecycle config:  $lifecycleFile"
        Write-Host "Feature brief:     $featureFile"
        Write-Host ""

        foreach ($stage in @("planner", "architect", "developer")) {
            Write-Host "--- Stage: $stage ---"
            & "$ScriptDir\agent.ps1" run -Name $stage -Background
            Write-Host ""
        }

        $fixLoop = 0
        while ($fixLoop -le $MaxFixLoops) {
            Write-Host "--- Stage: qa (attempt $($fixLoop + 1) of $($MaxFixLoops + 1)) ---"
            & "$ScriptDir\qa.ps1" run -Suite fast
            Write-Host ""

            if ($fixLoop -lt $MaxFixLoops) {
                Write-Host "--- Stage: developer fix (loop $($fixLoop + 1)) ---"
                & "$ScriptDir\agent.ps1" run -Name developer -Background
                Write-Host ""
            }
            $fixLoop++
        }

        Write-Host "========================================"
        Write-Host "  HUMAN REVIEW GATE"
        Write-Host "========================================"
        Write-Host "  Review artifacts in: $featuresDir\$Feature\"
        Write-Host "    - plan.md"
        Write-Host "    - architecture.md"
        Write-Host "    - qa_report.md"
        Write-Host ""
        Write-Host "  Approve or reject before merging."
        Write-Host "========================================"
    }
    "status" {
        if (-not $Feature) { Write-Host "Error: -Feature required"; Show-Usage }
        $project     = Get-ProjectPath
        $featuresDir = Join-Path $project "docs\features"
        Write-Host "Feature: $Feature"
        Write-Host "Artifacts:"
        foreach ($f in @("plan.md", "architecture.md", "qa_report.md")) {
            $path = Join-Path $featuresDir "$Feature\$f"
            if (Test-Path $path) {
                Write-Host "  [x] $f"
            } else {
                Write-Host "  [ ] $f (not yet produced)"
            }
        }
    }
    default { Show-Usage }
}
