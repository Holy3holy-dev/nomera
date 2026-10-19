$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Node.js 22+ is required. Install Node, then run this launcher again.' }
Push-Location $projectPath
try {
    & $nodePath 'scripts/authors-build.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'Preview build failed.' }
    $listening = Get-NetTCPConnection -LocalPort 4317 -State Listen -ErrorAction SilentlyContinue
    if (-not $listening) {
        New-Item -ItemType Directory -Force (Join-Path $projectPath 'work') | Out-Null
        Start-Process -FilePath $nodePath -ArgumentList 'scripts/authors-serve.cjs' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $projectPath 'work\preview.log') -RedirectStandardError (Join-Path $projectPath 'work\preview-errors.log')
    }
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        try {
            $response = Invoke-WebRequest 'http://127.0.0.1:4317/' -TimeoutSec 2
            if ($response.Content -notmatch 'authors-preview.js') { throw 'Port 4317 belongs to another application.' }
            break
        } catch { if ($attempt -eq 29) { throw }; Start-Sleep -Milliseconds 200 }
    }
    Start-Process 'http://127.0.0.1:4317/'
} finally { Pop-Location }
