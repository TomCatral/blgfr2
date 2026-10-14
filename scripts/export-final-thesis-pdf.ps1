param(
  [string]$InputPath = "output\CATRAL-TOM-TOM-FINAL.docx",
  [string]$OutputPath = "scratch\thesis-inspection\CATRAL-TOM-TOM-FINAL-preview.pdf"
)
$inputFull = (Resolve-Path $InputPath).Path
$outputFull = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($inputFull, $true, $true)
  $document.ExportAsFixedFormat($outputFull, 17)
}
finally {
  if ($document) { $document.Close($false) }
  if ($word) { $word.Quit() }
  if ($document) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
  if ($word) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
