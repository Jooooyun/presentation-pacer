$ErrorActionPreference = 'Stop'
$presentationUrl = 'http://127.0.0.1:43129'
$presentationNode = Get-Command node.exe -ErrorAction Stop
$presentationRunning = $false
try {
    $presentationResponse = Invoke-WebRequest -Uri $presentationUrl -UseBasicParsing -TimeoutSec 2
    $presentationRunning = $presentationResponse.StatusCode -eq 200
} catch {}
if (-not $presentationRunning) {
    Start-Process -FilePath $presentationNode.Source -ArgumentList @(('"' + (Join-Path $PSScriptRoot 'bridge.cjs') + '"')) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden
    for ($presentationAttempt = 0; $presentationAttempt -lt 15; $presentationAttempt++) {
        Start-Sleep -Milliseconds 300
        try {
            $presentationResponse = Invoke-WebRequest -Uri $presentationUrl -UseBasicParsing -TimeoutSec 1
            if ($presentationResponse.StatusCode -eq 200) { break }
        } catch {}
    }
}
Start-Process $presentationUrl
