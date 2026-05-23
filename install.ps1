# Install the worldcanon-canon Obsidian plugin into a vault.
#
# Easiest way: double-click install.cmd in this folder.
# Manual: open PowerShell, cd into this folder, run:
#   .\install.ps1 -VaultPath "C:\path\to\your\vault"

param(
    [string]$VaultPath
)

$ErrorActionPreference = "Stop"

try {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host " Worldbuilder Canon plugin installer" -ForegroundColor Cyan
    Write-Host "=====================================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not $VaultPath) {
        Write-Host "Where is your Obsidian vault folder?"
        Write-Host "Use the same path you gave the sidecar installer."
        Write-Host ""
        $VaultPath = Read-Host "Vault path"
        if (-not $VaultPath) {
            throw "No vault path entered. Run install.cmd again."
        }
    }

    $VaultPath = $VaultPath.Trim('"').Trim()

    if (-not (Test-Path $VaultPath -PathType Container)) {
        throw "Vault folder not found: $VaultPath"
    }

    $Here = $PSScriptRoot
    $Required = @("manifest.json", "main.js", "styles.css")
    foreach ($file in $Required) {
        if (-not (Test-Path (Join-Path $Here $file))) {
            throw "$file not found next to install.ps1.`n`nDid you extract the plugin zip? " +
                  "install.ps1, manifest.json, main.js, and styles.css should all be in the same folder."
        }
    }

    $PluginDir = Join-Path $VaultPath ".obsidian\plugins\worldcanon-canon"
    New-Item -ItemType Directory -Path $PluginDir -Force | Out-Null

    foreach ($file in $Required) {
        Copy-Item (Join-Path $Here $file) $PluginDir -Force
    }

    Write-Host ""
    Write-Host "Plugin installed at:" -ForegroundColor Green
    Write-Host "  $PluginDir"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Open your vault in Obsidian."
    Write-Host "  2. Settings -> Community plugins."
    Write-Host "  3. If 'Restricted mode' is on, click Turn off."
    Write-Host "  4. Worldbuilder Canon should appear in the list — toggle it on."
    Write-Host ""
    Write-Host "Look at the bottom-right of the Obsidian window — you should see"
    Write-Host "'Canon: ✓ N chunks, M facts' in green."
}
catch {
    Write-Host ""
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host " Plugin install failed" -ForegroundColor Red
    Write-Host "=====================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host ""
    Write-Host "If you don't understand this error, take a screenshot of the whole window"
    Write-Host "(including the lines above) and send it to Adam."
}
finally {
    Write-Host ""
    Read-Host "Press Enter to close this window"
}
