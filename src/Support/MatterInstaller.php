<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 1.11.0 🧩 Matter 중계 — 윈도우 한 줄 설치 (프린터 라운지 MprLink 와 같은 방식: irm "주소" | iex)
 *  ① resources/matter/link.ps1 을 %LOCALAPPDATA%\3dsMatter 에 저장 (PowerShell 만 — 따로 깔 것 없음)
 *  ② Matter 서버에 붙는지 확인 (주소는 사이트 화면에서 적은 것 · 안 되면 물어봄)
 *  ③ 공유 코드로 센서 넣기 (회원이 직접 입력 · 건너뛰어도 됨)
 *  ④ 시작 프로그램에 등록하고 바로 시작 — 센서마다 사이트 기기는 연결 코드로 저절로 만들어짐
 * 스크립트에는 사이트 주소 · 그 회원의 연결 코드 · Matter 서버 주소만 들어감. MprLink 와 폴더 · 시작 프로그램 이름이 달라 서로 건드리지 않음.
 */
final class MatterInstaller
{
    public const DIR = '3dsMatter';

    private const PS = <<<'PS'
# 3D SUEÑO IoT 연결 — 🧩 Matter 중계 설치 (Windows)
# 사용: irm "이 주소" | iex        다시 설정: 같은 줄을 다시 실행
# 센서 넣기: powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\3dsMatter\link.ps1" -Pair
# 끄기: powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\3dsMatter\uninstall.ps1"
$ErrorActionPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
$Site = '__SITE__'
$Code = '__CODE__'
$Matter = '__MATTER__'
function Say($m) { Write-Host "[IoT 연결] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[IoT 연결] $m" -ForegroundColor Yellow }
function Stop-Mt { Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*3dsMatter*link.ps1*' -and $_.CommandLine -notlike '*-Pair*' -and $_.CommandLine -notlike '*-Nodes*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } }

$dir = Join-Path $env:LOCALAPPDATA '3dsMatter'; New-Item -ItemType Directory -Force $dir | Out-Null
$LinkCode = @'
__LINKPS__
'@
$linkFile = Join-Path $dir 'link.ps1'
[IO.File]::WriteAllText($linkFile, $LinkCode, (New-Object Text.UTF8Encoding($true)))
. $linkFile -Lib
$ErrorActionPreference = 'SilentlyContinue'

$o = Load-Cfg
$o.site = $Site; $o.code = $Code
if ($Matter) { $o.matter = $Matter }
Say '🧩 Matter 중계를 설치해요 — 집 안 Matter 서버의 온습도 센서를 사이트 IoT 연결로 보내요.'
# Matter 서버 확인 (붙어 보고 넣은 센서를 보여 줌)
while ($true) {
  if (-not $o.matter) { $o.matter = Read-Host 'Matter 서버 주소 (예: 192.168.0.10 — HA 의 Matter Server 애드온이면 HA 의 IP)'; if (-not $o.matter) { Warn '그만둘게요 — 같은 줄을 다시 실행하면 처음부터예요.'; return } }
  try { [void](Show-Nodes $o); break }
  catch {
    Warn "⚠️ $($_.Exception.Message)"
    Warn '   주소 · 포트(5580)가 맞는지, 그 기기가 켜져 있는지 봐 주세요. HA 의 Matter Server 애드온이면 애드온 › 구성 › 네트워크에서 5580 을 열어야 해요.'
    $o.matter = Read-Host '다시 적기 (Enter = 그만)'
    if (-not $o.matter) { return }
  }
}
Save-Cfg $o
# 센서 넣기 — 공유 코드는 회원이 직접 (이미 넣은 센서는 그대로 보냄)
Say '센서를 더 넣으려면 애플 홈(센서 › ⚙️ › 페어링 모드 켜기) · 구글 홈(연결된 Matter 앱 및 서비스) · SmartThings(다른 서비스와 공유)에서 코드를 받아 적어 주세요.'
while ($true) {
  $c = Read-Host '공유 코드 (Enter = 넘어가기)'
  if (-not $c) { break }
  [void](Do-Pair $o $c)
}

# 켤 때마다 저절로 — 「시작 프로그램」(관리자 권한 필요 없음) · 지금 바로 시작하고 정말 도는지 확인
$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) '3dsMatter.vbs'
$run = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $linkFile + '"'
[IO.File]::WriteAllText($vbs, 'CreateObject("WScript.Shell").Run "' + $run.Replace('"', '""') + '", 0, False', [Text.Encoding]::Unicode)
$un = @'
# 3D SUEÑO IoT 연결 — 🧩 Matter 중계 끄기 (사이트의 기기 · 기록과 Matter 서버의 센서는 그대로)
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*3dsMatter*link.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) '3dsMatter.vbs') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $env:LOCALAPPDATA '3dsMatter') -ErrorAction SilentlyContinue
Write-Host '[IoT 연결] 🧩 Matter 중계를 껐어요. (사이트의 기기 · 기록과 Matter 서버의 센서는 그대로예요)' -ForegroundColor Cyan
'@
[IO.File]::WriteAllText((Join-Path $dir 'uninstall.ps1'), $un, (New-Object Text.UTF8Encoding($true)))
Stop-Mt
Start-Sleep -Milliseconds 800
Start-Process -FilePath 'wscript.exe' -ArgumentList ('"' + $vbs + '"')
Start-Sleep -Seconds 3
if (Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*3dsMatter*link.ps1*' }) {
  Say '🟢 지금부터 보내요 — PC 를 켤 때마다 저절로 (시작 프로그램). 센서마다 사이트 IoT 연결의 📡 대기 칸에 기기가 생겨요.'
} else {
  Warn "⚠️ 중계가 시작되지 않았어요 — PC 를 다시 켜면 시작돼요. 지금 바로 하려면: wscript `"$vbs`""
}
Say "   센서 더 넣기: powershell -ExecutionPolicy Bypass -File `"$linkFile`" -Pair"
Say "   끄기: powershell -ExecutionPolicy Bypass -File `"$dir\uninstall.ps1`" · 마지막 결과: notepad `"$dir\last.txt`""
PS;

    /** 설치 한 줄의 본문 — $matter 는 회원이 사이트 화면에 적은 Matter 서버 주소 (비우면 설치 때 물어봄) */
    public static function ps1(string $site, string $code, string $matter = ''): string
    {
        return strtr(self::PS, ['__SITE__' => rtrim($site, '/'), '__CODE__' => preg_match('/^[a-f0-9]{32}$/', $code) ? $code : '', '__MATTER__' => self::matter($matter), '__LINKPS__' => self::file()]);
    }

    /** Matter 서버 주소만 (IP · 이름 · 포트 · ws://…/ws) — 따옴표 · 빈칸 같은 것은 빼서 스크립트를 깨지 않게 */
    public static function matter(string $v): string
    {
        $v = trim($v);

        return preg_match('#^(wss?://)?[A-Za-z0-9.\-]{1,80}(:\d{1,5})?(/ws)?$#', $v) || preg_match('#^(wss?://)?\[[0-9a-fA-F:]{2,60}\](:\d{1,5})?(/ws)?$#', $v) ? $v : '';
    }

    public static function file(): string
    {
        $s = (string) @file_get_contents(dirname(__DIR__, 2).'/resources/matter/link.ps1');
        $s = preg_replace('/^\xEF\xBB\xBF/', '', $s);

        return str_replace(["\r\n", "\n'@"], ["\n", "\n '@"], $s);   // here-string 이 일찍 닫히지 않게 (줄 맨 앞 '@ 는 없지만 혹시)
    }
}
