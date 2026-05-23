# Install the worldcanon-canon Obsidian plugin into a vault.
# Usage:  .\install.ps1 -VaultPath "C:\Users\<name>\Documents\WorldVault"

param(
    [Parameter(Mandatory = $true)]
    [string]$VaultPath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $VaultPath -PathType Container)) {
    Write-Error "Vault folder not found: $VaultPath"
}

$Here = $PSScriptRoot
$Required = @("manifest.json", "main.js", "styles.css")
foreach ($file in $Required) {
    if (-not (Test-Path (Join-Path $Here $file))) {
        Write-Error "$file not found next to install.ps1. Did you extract the plugin zip?"
    }
}

$PluginDir = Join-Path $VaultPath ".obsidian\plugins\worldcanon-canon"
New-Item -ItemType Directory -Path $PluginDir -Force | Out-Null

foreach ($file in $Required) {
    Copy-Item (Join-Path $Here $file) $PluginDir -Force
}

Write-Host "Installed worldcanon-canon into: $PluginDir"
Write-Host "Open the vault in Obsidian and enable 'Worldbuilder Canon' under Community plugins."
