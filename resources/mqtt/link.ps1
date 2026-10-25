# 3D SUEÑO IoT 연결 — 📨 MQTT 중계 (Windows · PowerShell 만 — 따로 깔 것 없음)
#  집 안 MQTT 브로커(Mosquitto · EMQX · HA 의 Mosquitto 애드온)에 올라오는 온습도 값(Zigbee2MQTT · Tasmota · Shelly · ESPHome …)을 사이트 IoT 연결로 보냄
#  브로커 주소 · 포트 · 계정 · 토픽은 사이트 화면(IoT 연결 › MQTT)에서 정함 — 중계는 연결 코드로 그 설정을 받아 감 (30초마다 · 바꾸면 다시 붙음)
#  찾은 온습도 토픽은 사이트 화면에 목록으로 · 회원이 「받기」를 누른 것만 받는 주소 /in/{키} 에 보냄 — 보내는 규칙은 리눅스판(link.py)과 같음
#  돌기: powershell -File link.ps1        찾은 토픽 보기: … link.ps1 -Scan        블루투스 끄기: … -NoBle
#  1.16.0 📶 이 PC 의 블루투스로 주변 온습도계(BTHome · 샤오미 ATC · Govee · SwitchBot · Inkbird)도 바로 들음 — 브로커가 없어도 됨
#  -Lib 로 불러오면 함수만 (설치 스크립트가 씀) · 마지막 결과는 last.txt
param([switch]$Lib, [switch]$Scan, [switch]$NoBle)
$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
$script:Dir = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path $env:LOCALAPPDATA '3dsMqtt' }
$script:Cfg = Join-Path $script:Dir 'config.json'
$script:Inv = [Globalization.CultureInfo]::InvariantCulture
$script:Ver = '1.16.0'
$script:MaxSeen = 150; $script:MaxBody = 16384; $script:SyncSec = 30
$script:NoCheck = [Net.Security.RemoteCertificateValidationCallback] { $true }   # 집 안 브로커는 보통 스스로 만든 인증서

function Log($m) { try { Set-Content -Encoding UTF8 (Join-Path $script:Dir 'last.txt') "$(Get-Date -Format s) $m" } catch {} }
function Mono { return [Diagnostics.Stopwatch]::GetTimestamp() / [Diagnostics.Stopwatch]::Frequency }

# ── JSON (PowerShell 5.1 의 ConvertFrom-Json 대신 .NET 직렬 변환기 · PowerShell 7 은 -AsHashtable)
function Parse-Json([string]$s) {
  try {
    Add-Type -AssemblyName System.Web.Extensions
    $j = New-Object Web.Script.Serialization.JavaScriptSerializer
    $j.MaxJsonLength = [int]::MaxValue; $j.RecursionLimit = 256
    return $j.DeserializeObject($s)
  } catch { return ($s | ConvertFrom-Json -AsHashtable) }
}
function Q([string]$s) { return '"' + ($s -replace '\\', '\\' -replace '"', '\"' -replace "`r", '\r' -replace "`n", '\n') + '"' }
function Num($v) { return ([double]$v).ToString('0.##', $script:Inv) }
function To-Json($o) {
  if ($null -eq $o) { return 'null' }
  if ($o -is [bool]) { if ($o) { return 'true' } else { return 'false' } }
  if ($o -is [string]) { return (Q $o) }
  if ($o -is [int] -or $o -is [long] -or $o -is [double] -or $o -is [decimal]) { return (Num $o) }
  if ($o -is [Collections.IDictionary]) { return '{' + ((@($o.Keys) | ForEach-Object { (Q ([string]$_)) + ':' + (To-Json $o[$_]) }) -join ',') + '}' }
  if ($o -is [Collections.IEnumerable]) { return '[' + ((@($o) | ForEach-Object { To-Json $_ }) -join ',') + ']' }
  return (Q ([string]$o))
}
function Get-K($d, $k) { if ($d -is [Collections.IDictionary]) { return $d[$k] } ; return $null }

# ── 설정 (이 PC 에는 사이트 · 연결 코드 · 중계 이름만 — 브로커 계정은 사이트에서 받아 메모리에만)
function Load-Cfg {
  $c = @{}
  if (Test-Path $script:Cfg) { try { $c = Parse-Json ([IO.File]::ReadAllText($script:Cfg)) } catch {} }
  $o = @{ site = [string](Get-K $c 'site'); code = [string](Get-K $c 'code'); server_id = [string](Get-K $c 'server_id'); server_name = [string](Get-K $c 'server_name') }
  if (-not $o.server_id) { $o.server_id = 'mqtt' + ([guid]::NewGuid().ToString('N').Substring(0, 24)) }
  if (-not $o.server_name) { $o.server_name = "$env:COMPUTERNAME (Windows)" }
  if ($o.site -and -not ((Get-K $c 'server_id') -and (Get-K $c 'server_name'))) { try { Save-Cfg $o } catch {} }   # 중계 ID 는 한 번 정하면 그대로
  return $o
}
function Save-Cfg($o) { [IO.File]::WriteAllText($script:Cfg, (To-Json $o), (New-Object Text.UTF8Encoding($false))) }

# ── 사이트 (HttpWebRequest — 오류 답의 본문도 읽음)
function Site-Req($o, [string]$method, [string]$path, $body) {
  $req = [Net.HttpWebRequest]::Create($o.site.TrimEnd('/') + '/api/plugins/custom-iot_link/' + $path)
  $req.Method = $method; $req.Timeout = 20000; $req.ReadWriteTimeout = 20000; $req.UserAgent = "3ds-mqtt-ps/$script:Ver"; $req.Accept = 'application/json'
  $req.Headers.Add('X-G7-Via', 'mqtt'); $req.Headers.Add('X-G7-Server', $o.server_id); $req.Headers.Add('X-G7-Server-Name', [uri]::EscapeDataString($o.server_name))
  if ($null -ne $body) {
    $b = [Text.Encoding]::UTF8.GetBytes((To-Json $body)); $req.ContentType = 'application/json'; $req.ContentLength = $b.Length
    $s = $req.GetRequestStream(); $s.Write($b, 0, $b.Length); $s.Close()
  }
  try { $res = $req.GetResponse() } catch [Net.WebException] { $res = $_.Exception.Response; if (-not $res) { throw } }
  try { $txt = (New-Object IO.StreamReader($res.GetResponseStream(), [Text.Encoding]::UTF8)).ReadToEnd(); $code = [int]$res.StatusCode } finally { $res.Close() }
  $j = $null; try { $j = Parse-Json $txt } catch {}
  return @{ status = $code; json = $j }
}
# 사이트와 맞춤 — 찾은 토픽을 알리고, 브로커 설정 · 고른 토픽(키 → 받는 키) · 보내는 규칙을 받아 옴
function Sync-Site($o, $seen, [string]$broker) {
  $r = Site-Req $o 'POST' "hub/$($o.code)/mqtt" @{ seen = @($seen); broker = $broker; ble = $script:Ble; ver = $script:Ver }
  if ($r.status -eq 404) { throw [UnauthorizedAccessException]'연결 코드가 맞지 않아요 — 사이트 IoT 연결 › MQTT 에서 한 줄을 새로 복사해 다시 설치해 주세요.' }
  if ($r.status -ge 400 -or (Get-K $r.json 'config') -isnot [Collections.IDictionary]) { throw "사이트가 답하지 않아요 ($($r.status))" }
  return $r.json
}

# ── MQTT 3.1.1 (구독만 · QoS 0)
function MStr([string]$s) { $b = [Text.Encoding]::UTF8.GetBytes($s); , [byte[]](@([byte]($b.Length -shr 8), [byte]($b.Length -band 255)) + $b) }
function MLen([int]$n) { $o = New-Object Collections.Generic.List[byte]; do { $d = $n % 128; $n = [math]::Floor($n / 128); if ($n -gt 0) { $d = $d -bor 128 }; $o.Add([byte]$d) } while ($n -gt 0); , $o.ToArray() }
function MPkt([int]$t, [byte[]]$body) { , [byte[]](@([byte]$t) + (MLen $body.Length) + $body) }
function SendB($m, [byte[]]$b) { $m.S.Write($b, 0, $b.Length); $m.S.Flush(); $m.Tx = Mono }
function ReadN($s, [int]$n) { $b = New-Object byte[] $n; $o = 0; while ($o -lt $n) { $r = $s.Read($b, $o, $n - $o); if ($r -le 0) { throw '브로커 연결이 끊겼어요' }; $o += $r }; , $b }
# 패킷 하나 (첫 바이트를 $ms 동안만 기다림 — 안 오면 $null, 읽던 것은 다음에 이어서) · 30초 조용하면 PINGREQ
function MRead($m, [int]$ms) {
  if ((Mono) - $m.Tx -gt 30) { SendB $m ([byte[]](0xC0, 0)) }
  if (-not $m.Pend) { $m.One = New-Object byte[] 1; $m.Pend = $m.S.ReadAsync($m.One, 0, 1) }
  if (-not $m.Pend.Wait($ms)) { return $null }
  $n = $m.Pend.Result; $m.Pend = $null
  if ($n -le 0) { throw '브로커 연결이 끊겼어요' }
  $h = $m.One[0]; $len = 0; $mul = 1
  do { $d = (ReadN $m.S 1)[0]; $len += ($d -band 127) * $mul; $mul *= 128 } while ($d -band 128)
  $body = if ($len -gt 0) { ReadN $m.S $len } else { [byte[]]@() }
  @{ Type = ($h -shr 4); Flags = ($h -band 15); Body = $body }
}
$script:Connack = @{ 1 = '브로커가 MQTT 3.1.1 을 받지 않아요'; 2 = '브로커가 중계 이름을 거절했어요'; 3 = '브로커가 지금 연결을 받지 않아요'; 4 = '사용자 이름 · 비밀번호가 맞지 않아요'; 5 = '이 계정은 브로커에 붙을 수 없어요 (허락 안 됨)' }
function Mq-Open($c) {
  $h = [string](Get-K $c 'host'); $port = [int](Get-K $c 'port'); if ($port -le 0) { $port = 1883 }
  if (-not $h) { throw '브로커 주소가 아직 없어요 — 사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정에서 적어 주세요.' }
  $t = New-Object Net.Sockets.TcpClient
  $ok = $false; try { $ok = $t.ConnectAsync($h, $port).Wait(10000) -and $t.Connected } catch {}
  if (-not $ok) { $t.Close(); throw "브로커($($h):$port)에 닿지 않아요 — 주소 · 포트 · 방화벽을 확인해 주세요." }
  $s = $t.GetStream()
  if (Get-K $c 'tls') { $s = New-Object Net.Security.SslStream($s, $false, $script:NoCheck); $s.AuthenticateAsClient($h, $null, [Security.Authentication.SslProtocols]::Tls12, $false) }
  $m = @{ T = $t; S = $s; Pend = $null; One = $null; Tx = (Mono) }
  $user = [string](Get-K $c 'user'); $pw = [string](Get-K $c 'pass')
  $flags = 2; $pay = [byte[]](MStr ('3ds-' + ([guid]::NewGuid().ToString('N').Substring(0, 12))))
  if ($user) { $flags = $flags -bor 0x80; $pay = [byte[]]($pay + (MStr $user)); if ($pw) { $flags = $flags -bor 0x40; $pay = [byte[]]($pay + (MStr $pw)) } }
  SendB $m (MPkt 0x10 ([byte[]]((MStr 'MQTT') + @([byte]4, [byte]$flags, 0, 60) + $pay)))
  $p = MRead $m 10000
  if (-not $p -or $p.Type -ne 2) { Mq-Close $m; throw "MQTT 브로커가 아닌 것 같아요 ($($h):$port)" }
  if ($p.Body.Length -gt 1 -and $p.Body[1] -ne 0) { $rc = [int]$p.Body[1]; Mq-Close $m; $why = $script:Connack[$rc]; if (-not $why) { $why = "브로커가 거절했어요 (코드 $rc)" }; throw [UnauthorizedAccessException]$why }
  $tops = @(@(Get-K $c 'topics') | Where-Object { $_ -and ([string]$_).Trim() }); if (-not $tops.Count) { $tops = @('#') }
  $sb = [byte[]]@(0, 1); foreach ($tp in $tops) { $sb = [byte[]]($sb + (MStr ([string]$tp).Trim()) + @([byte]0)) }
  SendB $m (MPkt 0x82 $sb)
  return $m
}
function Mq-Close($m) { try { SendB $m ([byte[]](0xE0, 0)) } catch {} ; try { $m.T.Close() } catch {} }
# PUBLISH → @{ Topic; Raw(바이트) } · QoS 1 이면 받았다고 답함
function Mq-Publish($m, $p) {
  $b = $p.Body; $tl = $b[0] * 256 + $b[1]
  $topic = [Text.Encoding]::UTF8.GetString($b, 2, $tl); $i = 2 + $tl
  if ((($p.Flags -shr 1) -band 3) -gt 0) { SendB $m ([byte[]](0x40, 2, $b[$i], $b[$i + 1])); $i += 2 }
  $raw = if ($b.Length -gt $i) { [byte[]]$b[$i..($b.Length - 1)] } else { [byte[]]@() }
  return @{ Topic = $topic; Raw = $raw }
}

# ── 토픽 값 → 온도 · 습도 (Zigbee2MQTT · Tasmota · Shelly · ESPHome · HA statestream · 숫자 하나 — link.py 와 같은 규칙)
$script:TK = @('temperature', 'temp', 'tempc', 'temp_c', 'temperature_c', 'tc', 'chamber_temper', 'air_temperature', 'current_temperature')
$script:HK = @('humidity', 'hum', 'rh', 'relative_humidity', 'humidity_percent', 'current_humidity')
$script:Stop = @('zigbee2mqtt', 'tele', 'stat', 'sensor', 'sensors', 'state', 'status', 'shellies', 'homeassistant', 'events', 'rpc', 'report', 'device', 'devices', 'temperature', 'humidity', 'temp', 'hum', 'json', 'data', 'value', 'esphome', 'tasmota')
function To-Num($v) {
  if ($v -is [bool] -or $null -eq $v) { return $null }
  if ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) { return [double]$v }
  if ($v -is [string] -and $v -match '^\s*-?\d+(\.\d+)?\s*$') { return [double]::Parse($v.Trim(), $script:Inv) }
  return $null
}
function Val-Ok([string]$f, $v) { if ($null -eq $v) { return $false }; if ($f -eq 'temperature') { return $v -ge -40 -and $v -le 150 }; return $v -ge 0 -and $v -le 100 }
function Find-Vals($d, [int]$depth = 0) {
  $out = @{}
  foreach ($k in @($d.Keys)) {
    $kk = ([string]$k -replace ':\d+$', '').ToLower()
    $f = if ($script:TK -contains $kk) { 'temperature' } elseif ($script:HK -contains $kk) { 'humidity' } else { $null }
    if ($f -and -not $out.Contains($f)) { $x = To-Num $d[$k]; if (Val-Ok $f $x) { $out[$f] = [Math]::Round($x, 1) } }
  }
  if ($depth -lt 3 -and $out.Count -lt 2) {
    foreach ($k in @($d.Keys)) { $v = $d[$k]; if ($v -is [Collections.IDictionary]) { $sub = Find-Vals $v ($depth + 1); foreach ($f in @($sub.Keys)) { if (-not $out.Contains($f)) { $out[$f] = $sub[$f] } } } }
  }
  return $out
}
function Skip-Topic([string]$t) { return $t.StartsWith('$') -or $t -match '/(config|set|get|availability|LWT|lwt)$' -or $t.StartsWith('zigbee2mqtt/bridge') -or $t.Contains('/bridge/') }
# 돌려줌: @(@{ key; vals }) — 값이 없으면 빈 목록
function Parse-Msg([string]$topic, [byte[]]$raw) {
  if ((Skip-Topic $topic) -or $raw.Length -gt $script:MaxBody) { return @() }
  $s = [Text.Encoding]::UTF8.GetString($raw).Trim()
  if ($s.StartsWith('{') -or $s.StartsWith('[')) {
    try { $j = Parse-Json $s } catch { return @() }
    if ($j -is [Collections.IDictionary]) { $v = Find-Vals $j; if ($v.Count) { return @(@{ key = $topic; vals = $v }) } }
    return @()
  }
  $x = To-Num $s; if ($null -eq $x) { return @() }
  $parts = $topic -split '/'; if ($parts.Count -lt 2) { return @() }
  $last = ($parts[-1] -replace ':\d+$', '').ToLower()
  if ($script:TK -contains $last -or $script:HK -contains $last) {
    $f = if ($script:TK -contains $last) { 'temperature' } else { 'humidity' }
    if (Val-Ok $f $x) { return @(@{ key = ($parts[0..($parts.Count - 2)] -join '/'); vals = @{ $f = [Math]::Round($x, 1) } }) }
    return @()
  }
  if ($last -eq 'state') {   # HA statestream: homeassistant/sensor/<이름>/state
    $prev = $parts[-2].ToLower()
    $f = if ($prev.Contains('temp')) { 'temperature' } elseif ($prev.Contains('humid')) { 'humidity' } else { $null }
    if ($f -and (Val-Ok $f $x)) { return @(@{ key = $topic; vals = @{ $f = [Math]::Round($x, 1) } }) }
  }
  return @()
}
function Name-Of([string]$key) {
  $p = @($key -split '/' | Where-Object { $_ -and $script:Stop -notcontains $_.ToLower() })
  $n = if ($p.Count) { ($p | Select-Object -Last 2) -join ' ' } else { $key }
  return $n.Substring(0, [Math]::Min(60, $n.Length))
}
function Seen-Name([string]$k) { if ($script:BleNames.Contains($k)) { return $script:BleNames[$k] }; return (Name-Of $k) }
function Seen-Row([string]$k, $v) { $r = [ordered]@{ key = $k; name = (Seen-Name $k) }; foreach ($f in @('temperature', 'humidity')) { if ($v.Contains($f)) { $r[$f] = $v[$f] } }; return $r }

# ── 사이트로 보내기 (변하면 보내기 + 최소 간격 + 정해진 주기, 사이트의 답을 따름 — Matter 중계와 같음)
function New-Pusher([string]$key, [string]$token, [double]$first) {
  return @{ key = $key; token = $token; values = @{}; sent = @{}; last = 0.0; next = (Mono) + $first; pending = $null; mode = 'change'; dh = 1.0; dt = 0.5; gap = 60; interval = 10 }
}
function Pusher-Update($p, $vals) {
  foreach ($k in @($vals.Keys)) { $p.values[$k] = $vals[$k] }
  if ($p.mode -ne 'change' -or $null -ne $p.pending) { return }
  $moved = $false
  foreach ($k in @('humidity', 'temperature')) {
    if (-not $vals.Contains($k)) { continue }
    $d = if ($k -eq 'humidity') { $p.dh } else { $p.dt }
    if (-not $p.sent.Contains($k) -or [Math]::Abs($vals[$k] - $p.sent[$k]) -ge $d) { $moved = $true }
  }
  if ($moved) { $p.pending = (Mono) + [Math]::Max(2.0, $p.gap - ((Mono) - $p.last)) }
}
function Pusher-Apply($p, $a) {
  if ($a -isnot [Collections.IDictionary]) { return }
  $md = [string](Get-K $a 'send_mode'); if ($md -eq 'change' -or $md -eq 'interval') { $p.mode = $md }
  $v = Get-K $a 'change_hum'; if ($v -and [double]$v -gt 0) { $p.dh = [double]$v }
  $v = Get-K $a 'change_temp'; if ($v -and [double]$v -gt 0) { $p.dt = [double]$v }
  $v = Get-K $a 'gap_sec'; if ($null -ne $v) { $p.gap = [Math]::Max(10, [int]$v) }
  $v = Get-K $a 'next_min'; if ($v -and [int]$v -ge 1 -and [int]$v -ne $p.interval) { $p.interval = [int]$v; $p.next = [Math]::Min($p.next, (Mono) + $p.interval * 60) }
}
# 돌려줌: 'ok' · 'unknown'(사이트가 키를 모름 — 지운 기기) · 'fail'
function Pusher-Push($o, $p) {
  $p.pending = $null; $p.last = Mono; $p.next = $p.last + $p.interval * 60
  foreach ($k in @($p.values.Keys)) { $p.sent[$k] = $p.values[$k] }
  try {
    $r = Site-Req $o 'POST' "in/$($p.token)" $p.values
    if ($r.status -eq 404 -and (Get-K $r.json 'message') -eq 'unknown') { return 'unknown' }
    if ($r.status -ge 400) { Log "$($p.key): 사이트가 값을 받지 않았어요 ($($r.status))"; return 'fail' }
    Pusher-Apply $p $r.json
    Log "$($p.key): 보냄 온도 $(Get-K $p.values 'temperature') · 습도 $(Get-K $p.values 'humidity')"
    return 'ok'
  } catch { Log "$($p.key): 보내지 못했어요 — $($_.Exception.Message)"; return 'fail' }
}

# ── 1.16.0 📶 블루투스 온습도계 — 이 PC 의 블루투스로 주변 센서가 흘려보내는 값(광고)을 바로 들음 (짝짓기 · 앱 없이)
#  읽는 것: BTHome v2 · 샤오미 ATC/pvvx 펌웨어 · 샤오미 MiBeacon(암호 없는 것) · Govee H5072/H5074/H5075 · SwitchBot 온습도계 · Inkbird IBS-TH
#  PowerShell 5.1 은 WinRT 이벤트를 못 받아 — 윈도우에 늘 있는 .NET csc.exe 로 작은 도우미(Ble3ds.dll)를 이 폴더에 한 번 만들어 씀
#  찾은 것은 토픽처럼 키 ble/<MAC> 로 사이트 「찾은 센서」에 — 「받기」를 누른 것만 보냄 (MQTT 와 같은 길)
$script:Ble = 'off'; $script:BleNames = @{}
$script:BleSrc = @"
using System;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.Globalization;
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Storage.Streams;
public static class Ble3ds {
  public static ConcurrentQueue<string> Q = new ConcurrentQueue<string>();
  static BluetoothLEAdvertisementWatcher w;
  static ConcurrentDictionary<ulong, string> names = new ConcurrentDictionary<ulong, string>();
  public static string Start() {
    if (w == null) { w = new BluetoothLEAdvertisementWatcher(); w.ScanningMode = BluetoothLEScanningMode.Active; w.Received += OnAdv; }
    w.Start();
    return w.Status.ToString();
  }
  public static string Status() { return w == null ? "None" : w.Status.ToString(); }
  public static void Stop() { if (w != null) w.Stop(); }
  static void OnAdv(BluetoothLEAdvertisementWatcher s, BluetoothLEAdvertisementReceivedEventArgs a) {
    try {
      string nm = a.Advertisement.LocalName;
      if (!string.IsNullOrEmpty(nm)) names[a.BluetoothAddress] = nm; else if (!names.TryGetValue(a.BluetoothAddress, out nm)) nm = "";
      var secs = new List<KeyValuePair<byte, byte[]>>();
      foreach (var d in a.Advertisement.DataSections) { var b = new byte[d.Data.Length]; DataReader.FromBuffer(d.Data).ReadBytes(b); secs.Add(new KeyValuePair<byte, byte[]>(d.DataType, b)); }
      string r = Decode(secs, nm);
      if (r != null && Q.Count < 2000) Q.Enqueue(a.BluetoothAddress.ToString("X12") + "|" + nm.Replace("|", " ") + "|" + a.RawSignalStrengthInDBm + "|" + r);
    } catch { }
  }
  // 시험용 — "16:D2FC40… FF:88EC…" (종류:16진수)
  public static string DecodeHex(string secs, string name) {
    var l = new List<KeyValuePair<byte, byte[]>>();
    foreach (var p in secs.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries)) {
      var kv = p.Split(':'); var b = new byte[kv[1].Length / 2];
      for (int i = 0; i < b.Length; i++) b[i] = Convert.ToByte(kv[1].Substring(i * 2, 2), 16);
      l.Add(new KeyValuePair<byte, byte[]>(Convert.ToByte(kv[0], 16), b));
    }
    return Decode(l, name);
  }
  // 돌려줌: "종류|온도|습도" (없는 값은 빈칸) · 못 읽으면 null
  public static string Decode(List<KeyValuePair<byte, byte[]>> secs, string name) {
    foreach (var s in secs) {
      byte[] d = s.Value; string r = null;
      if (s.Key == 0x16 && d.Length >= 2) {
        int uuid = d[0] | (d[1] << 8); byte[] p = Sub(d, 2);
        if (uuid == 0xFCD2) r = BtHome(p);
        else if (uuid == 0x181A) r = Atc(p);
        else if (uuid == 0xFE95) r = Mi(p);
        else if (uuid == 0x0D00 || uuid == 0xFD3D) r = SwitchBot(p);
      } else if (s.Key == 0xFF && d.Length >= 2) {
        int co = d[0] | (d[1] << 8);
        if (co == 0xEC88) r = Govee(Sub(d, 2));
        else if ((name == "sps" || name == "tps") && d.Length >= 4) r = Fmt("Inkbird", (short)(d[0] | d[1] << 8) / 100.0, (d[2] | d[3] << 8) / 100.0);
      }
      if (r != null) return r;
    }
    return null;
  }
  static byte[] Sub(byte[] d, int i) { var o = new byte[Math.Max(0, d.Length - i)]; Array.Copy(d, i, o, 0, o.Length); return o; }
  static string N(double? v) { return v == null ? "" : Math.Round(v.Value, 1).ToString(CultureInfo.InvariantCulture); }
  static string Fmt(string kind, double? t, double? h) {
    if (t != null && (t < -40 || t > 150)) t = null;
    if (h != null && (h < 0 || h > 100)) h = null;
    return t == null && h == null ? null : kind + "|" + N(t) + "|" + N(h);
  }
  static readonly Dictionary<int, int> BL = new Dictionary<int, int> {
    {0x00,1},{0x01,1},{0x02,2},{0x03,2},{0x04,3},{0x05,3},{0x06,2},{0x07,2},{0x08,2},{0x09,1},{0x0A,3},{0x0B,3},{0x0C,2},{0x0D,2},{0x0E,2},{0x0F,1},
    {0x10,1},{0x11,1},{0x12,2},{0x13,2},{0x14,2},{0x15,1},{0x16,1},{0x17,1},{0x18,1},{0x19,1},{0x1A,1},{0x1B,1},{0x1C,1},{0x1D,1},{0x1E,1},{0x1F,1},
    {0x20,1},{0x21,1},{0x22,1},{0x23,1},{0x24,1},{0x25,1},{0x26,1},{0x27,1},{0x28,1},{0x29,1},{0x2A,1},{0x2B,1},{0x2C,1},{0x2D,1},{0x2E,1},{0x2F,1},
    {0x3A,1},{0x3C,2},{0x3D,2},{0x3E,4},{0x3F,2},{0x40,2},{0x41,2},{0x42,3},{0x43,2},{0x44,2},{0x45,2},{0x46,1},{0x47,2},{0x48,2},{0x49,2},{0x4A,2},
    {0x4B,3},{0x4C,4},{0x4D,4},{0x4E,4},{0x4F,4},{0x50,4},{0x51,2},{0x52,2},{0x55,4},{0x56,2},{0x57,1},{0x58,1},{0x59,1},{0x5A,2},{0x5B,4},{0x5C,4},
    {0x5D,2},{0x5E,2},{0x5F,2},{0x60,1},{0x61,2},{0xF0,2},{0xF1,4},{0xF2,3}
  };
  static string BtHome(byte[] p) {
    if (p.Length < 1 || (p[0] & 1) == 1 || (p[0] >> 5) != 2) return null;   // 암호 걸린 것 · v2 아닌 것은 못 읽음
    double? t = null, h = null; int i = 1;
    while (i < p.Length) {
      int id = p[i++], n;
      if (id == 0x53 || id == 0x54) { if (i >= p.Length) break; n = 1 + p[i]; }
      else if (!BL.TryGetValue(id, out n)) break;
      if (i + n > p.Length) break;
      if (id == 0x02) t = (short)(p[i] | p[i + 1] << 8) / 100.0;
      else if (id == 0x45) t = (short)(p[i] | p[i + 1] << 8) / 10.0;
      else if (id == 0x57) t = (sbyte)p[i];
      else if (id == 0x03) h = (p[i] | p[i + 1] << 8) / 100.0;
      else if (id == 0x2E) h = p[i];
      i += n;
    }
    return Fmt("BTHome", t, h);
  }
  static string Atc(byte[] p) {
    if (p.Length == 13) return Fmt("ATC", (short)(p[6] << 8 | p[7]) / 10.0, p[8]);
    if (p.Length >= 15) return Fmt("pvvx", (short)(p[6] | p[7] << 8) / 100.0, (p[8] | p[9] << 8) / 100.0);
    return null;
  }
  static string Mi(byte[] p) {
    if (p.Length < 5) return null;
    int fc = p[0] | p[1] << 8;
    if ((fc & 0x08) != 0 || (fc & 0x40) == 0) return null;   // 암호 걸린 것(새 펌웨어 기본)은 못 읽음
    int i = 5;
    if ((fc & 0x10) != 0) i += 6;
    if ((fc & 0x20) != 0) { if (i >= p.Length) return null; int cap = p[i++]; if ((cap & 0x20) != 0) i += 2; }
    double? t = null, h = null;
    while (i + 3 <= p.Length) {
      int ty = p[i] | p[i + 1] << 8, n = p[i + 2]; i += 3;
      if (i + n > p.Length) break;
      if (ty == 0x1004 && n >= 2) t = (short)(p[i] | p[i + 1] << 8) / 10.0;
      else if (ty == 0x1006 && n >= 2) h = (p[i] | p[i + 1] << 8) / 10.0;
      else if (ty == 0x100D && n >= 4) { t = (short)(p[i] | p[i + 1] << 8) / 10.0; h = (p[i + 2] | p[i + 3] << 8) / 10.0; }
      i += n;
    }
    return Fmt("Xiaomi", t, h);
  }
  static string SwitchBot(byte[] p) {
    if (p.Length < 6) return null;
    int m = p[0] & 0x7F;
    if (m != 0x54 && m != 0x69 && m != 0x77) return null;   // T: 온습도계 · i: 온습도계 플러스 · w: 실외
    double t = (p[4] & 0x7F) + (p[3] & 0x0F) / 10.0;
    if ((p[4] & 0x80) == 0) t = -t;
    return Fmt("SwitchBot", t, p[5] & 0x7F);
  }
  static string Govee(byte[] p) {
    if (p.Length == 6) { int v = p[1] << 16 | p[2] << 8 | p[3]; bool neg = (v & 0x800000) != 0; v &= 0x7FFFFF; return Fmt("Govee", (neg ? -1 : 1) * (v / 1000) / 10.0, (v % 1000) / 10.0); }
    if (p.Length == 7) return Fmt("Govee", (short)(p[1] | p[2] << 8) / 100.0, (p[3] | p[4] << 8) / 100.0);
    return null;
  }
}
"@
# 도우미를 만들고 듣기 시작 — 'on' · 'off'(블루투스 없음 · 꺼짐) · 까닭
function Ble-Init {
  if ($NoBle -or $env:OS -ne 'Windows_NT') { return 'off' }
  try {
    if (-not ('Ble3ds' -as [type])) {
      $dll = Join-Path $script:Dir "Ble3ds-$script:Ver.dll"
      if (-not (Test-Path $dll)) {
        $fw = [Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory(); $wm = Join-Path $env:windir 'System32\WinMetadata'; $gac = Join-Path $env:windir 'Microsoft.NET\assembly\GAC_MSIL'
        $r = @(@('Windows.Devices.winmd', 'Windows.Foundation.winmd', 'Windows.Storage.winmd') | ForEach-Object { '/r:' + (Join-Path $wm $_) }) + ('/r:' + (Join-Path $fw 'System.Runtime.WindowsRuntime.dll'))
        foreach ($n in 'System.Runtime', 'System.Runtime.InteropServices.WindowsRuntime') { $f = Get-ChildItem (Join-Path $gac $n) -Recurse -Filter "$n.dll" -ErrorAction SilentlyContinue | Select-Object -First 1; if ($f) { $r += '/r:' + $f.FullName } }
        $cs = Join-Path $script:Dir 'ble3ds.cs'; [IO.File]::WriteAllText($cs, $script:BleSrc, (New-Object Text.UTF8Encoding($false)))
        $out = & (Join-Path $fw 'csc.exe') /nologo /target:library /optimize "/out:$dll" @r $cs 2>&1
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $dll)) { return "블루투스 도우미를 만들지 못했어요 ($(([string]($out | Select-Object -First 1)).Trim()))" }
      }
      Add-Type -Path $dll
    }
    [void][Ble3ds]::Start()
    Start-Sleep -Milliseconds 800
    $st = [Ble3ds]::Status()
    if ($st -eq 'Started') { return 'on' }
    return '블루투스가 꺼져 있거나 없어요'
  } catch { return "블루투스를 쓸 수 없어요 ($($_.Exception.Message))" }
}
# 들은 값 → @(@{ key; vals }) (이름은 BleNames 에 — 기기가 알려 준 이름 · 없으면 「종류 MAC 끝」)
function Ble-Take {
  $out = @(); $x = $null
  if ($script:Ble -ne 'on') { return $out }
  while ([Ble3ds]::Q.TryDequeue([ref]$x)) {
    $p = $x -split '\|'; if ($p.Count -lt 6) { continue }
    $key = 'ble/' + (($p[0] -split '(..)' | Where-Object { $_ }) -join ':')
    $script:BleNames[$key] = if ($p[1].Trim()) { $p[1].Trim() } else { "$($p[3]) $($p[0].Substring(8))" }
    $v = @{}
    if ($p[4] -ne '') { $v.temperature = [double]::Parse($p[4], $script:Inv) }
    if ($p[5] -ne '') { $v.humidity = [double]::Parse($p[5], $script:Inv) }
    if ($v.Count) { $out += @{ key = $key; vals = $v } }
  }
  return $out
}

# ── 한 번 붙어서 끊길 때까지 (사이트에서 브로커 설정을 바꾸면 돌아와서 다시 붙음) · 1.16.0 브로커가 없거나 안 붙어도 블루투스는 계속
function Run-Once($o) {
  $j = Sync-Site $o @() 'start'
  $cfg = Get-K $j 'config'; $rev = [string](Get-K $j 'rev')
  $host1 = [string](Get-K $cfg 'host'); $m = $null; $retry = 0.0; $brk = 'none'
  if ($host1) {
    try { $m = Mq-Open $cfg; $brk = 'ok' } catch {
      $e = $_.Exception.Message; $brk = $e.Substring(0, [Math]::Min(200, $e.Length))
      try { [void](Sync-Site $o @() $brk) } catch {}
      if ($script:Ble -ne 'on') { throw }
      $retry = (Mono) + 60
    }
  } elseif ($script:Ble -ne 'on') { throw '브로커 주소가 아직 없어요 — 사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정에서 적어 주세요.' }
  $seen = @{}; $fresh = @{}; $pushers = @{}
  $remap = {
    param($j)
    $mp = Get-K $j 'map'; if ($mp -isnot [Collections.IDictionary]) { $mp = @{} }
    foreach ($k in @($pushers.Keys)) { if ([string](Get-K $mp $k) -ne $pushers[$k].token) { $pushers.Remove($k) } }
    foreach ($k in @($mp.Keys)) {
      $tok = [string]$mp[$k]
      if (-not $pushers.Contains($k) -and $tok -match '^[a-f0-9]{32}$') {
        $pushers[$k] = New-Pusher $k $tok (3 + 2 * $pushers.Count)
        if ($seen.Contains($k)) { Pusher-Update $pushers[$k] $seen[$k] }
      }
    }
    foreach ($p in @($pushers.Values)) { Pusher-Apply $p (Get-K $j 'pace') }
  }
  $take = {
    param($rs)
    foreach ($r in @($rs)) {
      if (-not $r) { continue }
      if (-not $seen.Contains($r.key)) { if ($seen.Count -ge $script:MaxSeen) { continue }; $seen[$r.key] = @{} }
      foreach ($f in @($r.vals.Keys)) { $seen[$r.key][$f] = $r.vals[$f] }
      $fresh[$r.key] = $true
      if ($pushers.Contains($r.key)) { Pusher-Update $pushers[$r.key] $r.vals }
    }
  }
  & $remap $j
  $nxt = (Mono) + 5
  Log "$(if ($m) { "브로커 $($host1):$(Get-K $cfg 'port') 에 붙음" } else { '브로커 없이' }) · 블루투스 $script:Ble · 받는 것 $($pushers.Count)"
  try {
    while ($true) {
      if ($m) { $p = MRead $m 1000 } else {
        $p = $null; Start-Sleep -Milliseconds 1000
        if ($retry -gt 0 -and (Mono) -ge $retry) { try { $m = Mq-Open $cfg; $brk = 'ok'; $retry = 0.0 } catch { $e = $_.Exception.Message; $brk = $e.Substring(0, [Math]::Min(200, $e.Length)); $retry = (Mono) + 60 } }
      }
      if ($p -and $p.Type -eq 3) {
        $pm = Mq-Publish $m $p
        & $take @(Parse-Msg $pm.Topic $pm.Raw)
      } elseif ($p -and $p.Type -eq 9 -and $p.Body.Length -gt 2 -and @($p.Body[2..($p.Body.Length - 1)] | Where-Object { $_ -ne 0x80 }).Count -eq 0) {   # 모든 토픽이 0x80(거절)일 때만
        throw [UnauthorizedAccessException]'브로커가 토픽 구독을 거절했어요 — 이 계정의 읽기 권한(ACL)을 확인해 주세요.'
      }
      & $take @(Ble-Take)
      if ((Mono) -ge $nxt) {
        $nxt = (Mono) + $script:SyncSec
        $rows = @(@($fresh.Keys) | Sort-Object | ForEach-Object { Seen-Row $_ $seen[$_] })
        $j = Sync-Site $o $rows $brk
        $fresh = @{}
        if ([string](Get-K $j 'rev') -ne $rev) { Log '사이트에서 브로커 설정이 바뀌었어요 — 다시 붙어요'; return }
        & $remap $j
      }
      foreach ($k in @($pushers.Keys)) {
        $pu = $pushers[$k]
        if ($pu.values.Count -and (($null -ne $pu.pending -and (Mono) -ge $pu.pending) -or (Mono) -ge $pu.next)) {
          if ((Pusher-Push $o $pu) -eq 'unknown') { $pushers.Remove($k) }
        }
      }
    }
  } finally { if ($m) { Mq-Close $m } }
}
function Run-Link {
  $script:Ble = Ble-Init
  $wait = 5
  while ($true) {
    $o = Load-Cfg
    try { Run-Once $o; $wait = 5 } catch { Log "⚠️ $($_.Exception.Message) — $($wait)초 뒤 다시" }
    Start-Sleep -Seconds $wait
    $wait = [Math]::Min($wait * 2, 120)
  }
}

# ── 명령: 사이트 설정으로 브로커에 붙어 $secs 초 동안 온습도 토픽 · 블루투스 온습도계를 모아 보여 줌 (사이트에도 알림)
function Scan-Topics($o, [int]$secs = 15) {
  $j = Sync-Site $o @() 'start'; $cfg = Get-K $j 'config'
  $host1 = [string](Get-K $cfg 'host'); $m = $null; $brk = 'none'
  if ($host1) {
    $tl = if (Get-K $cfg 'tls') { ' (TLS)' } else { '' }
    Write-Host "[IoT 연결] 브로커 $($host1):$(Get-K $cfg 'port')$tl 에 붙는 중…" -ForegroundColor Cyan
    try { $m = Mq-Open $cfg; $brk = 'ok' } catch {
      $e = $_.Exception.Message; $brk = $e.Substring(0, [Math]::Min(200, $e.Length))
      try { [void](Sync-Site $o @() $brk) } catch {}
      if ($script:Ble -ne 'on') { throw }
      Write-Host "[IoT 연결] ⚠️ $e — 블루투스만 찾아요" -ForegroundColor Yellow
    }
  } elseif ($script:Ble -ne 'on') { throw '브로커 주소가 아직 없어요 — 사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정에서 적어 주세요.' }
  if ($script:Ble -eq 'on') { Write-Host '[IoT 연결] 📶 이 PC 의 블루투스로 주변 온습도계도 찾아요' -ForegroundColor Cyan }
  elseif ($script:Ble -ne 'off') { Write-Host "[IoT 연결] 📶 $script:Ble" -ForegroundColor Yellow }
  $seen = @{}
  $add = { param($rs) foreach ($r in @($rs)) { if (-not $r) { continue }; if (-not $seen.Contains($r.key)) { if ($seen.Count -ge $script:MaxSeen) { continue }; $seen[$r.key] = @{} }; foreach ($f in @($r.vals.Keys)) { $seen[$r.key][$f] = $r.vals[$f] } } }
  try {
    $until = (Mono) + $secs
    while ((Mono) -lt $until) {
      if ($m) {
        $p = MRead $m ([int][Math]::Min(1000, [Math]::Max(100, ($until - (Mono)) * 1000)))
        if ($p -and $p.Type -eq 3) { $pm = Mq-Publish $m $p; & $add @(Parse-Msg $pm.Topic $pm.Raw) }
      } else { Start-Sleep -Milliseconds 300 }
      & $add @(Ble-Take)
    }
  } finally { if ($m) { Mq-Close $m } }
  $mp = Get-K $j 'map'
  Write-Host "[IoT 연결] 🟢 $(if ($m) { '브로커에 붙었어요 · ' } else { '' })$($secs)초 동안 찾은 온습도 센서 $($seen.Count)개" -ForegroundColor Green
  foreach ($k in @($seen.Keys | Sort-Object)) {
    $v = $seen[$k]; $t = if ($v.Contains('temperature')) { "$($v.temperature)°C" } else { '-' }; $h = if ($v.Contains('humidity')) { "$($v.humidity)%" } else { '-' }
    Write-Host ("   {0} 온도 {1,-7} 습도 {2,-6} {3}  ({4})" -f $(if ($null -ne (Get-K $mp $k)) { '✅' } else { '·' }), $t, $h, (Seen-Name $k), $k)
  }
  [void](Sync-Site $o @(@($seen.Keys) | Sort-Object | ForEach-Object { Seen-Row $_ $seen[$_] }) $brk)
  return $seen.Count
}

if ($Lib) { return }
if ($Scan) {
  $script:Ble = Ble-Init
  try { [void](Scan-Topics (Load-Cfg) 20) } catch { Write-Host "[IoT 연결] ⚠️ $($_.Exception.Message)" -ForegroundColor Yellow }
  return
}
Run-Link
