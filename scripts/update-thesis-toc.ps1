param(
  [string]$InputPath = "output\CATRAL-TOM-TOM-FINAL-PREPARED.docx",
  [string]$OutputPath = "output\CATRAL-TOM-TOM-FINAL.docx"
)

$inputFull = (Resolve-Path $InputPath).Path
$outputFull = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$word = $null
$document = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($inputFull, $false, $false)

  $tocHeading = $null
  $listHeading = $null
  for ($index = 1; $index -le $document.Paragraphs.Count; $index++) {
    $label = $document.Paragraphs.Item($index).Range.Text.Trim([char]13, [char]7, ' ')
    if (-not $tocHeading -and $label -eq 'TABLE OF CONTENTS') { $tocHeading = $index; continue }
    if ($tocHeading -and $label -eq 'LIST OF TABLES') { $listHeading = $index; break }
  }
  if (-not $tocHeading -or -not $listHeading) { throw 'TABLE OF CONTENTS or LIST OF TABLES heading was not found.' }

  $start = $document.Paragraphs.Item($tocHeading).Range.End
  $end = $document.Paragraphs.Item($listHeading).Range.Start
  $document.Range($start, $end).Delete() | Out-Null
  $insert = $document.Range($start, $start)
  $toc = $document.TablesOfContents.Add($insert, $true, 1, 5, $false, '', $true, $true, '', $true, $true, $true)
  $toc.Update() | Out-Null
  $document.Fields.Update() | Out-Null
  $document.Repaginate()
  $toc.UpdatePageNumbers() | Out-Null
  $document.SaveAs2($outputFull, 16)
}
finally {
  if ($document) { $document.Close($false) }
  if ($word) { $word.Quit() }
  if ($toc) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($toc) }
  if ($document) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) }
  if ($word) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
