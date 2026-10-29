# Start the local website preview and open it in the default browser.
[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$Port = 8000
)

$ErrorActionPreference = 'Stop'

$npxCommand = Get-Command 'npx.cmd' -ErrorAction SilentlyContinue
if ($null -eq $npxCommand) {
    throw 'Node.js and npm are required. Install Node.js, then run this script again.'
}

Push-Location -LiteralPath $PSScriptRoot
try {
    Write-Host "Starting preview at http://127.0.0.1:$Port/"
    Write-Host 'The first run may download http-server.'
    Write-Host 'Press Ctrl+C to stop the server.'

    & $npxCommand.Source --yes http-server . -a 127.0.0.1 -p $Port -c-1 -o /
}
finally {
    Pop-Location
}
