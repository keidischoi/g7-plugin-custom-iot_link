<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 1.15.0 📨 MQTT 중계 — 한 줄 설치 (Matter 중계와 같은 방식: 윈도우 irm "주소" | iex · 리눅스 · 맥 curl -fsSL "주소" | bash)
 *  ① resources/mqtt/link.ps1 · link.py 를 %LOCALAPPDATA%\3dsMqtt · ~/.3ds-mqtt 에 저장 (PowerShell · python3 기본 기능만)
 *  ② 사이트에 적은 브로커 설정으로 붙어 보고 15초 동안 찾은 온습도 토픽을 보여 줌 (사이트 화면 「찾은 센서」에도)
 *  ③ 켤 때마다 저절로 시작 — 브로커 주소 · 계정은 이 PC 에 적지 않고 중계가 연결 코드로 사이트에서 받아 감 (사이트에서 바꾸면 30초 안에 다시 붙음)
 * 스크립트에는 사이트 주소 · 그 회원의 연결 코드만 들어감. Matter 중계 · MprLink 와 폴더 · 시작 프로그램 이름이 달라 서로 건드리지 않음.
 */
final class MqttInstaller
{
    public const DIR = '3dsMqtt';

    private const PS = <<<'PS'
# 3D SUEÑO IoT 연결 — 📨 MQTT 중계 설치 (Windows)
# 사용: irm "이 주소" | iex        다시 설정: 같은 줄을 다시 실행
# 찾은 토픽 보기: powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\3dsMqtt\link.ps1" -Scan
# 끄기: powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\3dsMqtt\uninstall.ps1"
$ErrorActionPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
$Site = '__SITE__'
$Code = '__CODE__'
function Say($m) { Write-Host "[IoT 연결] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[IoT 연결] $m" -ForegroundColor Yellow }
function Stop-Mq { Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*3dsMqtt*link.ps1*' -and $_.CommandLine -notlike '*-Scan*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force } }

$dir = Join-Path $env:LOCALAPPDATA '3dsMqtt'; New-Item -ItemType Directory -Force $dir | Out-Null
$LinkCode = @'
__LINKPS__
'@
$linkFile = Join-Path $dir 'link.ps1'
[IO.File]::WriteAllText($linkFile, $LinkCode, (New-Object Text.UTF8Encoding($true)))
. $linkFile -Lib
$ErrorActionPreference = 'SilentlyContinue'

$o = Load-Cfg
$o.site = $Site; $o.code = $Code
Save-Cfg $o
Say '📨 MQTT 중계를 설치해요 — 집 안 MQTT 브로커의 온습도 값을 사이트 IoT 연결로 보내요.'
try {
  $n = Scan-Topics $o 15
  if (-not $n) { Warn '아직 온습도 토픽이 안 보여요 — 센서가 값을 올리는 데 몇 분 걸릴 수 있어요 (중계는 계속 찾아요). 토픽은 사이트 › MQTT › ⚙️ 브로커 설정에서.' }
} catch {
  Warn "⚠️ $($_.Exception.Message)"
  if ($_.Exception.Message -like '*연결 코드*') { return }
  Warn '   사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정(주소 · 포트 · 계정)을 고치면 중계가 30초 안에 다시 붙어요.'
}

# 켤 때마다 저절로 — 「시작 프로그램」(관리자 권한 필요 없음) · 지금 바로 시작하고 정말 도는지 확인
$vbs = Join-Path ([Environment]::GetFolderPath('Startup')) '3dsMqtt.vbs'
$run = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $linkFile + '"'
[IO.File]::WriteAllText($vbs, 'CreateObject("WScript.Shell").Run "' + $run.Replace('"', '""') + '", 0, False', [Text.Encoding]::Unicode)
$un = @'
# 3D SUEÑO IoT 연결 — 📨 MQTT 중계 끄기 (사이트의 기기 · 기록과 브로커는 그대로)
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*3dsMqtt*link.ps1*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Remove-Item (Join-Path ([Environment]::GetFolderPath('Startup')) '3dsMqtt.vbs') -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force (Join-Path $env:LOCALAPPDATA '3dsMqtt') -ErrorAction SilentlyContinue
Write-Host '[IoT 연결] 📨 MQTT 중계를 껐어요. (사이트의 기기 · 기록과 브로커는 그대로예요)' -ForegroundColor Cyan
'@
[IO.File]::WriteAllText((Join-Path $dir 'uninstall.ps1'), $un, (New-Object Text.UTF8Encoding($true)))
Stop-Mq
Start-Sleep -Milliseconds 800
Start-Process -FilePath 'wscript.exe' -ArgumentList ('"' + $vbs + '"')
Start-Sleep -Seconds 3
if (Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" | Where-Object { $_.CommandLine -like '*3dsMqtt*link.ps1*' }) {
  Say '🟢 지금부터 중계해요 — PC 를 켤 때마다 저절로 (시작 프로그램). 사이트 IoT 연결 › MQTT 의 「찾은 센서」에서 받을 것을 골라 주세요.'
} else {
  Warn "⚠️ 중계가 시작되지 않았어요 — PC 를 다시 켜면 시작돼요. 지금 바로 하려면: wscript `"$vbs`""
}
Say "   찾은 토픽 보기: powershell -ExecutionPolicy Bypass -File `"$linkFile`" -Scan"
Say "   끄기: powershell -ExecutionPolicy Bypass -File `"$dir\uninstall.ps1`" · 마지막 결과: notepad `"$dir\last.txt`""
PS;

    /** 윈도우 한 줄의 본문 */
    public static function ps1(string $site, string $code): string
    {
        return strtr(self::PS, ['__SITE__' => rtrim($site, '/'), '__CODE__' => preg_match('/^[a-f0-9]{32}$/', $code) ? $code : '', '__LINKPS__' => self::file()]);
    }

    public static function file(string $name = 'link.ps1'): string
    {
        $s = (string) @file_get_contents(dirname(__DIR__, 2).'/resources/mqtt/'.$name);
        $s = str_replace("\r\n", "\n", (string) preg_replace('/^\xEF\xBB\xBF/', '', $s));

        return $name === 'link.ps1' ? str_replace("\n'@", "\n '@", $s) : $s;   // here-string 이 일찍 닫히지 않게
    }

    /** 리눅스 · 맥 · 라즈베리파이 — curl -fsSL "주소" | bash (python3 기본 기능만 · systemd → 없으면 crontab · 맥은 launchd) */
    private const SH = <<<'BASH'
#!/usr/bin/env bash
# 3D SUEÑO IoT 연결 — 📨 MQTT 중계 설치 (리눅스 · 맥 · 라즈베리파이)
# 사용: curl -fsSL "이 주소" | bash        다시 설정: 같은 줄을 다시 실행
# 찾은 토픽 보기: python3 ~/.3ds-mqtt/link.py --scan        끄기: bash ~/.3ds-mqtt/uninstall.sh
set -u
SITE='__SITE__'
CODE='__CODE__'
DIR="$HOME/.3ds-mqtt"
say() { printf '\033[1;36m[IoT 연결]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[IoT 연결]\033[0m %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1; }
if ! need python3; then
  if [ "$(uname)" = Darwin ]; then warn "python3 가 필요해요: xcode-select --install 뒤 같은 줄을 다시 실행해 주세요."
  else warn "python3 가 필요해요: sudo apt install -y python3 (라즈베리파이 OS · 우분투) 뒤 같은 줄을 다시 실행해 주세요."; fi
  exit 1
fi
PY="$(command -v python3)"
mkdir -p "$DIR" && chmod 700 "$DIR"
cat > "$DIR/link.py" <<'PYEOF'
__LINKPY__
PYEOF
"$PY" "$DIR/link.py" --setup "$SITE" "$CODE" || exit 1
RUN="$PY $DIR/link.py"

# 켤 때마다 저절로 — 맥: launchd · 리눅스: systemd(sudo 가 되면) → 아니면 crontab
if [ "$(uname)" = Darwin ]; then
  PL="$HOME/Library/LaunchAgents/me.3ds.mqtt.plist"; mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PL" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>me.3ds.mqtt</string>
<key>ProgramArguments</key><array><string>$PY</string><string>$DIR/link.py</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>/dev/null</string><key>StandardErrorPath</key><string>/dev/null</string>
</dict></plist>
EOF
  launchctl unload "$PL" 2>/dev/null; launchctl load -w "$PL"
  MODE=launchd; S=""
  say "시작했어요 (맥을 켤 때마다 저절로 — launchd)."
elif need systemctl && { [ "$(id -u)" = 0 ] || sudo -n true 2>/dev/null; }; then
  S=""; [ "$(id -u)" != 0 ] && S="sudo"
  $S tee /etc/systemd/system/3ds-mqtt.service >/dev/null <<EOF
[Unit]
Description=3D SUENO IoT MQTT relay
After=network-online.target
Wants=network-online.target
[Service]
ExecStart=$RUN
Restart=always
RestartSec=10
User=$(id -un)
[Install]
WantedBy=multi-user.target
EOF
  $S systemctl daemon-reload && $S systemctl enable 3ds-mqtt.service >/dev/null 2>&1 && $S systemctl restart 3ds-mqtt.service
  MODE=systemd
  say "서비스로 등록했어요 (켤 때마다 저절로 — systemd)."
else
  ( crontab -l 2>/dev/null | grep -v 3ds-mqtt; echo "@reboot sleep 30 && nohup $RUN >/dev/null 2>&1 & # 3ds-mqtt" ) | crontab - 2>/dev/null
  pkill -f "$DIR/link.py" 2>/dev/null; sleep 1
  nohup $RUN >/dev/null 2>&1 &
  MODE=cron; S=""
  say "시작했어요 (켤 때마다 저절로 — crontab)."
fi
printf 'S=%q\nMODE=%q\n' "${S:-}" "$MODE" > "$DIR/svc.env"
cat > "$DIR/uninstall.sh" <<'UNEOF'
#!/usr/bin/env bash
# 3D SUEÑO IoT 연결 — 📨 MQTT 중계 끄기 (사이트의 기기 · 기록과 브로커는 그대로)
DIR="$(cd "$(dirname "$0")" && pwd)"
S=""; MODE=cron
. "$DIR/svc.env" 2>/dev/null
case "$MODE" in
  launchd) PL="$HOME/Library/LaunchAgents/me.3ds.mqtt.plist"; launchctl unload "$PL" 2>/dev/null; rm -f "$PL" ;;
  systemd) $S systemctl disable --now 3ds-mqtt.service; $S rm -f /etc/systemd/system/3ds-mqtt.service; $S systemctl daemon-reload ;;
  *) pkill -f "$DIR/link.py"; crontab -l 2>/dev/null | grep -v 3ds-mqtt | crontab - ;;
esac
rm -rf "$DIR"
printf '\033[1;36m[IoT 연결]\033[0m %s\n' "📨 MQTT 중계를 껐어요. (사이트의 기기 · 기록과 브로커는 그대로예요)"
UNEOF
chmod +x "$DIR/uninstall.sh"
sleep 3
if pgrep -f "$DIR/link.py" >/dev/null 2>&1; then
  say "🟢 지금부터 중계해요 — 사이트 IoT 연결 › MQTT 의 「찾은 센서」에서 받을 것을 골라 주세요."
else
  warn "⚠️ 중계가 시작되지 않았어요 — 마지막 결과: cat $DIR/last.txt · 직접 켜 보기: $RUN"
fi
say "   찾은 토픽 보기: python3 $DIR/link.py --scan · 끄기: bash $DIR/uninstall.sh · 마지막 결과: cat $DIR/last.txt"
BASH;

    /** 리눅스 · 맥 한 줄의 본문 (bash) */
    public static function sh(string $site, string $code): string
    {
        return strtr(self::SH, ['__SITE__' => rtrim($site, '/'), '__CODE__' => preg_match('/^[a-f0-9]{32}$/', $code) ? $code : '', '__LINKPY__' => self::file('link.py')]);
    }
}
