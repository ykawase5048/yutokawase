# Start the local website preview and open it in the default browser.
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

$nodeCommand = Get-Command 'node.exe' -ErrorAction SilentlyContinue
if ($null -eq $nodeCommand) {
    throw 'Node.js is required. Install Node.js, then run this script again.'
}

Push-Location -LiteralPath $PSScriptRoot
try {
    Write-Host "Starting preview at http://127.0.0.1:$Port/"
    Write-Host 'Press Ctrl+C to stop the server.'

    & $nodeCommand.Source (Join-Path $PSScriptRoot 'scripts\preview.mjs') --port $Port --open
}
finally {
    Pop-Location
}
