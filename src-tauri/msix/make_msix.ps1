# Builds the Microsoft Store package (MSIX) from the app Tauri just built. Run by the release
# workflow on Windows. The Store signs MSIX packages itself, so no paid code-signing certificate
# is needed. Output: src-tauri\target\msix\MenuCents_<version>_x64.msix
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$tauri = Split-Path $here -Parent
$conf = Get-Content (Join-Path $tauri 'tauri.conf.json') -Raw | ConvertFrom-Json
$version = "$($conf.version).0"                      # the Store wants four numbers: 0.2.58.0
$id = Get-Content (Join-Path $here 'identity.json') -Raw | ConvertFrom-Json
$test = -not ($id.name -and $id.publisher -and $id.publisher_display_name)
if ($test) {                                          # placeholders: proves the package builds
  $id = @{ name = 'CrownWellLabs.MenuCents.Test'; publisher = 'CN=CrownWell Labs Test'; publisher_display_name = 'CrownWell Labs' }
}

$rel = Join-Path $tauri 'target\release'
$exe = @('MenuCents.exe', 'mise.exe') | ForEach-Object { Join-Path $rel $_ } | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $exe) { throw "No MenuCents.exe or mise.exe in $rel" }

$out = Join-Path $tauri 'target\msix'
$layout = Join-Path $out 'layout'
Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force (Join-Path $layout 'Assets') | Out-Null
Copy-Item $exe (Join-Path $layout 'MenuCents.exe')
foreach ($logo in 'StoreLogo', 'Square44x44Logo', 'Square150x150Logo') {
  Copy-Item (Join-Path $tauri "icons\$logo.png") (Join-Path $layout "Assets\$logo.png")
}
$xml = Get-Content (Join-Path $here 'AppxManifest.xml') -Raw
$xml = $xml.Replace('{{NAME}}', $id.name).Replace('{{PUBLISHER}}', $id.publisher)
$xml = $xml.Replace('{{PUBLISHER_DISPLAY_NAME}}', $id.publisher_display_name).Replace('{{VERSION}}', $version)
[IO.File]::WriteAllText((Join-Path $layout 'AppxManifest.xml'), $xml, (New-Object Text.UTF8Encoding $false))

$makeappx = Get-ChildItem 'C:\Program Files (x86)\Windows Kits\10\bin' -Recurse -Filter makeappx.exe |
  Where-Object { $_.FullName -match '\\x64\\' } | Sort-Object FullName -Descending | Select-Object -First 1
if (-not $makeappx) { throw 'makeappx.exe not found (Windows SDK)' }
$name = if ($test) { "MenuCents_$($conf.version)_x64_TEST.msix" } else { "MenuCents_$($conf.version)_x64.msix" }
$msix = Join-Path $out $name
& $makeappx.FullName pack /d $layout /p $msix /o /h SHA256
if ($LASTEXITCODE -ne 0) { throw "makeappx failed ($LASTEXITCODE)" }
Write-Host "Built $msix$(if ($test) { ' (TEST identity: fill in src-tauri\msix\identity.json for the Store)' })"
$env:MSIX = $msix                                   # for the upload line in the same workflow step
if ($env:GITHUB_ENV) { "MSIX=$msix" | Out-File -FilePath $env:GITHUB_ENV -Append -Encoding utf8 }
