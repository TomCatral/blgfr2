param(
  [string]$TreasurersFile = 'C:\Users\USER\Downloads\Region_II_Treasurers_2026_Names_and_Verification.xlsx',
  [string]$DirectorsFile = 'C:\Users\USER\Downloads\Region_II_Regional_Directors_UPDATED_2026.xlsx'
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ColumnIndex([string]$reference) {
  $letters = ([regex]::Match($reference, '^[A-Z]+')).Value
  $index = 0
  foreach ($character in $letters.ToCharArray()) {
    $index = ($index * 26) + ([int]$character - [int][char]'A' + 1)
  }
  return $index - 1
}

function Read-XlsxRows([string]$path) {
  $archive = [IO.Compression.ZipFile]::OpenRead($path)
  try {
    $sharedStrings = @()
    $sharedEntry = $archive.GetEntry('xl/sharedStrings.xml')
    if ($sharedEntry) {
      $reader = [IO.StreamReader]::new($sharedEntry.Open())
      [xml]$sharedXml = $reader.ReadToEnd()
      $reader.Dispose()
      $sharedNs = [Xml.XmlNamespaceManager]::new($sharedXml.NameTable)
      $sharedNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
      foreach ($item in $sharedXml.SelectNodes('//x:si', $sharedNs)) {
        $sharedStrings += (($item.SelectNodes('.//x:t', $sharedNs) | ForEach-Object { $_.InnerText }) -join '')
      }
    }

    $sheetEntry = $archive.GetEntry('xl/worksheets/sheet1.xml')
    $reader = [IO.StreamReader]::new($sheetEntry.Open())
    [xml]$sheetXml = $reader.ReadToEnd()
    $reader.Dispose()
    $sheetNs = [Xml.XmlNamespaceManager]::new($sheetXml.NameTable)
    $sheetNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
    $rows = @()
    foreach ($rowNode in $sheetXml.SelectNodes('//x:sheetData/x:row', $sheetNs)) {
      $values = @{}
      foreach ($cell in $rowNode.SelectNodes('./x:c', $sheetNs)) {
        $index = Get-ColumnIndex $cell.r
        $valueNode = $cell.SelectSingleNode('./x:v', $sheetNs)
        $inlineNode = $cell.SelectSingleNode('./x:is/x:t', $sheetNs)
        $value = if ($cell.t -eq 's' -and $valueNode) {
          $sharedStrings[[int]$valueNode.InnerText]
        } elseif ($inlineNode) {
          $inlineNode.InnerText
        } elseif ($valueNode) {
          $valueNode.InnerText
        } else { '' }
        $values[$index] = [string]$value
      }
      $rows += ,$values
    }
    return $rows
  } finally {
    $archive.Dispose()
  }
}

function Convert-ToRecords($rows, [string]$kind) {
  if ($rows.Count -lt 2) { return @() }
  $headers = $rows[0]
  $headerLookup = @{}
  foreach ($key in $headers.Keys) { $headerLookup[[string]$headers[$key]] = [int]$key }
  $records = @()
  foreach ($row in $rows | Select-Object -Skip 1) {
    $get = { param($name) $index = $headerLookup[$name]; if ($null -eq $index) { return '' }; return ([string]$row[$index]).Trim() }
    if ($kind -eq 'treasurer') {
      $name = & $get 'Name (latest found)'
      if (!$name -or $name -match '^NOT PUBLICLY VERIFIED') { continue }
      $lguType = & $get 'LGU Type'
      $lgu = & $get 'LGU'
      $officeType = if ($lguType -eq 'Province') { 'PROVINCIAL_TREASURER' } elseif ($lguType -eq 'Municipality') { 'MUNICIPAL_TREASURER' } else { 'LGU' }
      $records += [ordered]@{
        fullName = $name
        position = (& $get 'Position')
        office = if ($lgu) { "$lgu $lguType Government" } else { $lguType }
        officeType = $officeType
        email = ''
        contactNo = ''
        address = (& $get 'LGU Address / Location')
        active = $true
        source = (& $get 'Source / Reference')
        verificationStatus = (& $get 'Verification Status')
        verificationNotes = (& $get 'Notes')
      }
    } else {
      $name = & $get 'Name'
      if (!$name) { continue }
      $records += [ordered]@{
        fullName = $name
        position = (& $get 'Position')
        office = (& $get 'Full agency name')
        officeType = 'OTHER_AGENCIES'
        email = ''
        contactNo = ''
        address = (& $get 'Office Address / Location')
        active = $true
        source = (& $get 'Source URL')
        verificationStatus = 'Listed in supplied 2026 regional directors workbook'
        verificationNotes = (& $get 'Verification notes')
      }
    }
  }
  return $records
}

$databasePath = Join-Path $PSScriptRoot '..\backend\data\blgf_doctrack_db.json'
$database = Get-Content $databasePath -Raw | ConvertFrom-Json
$incoming = @()
$incoming += Convert-ToRecords (Read-XlsxRows $TreasurersFile) 'treasurer'
$incoming += Convert-ToRecords (Read-XlsxRows $DirectorsFile) 'director'

$employees = @($database.employees)
$externalKeys = @{}
foreach ($employee in $employees) {
  if (!$employee.userId) {
    $key = "$($employee.fullName)|$($employee.officeType)|$($employee.office)".ToLowerInvariant()
    $externalKeys[$key] = $true
  }
}
$maxId = 0
foreach ($employee in $employees) {
  if ($employee.id -match '^EMP-(\d+)$') { $maxId = [Math]::Max($maxId, [int]$Matches[1]) }
}
$added = 0
$skipped = 0
foreach ($record in $incoming) {
  $key = "$($record.fullName)|$($record.officeType)|$($record.office)".ToLowerInvariant()
  if ($externalKeys.ContainsKey($key)) { $skipped++; continue }
  $maxId++
  $employee = [ordered]@{
    id = 'EMP-{0:D4}' -f $maxId
    fullName = $record.fullName
    position = $record.position
    office = $record.office
    officeType = $record.officeType
    email = $record.email
    contactNo = $record.contactNo
    address = $record.address
    active = $record.active
    createdAt = (Get-Date).ToUniversalTime().ToString('o')
    folders = @()
    source = $record.source
    verificationStatus = $record.verificationStatus
    verificationNotes = $record.verificationNotes
  }
  $employees += [pscustomobject]$employee
  $externalKeys[$key] = $true
  $added++
}
$database.employees = $employees
$database.updatedAt = (Get-Date).ToUniversalTime().ToString('o')
$json = $database | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText((Resolve-Path $databasePath), $json, [Text.UTF8Encoding]::new($false))

[pscustomobject]@{
  suppliedNamedRecords = $incoming.Count
  added = $added
  duplicatesSkipped = $skipped
  totalDirectoryRecords = $employees.Count
} | ConvertTo-Json
