$root = Split-Path $PSScriptRoot -Parent
$trackedJson = git -C $root show HEAD:backend/data/blgf_doctrack_db.json
$tracked = ($trackedJson -join "`n") | ConvertFrom-Json
$currentPath = Join-Path $root 'backend\data\blgf_doctrack_db.json'
$current = Get-Content $currentPath -Raw | ConvertFrom-Json

$restored = [ordered]@{
  updatedAt = (Get-Date).ToUniversalTime().ToString('o')
  divisions = @($tracked.divisions)
  users = @($tracked.users)
  documents = @()
  auditLogs = @()
  notifications = @()
  employees = @($tracked.employees | Where-Object { $_.userId })
  directorySections = @($tracked.directorySections)
  systemSettings = $current.systemSettings
}

$json = $restored | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($currentPath, $json, [Text.UTF8Encoding]::new($false))
[pscustomobject]@{
  usersRestored = $restored.users.Count
  divisionsRestored = $restored.divisions.Count
  linkedPersonnelRestored = $restored.employees.Count
} | ConvertTo-Json
