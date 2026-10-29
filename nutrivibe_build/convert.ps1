# Usage: powershell -ExecutionPolicy Bypass -File convert.ps1 [-Docx <report.docx>] [-OutPdf <docx_preview.pdf>]
param([string]$Docx = '', [string]$OutPdf = '')
$ErrorActionPreference = 'Stop'
$name = if ($env:NV_REPORT_NAME) { $env:NV_REPORT_NAME } else { 'NutriVibeAI_report' }
$outDir = if ($env:NV_OUT_DIR) { $env:NV_OUT_DIR } else { Split-Path $PSScriptRoot -Parent }
if (-not $Docx) { $Docx = Join-Path $outDir ($name + '.docx') }
if (-not $OutPdf) { $OutPdf = Join-Path $PSScriptRoot 'docx_preview.pdf' }
$Docx = (Resolve-Path $Docx).Path
$OutPdf = [System.IO.Path]::GetFullPath($OutPdf)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
    $doc = $word.Documents.Open($Docx, $false, $true)
    $doc.ExportAsFixedFormat($OutPdf, 17)
    $doc.Close($false)
    Write-Output 'EXPORT_OK'
} catch {
    Write-Output ('ERROR: ' + $_.Exception.Message)
} finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}