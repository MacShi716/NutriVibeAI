param([string]$BaseUrl = "http://127.0.0.1:3000")
# LLM 연결 상태 확인 스크립트
#
# 실행 중인 dev 서버에 레시피 생성 요청을 보내 실제 모델이 응답했는지(provider) 확인한다.
# API 키 값은 출력하지 않는다 - 파일에 키가 채워져 있는지 여부만 본다.
#
# usage:
#   powershell -File verify_llm_key.ps1
#   powershell -File verify_llm_key.ps1 -BaseUrl http://127.0.0.1:3001

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$root    = Split-Path $PSScriptRoot -Parent          # nutrivibe_build 의 상위 = 저장소 루트
$envFile = Join-Path $root 'app\.env.local'

if (-not (Test-Path $envFile)) {
    Write-Output "NG  app\.env.local 이 없습니다: $envFile"
    exit 2
}

$line = Select-String -Path $envFile -Pattern '^\s*GROQ_API_KEY\s*=\s*(\S+)' | Select-Object -First 1
$hasKey = [bool]$line
$keyLen = if ($hasKey) { $line.Matches[0].Groups[1].Value.Length } else { 0 }

if ($hasKey) {
    Write-Output ("KEY GROQ_API_KEY 설정됨 (길이 {0}자 / 값은 표시하지 않음)" -f $keyLen)
} else {
    Write-Output "KEY GROQ_API_KEY 미설정 - 이대로는 데모(mock) 모드로 동작합니다"
}

$body  = '{"ingredients":"닭가슴살, 양파","preferences":"","restrictions":"","servings":2,"cookMinutes":20,"goalCalories":600}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-WebRequest -Uri "$BaseUrl/api/recipes" -Method POST -Body $bytes `
        -ContentType 'application/json; charset=utf-8' -UseBasicParsing -TimeoutSec 120
    $sw.Stop()
} catch {
    Write-Output ("NG  요청 실패: " + $_.Exception.Message)
    Write-Output "    dev 서버가 켜져 있는지 확인하세요: cd app; npm run dev"
    exit 3
}

$json     = [System.Text.Encoding]::UTF8.GetString($res.RawContentStream.ToArray()) | ConvertFrom-Json
$provider = $json.provider
$usedMock = $json.usedMock
$count    = @($json.recipes).Count
$first    = @($json.recipes)[0].title
$warn     = @($json.warnings).Count

Write-Output ("HTTP {0}  provider={1}  usedMock={2}  recipes={3}  warnings={4}  elapsed={5:N1}s" -f `
    $res.StatusCode, $provider, $usedMock, $count, $warn, $sw.Elapsed.TotalSeconds)
Write-Output ("첫 레시피: " + $first)

if ($provider -eq 'mock') {
    Write-Output "판정: DEMO - 실제 모델 응답이 아닙니다 (키 미설정 또는 키/쿼터 문제)"
    if ($hasKey) { Write-Output "      키는 있는데 mock 으로 떨어졌으니 키 유효성과 무료 쿼터를 확인하세요" }
    exit 1
}

Write-Output "판정: REAL - 실제 모델이 응답했습니다"
exit 0
