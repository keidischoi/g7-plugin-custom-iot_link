# 3D SUEÑO IoT 연결 — 🧩 Matter 중계 (Windows · PowerShell 만 — 따로 깔 것 없음)
#  집 안 Matter 서버(python-matter-server · HA Matter Server 애드온)의 온습도 센서 값을 사이트 IoT 연결로 보냄
#  config.json 의 연결 코드로 센서마다 사이트 기기를 저절로 만들고(허브 API), 받는 주소 /in/{키} 로 보냄 — 보내는 규칙은 HA 통합과 같음
#  돌기: powershell -File link.ps1        센서 넣기: … link.ps1 -Pair        넣은 센서 보기: … link.ps1 -Nodes
#  -Lib 로 불러오면 함수만 (설치 스크립트가 씀) · 마지막 결과는 last.txt
param([switch]$Lib, [switch]$Pair, [switch]$Nodes)
$ErrorActionPreference = 'Stop'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor 3072 } catch {}
$script:Dir = if ($PSScriptRoot) { $PSScriptRoot } else { Join-Path $env:LOCALAPPDATA '3dsMatter' }
$script:Cfg = Join-Path $script:Dir 'config.json'
$script:Inv = [Globalization.CultureInfo]::InvariantCulture
$script:Ver = '1.12.0'

function Log($m) { try { Set-Content -Encoding UTF8 (Join-Path $script:Dir 'last.txt') "$(Get-Date -Format s) $m" } catch {} }
function Mono { return [Diagnostics.Stopwatch]::GetTimestamp() / [Diagnostics.Stopwatch]::Frequency }

# ── JSON (PowerShell 5.1 의 ConvertFrom-Json 은 2MB 까지라 노드가 많으면 막힘 → .NET 직렬 변환기 · PowerShell 7 은 -AsHashtable)
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
# 받은 JSON 은 Dictionary(5.1) · Hashtable(7) — 없는 열쇠는 $null (Dictionary 의 Contains 는 PowerShell 에서 안 보여 인덱서로)
function Get-K($d, $k) { if ($d -is [Collections.IDictionary]) { return $d[$k] } ; return $null }
function Has-K($d, $k) { return ($d -is [Collections.IDictionary]) -and (@($d.Keys) -contains $k) }

# ── 설정
function Load-Cfg {
  $c = @{}
  if (Test-Path $script:Cfg) { try { $c = Parse-Json ([IO.File]::ReadAllText($script:Cfg)) } catch {} }
  $o = @{ site = [string](Get-K $c 'site'); code = [string](Get-K $c 'code'); matter = [string](Get-K $c 'matter'); server_id = [string](Get-K $c 'server_id'); server_name = [string](Get-K $c 'server_name'); devices = @{}; skip = @() }
  $dv = Get-K $c 'devices'; if ($dv -is [Collections.IDictionary]) { foreach ($k in $dv.Keys) { $o.devices[[string]$k] = @{ id = [int](Get-K $dv[$k] 'id'); token = [string](Get-K $dv[$k] 'token') } } }
  $sk = Get-K $c 'skip'; if ($sk) { $o.skip = @($sk | ForEach-Object { [string]$_ }) }
  if (-not $o.server_id) { $o.server_id = 'matter' + ([guid]::NewGuid().ToString('N').Substring(0, 24)) }
  if (-not $o.server_name) { $o.server_name = "$env:COMPUTERNAME (Windows)" }
  return $o
}
function Save-Cfg($o) { [IO.File]::WriteAllText($script:Cfg, (To-Json $o), (New-Object Text.UTF8Encoding($false))) }
function Matter-Url([string]$a) {
  $a = $a.Trim(); if (-not $a) { $a = 'localhost' }
  if ($a -notmatch '^wss?://') { $a = 'ws://' + $a }
  $h = ($a -split '://', 2)[1]
  if ($h -notmatch '/') { if (($h -split '\]')[-1] -notmatch ':') { $a += ':5580' }; $a += '/ws' }
  return $a
}

# ── 사이트 (HttpWebRequest — 오류 답의 본문도 읽음)
function Site-Req($o, [string]$method, [string]$path, $body) {
  $req = [Net.HttpWebRequest]::Create($o.site.TrimEnd('/') + '/api/plugins/custom-iot_link/' + $path)
  $req.Method = $method; $req.Timeout = 20000; $req.ReadWriteTimeout = 20000; $req.UserAgent = "3ds-matter-ps/$script:Ver"; $req.Accept = 'application/json'
  $req.Headers.Add('X-G7-Via', 'matter'); $req.Headers.Add('X-G7-Server', $o.server_id); $req.Headers.Add('X-G7-Server-Name', [uri]::EscapeDataString($o.server_name))
  if ($null -ne $body) {
    $b = [Text.Encoding]::UTF8.GetBytes((To-Json $body)); $req.ContentType = 'application/json'; $req.ContentLength = $b.Length
    $s = $req.GetRequestStream(); $s.Write($b, 0, $b.Length); $s.Close()
  }
  try { $res = $req.GetResponse() } catch [Net.WebException] { $res = $_.Exception.Response; if (-not $res) { throw } }
  try { $txt = (New-Object IO.StreamReader($res.GetResponseStream(), [Text.Encoding]::UTF8)).ReadToEnd(); $code = [int]$res.StatusCode } finally { $res.Close() }
  $j = $null; try { $j = Parse-Json $txt } catch {}
  return @{ status = $code; json = $j }
}

# ── Matter 서버 WebSocket (python-matter-server — 명령은 message_id 로 답을 짝지음)
function Mt-Open([string]$url) {
  $ws = New-Object Net.WebSockets.ClientWebSocket
  $ws.Options.KeepAliveInterval = [TimeSpan]::FromSeconds(30)
  if (-not $ws.ConnectAsync([Uri]$url, [Threading.CancellationToken]::None).Wait(10000)) { throw "Matter 서버($url)가 답하지 않아요" }
  $m = @{ ws = $ws; buf = (New-Object byte[] 65536); ms = (New-Object IO.MemoryStream); task = $null; n = 0; info = $null }
  $m.info = Mt-Recv $m 15
  if ($null -eq (Get-K $m.info 'schema_version')) { throw "Matter 서버가 아닌 것 같아요 ($url)" }
  return $m
}
function Mt-Close($m) { try { [void]$m.ws.CloseAsync('NormalClosure', 'bye', [Threading.CancellationToken]::None).Wait(2000) } catch {} ; try { $m.ws.Dispose() } catch {} }
# 메시지 하나 (기다릴 시간 안에 안 오면 $null) — 끊기면 오류
function Mt-Recv($m, [double]$wait) {
  $until = (Mono) + $wait
  while ($true) {
    if ($m.ws.State -ne 'Open') { throw 'Matter 서버 연결이 끊겼어요' }
    if (-not $m.task) { $m.task = $m.ws.ReceiveAsync((New-Object 'ArraySegment[byte]' -ArgumentList (, $m.buf)), [Threading.CancellationToken]::None) }
    $left = [int][Math]::Max(0, ($until - (Mono)) * 1000)
    if (-not $m.task.Wait($left)) { return $null }
    $r = $m.task.Result; $m.task = $null
    if ($r.MessageType -eq 'Close') { throw 'Matter 서버가 연결을 닫았어요' }
    $m.ms.Write($m.buf, 0, $r.Count)
    if ($r.EndOfMessage) {
      $txt = [Text.Encoding]::UTF8.GetString($m.ms.ToArray()); $m.ms.SetLength(0)
      try { return (Parse-Json $txt) } catch { }
    }
    if ((Mono) -ge $until) { return $null }
  }
}
function Mt-Send($m, [string]$command, $args2) {
  $m.n++; $id = "ps$($m.n)"
  $msg = [ordered]@{ message_id = $id; command = $command }; if ($null -ne $args2) { $msg.args = $args2 }
  $b = [Text.Encoding]::UTF8.GetBytes((To-Json $msg))
  [void]$m.ws.SendAsync((New-Object 'ArraySegment[byte]' -ArgumentList (, $b)), 'Text', $true, [Threading.CancellationToken]::None).Wait(10000)
  return $id
}
# 명령 하나를 보내고 답을 기다림 (그동안 온 이벤트는 $onEvent 로)
function Mt-Cmd($m, [string]$command, $args2, [double]$timeout = 30, $onEvent = $null) {
  $id = Mt-Send $m $command $args2
  $until = (Mono) + $timeout
  while ((Mono) -lt $until) {
    $x = Mt-Recv $m ([Math]::Max(0.2, $until - (Mono)))
    if ($null -eq $x) { continue }
    if ((Get-K $x 'message_id') -eq $id) {
      if (Has-K $x 'error_code') { throw "Matter 서버: $(Get-K $x 'error_code') $(Get-K $x 'details')" }
      return (Get-K $x 'result')
    }
    if ($onEvent -and (Has-K $x 'event')) { & $onEvent $x }
  }
  throw "Matter 서버가 $([int]$timeout)초 안에 답하지 않았어요 ($command)"
}

# ── 노드 값 (온도 1026/0 · 습도 1029/0 — 0.01 단위)
function Read-Values($attrs, $ep = $null) {
  $out = @{}
  foreach ($p in @(@('temperature', '1026/0'), @('humidity', '1029/0'))) {
    $keys = @($attrs.Keys | Where-Object { $_ -like "*/$($p[1])" -and ($_ -split '/').Count -eq 3 } | Sort-Object { [int](($_ -split '/')[0]) })
    if ($null -ne $ep) { $keys = @($keys | Where-Object { ($_ -split '/')[0] -eq [string]$ep }) }
    foreach ($k in $keys) { $v = $attrs[$k]; if ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) { $out[$p[0]] = [Math]::Round([double]$v / 100, 1); break } }
  }
  return $out
}
function Node-Label($attrs) {
  $l = [string](Get-K $attrs '0/40/5'); if ($l.Trim()) { return $l.Trim() }
  $l = ("$(Get-K $attrs '0/40/1') $(Get-K $attrs '0/40/3')").Trim(); if ($l) { return $l }
  return ''
}
function Clean-Code([string]$c) {
  $c = $c.Trim(); if ($c -match '^MT:') { return $c }
  $d = $c -replace '[\s-]', ''; if ($d -match '^(\d{11}|\d{21})$') { return $d } ; return $null
}

# ── 사이트로 보내기 (HA 통합 · 리눅스판과 같은 규칙: 변하면 보내기 + 최소 간격 + 정해진 주기, 사이트의 답을 따름)
function New-Pusher([string]$nid, $dev, [double]$first) {
  return @{ nid = $nid; dev = $dev; values = @{}; avail = $true; sent = @{}; last = 0.0; next = (Mono) + $first; pending = $null
    mode = 'change'; dh = 1.0; dt = 0.5; gap = 60; interval = 10 }
}
function Pusher-Update($p, $vals, [bool]$avail) {
  $p.values = $vals; $p.avail = $avail
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
  $md = [string](Get-K $a 'mode'); if ($md -eq 'change' -or $md -eq 'interval') { $p.mode = $md }
  $v = Get-K $a 'change_hum'; if ($v -and [double]$v -gt 0) { $p.dh = [double]$v }
  $v = Get-K $a 'change_temp'; if ($v -and [double]$v -gt 0) { $p.dt = [double]$v }
  $v = Get-K $a 'gap_sec'; if ($null -ne $v) { $p.gap = [Math]::Max(10, [int]$v) }
  $v = Get-K $a 'next_min'; if ($v -and [int]$v -ge 1 -and [int]$v -ne $p.interval) { $p.interval = [int]$v; $p.next = [Math]::Min($p.next, (Mono) + $p.interval * 60) }
}
# 돌려줌: 'ok' · 'unknown'(사이트가 키를 모름 — 지운 기기) · 'fail'
function Pusher-Push($o, $p) {
  $p.pending = $null
  if ($p.values.Count -eq 0 -or -not $p.avail) { return 'fail' }
  $p.last = Mono; $p.next = $p.last + $p.interval * 60
  foreach ($k in @($p.values.Keys)) { $p.sent[$k] = $p.values[$k] }
  try {
    $r = Site-Req $o 'POST' "in/$($p.dev.token)" $p.values
    if ($r.status -eq 404 -and (Get-K $r.json 'message') -eq 'unknown') { return 'unknown' }
    if ($r.status -ge 400) { Log "노드 $($p.nid): 사이트가 값을 받지 않았어요 ($($r.status) $(Get-K $r.json 'message'))"; return 'fail' }
    Pusher-Apply $p $r.json
    Log "노드 $($p.nid): 보냄 온도 $(Get-K $p.values 'temperature') · 습도 $(Get-K $p.values 'humidity')"
    return 'ok'
  } catch { Log "노드 $($p.nid): 보내지 못했어요 — $($_.Exception.Message)"; return 'fail' }
}

# ── 사이트 기기 저절로 만들기 (연결 코드 · 허브 API — 서버는 X-G7-Via: matter 를 보고 Matter 기기로 만듦)
function Ensure-Device($o, [string]$nid, $attrs) {
  if ($o.devices.Contains($nid)) { return $o.devices[$nid] }
  if ($o.skip -contains $nid -or -not $o.code) { return $null }
  $name = Node-Label $attrs; if (-not $name) { $name = "Matter 센서 $nid" }
  $r = Site-Req $o 'POST' "hub/$($o.code)/devices" @{ name = $name.Substring(0, [Math]::Min(60, $name.Length)); target = 'other' }
  $d = Get-K $r.json 'device'
  if ($r.status -ge 400 -or -not $d) { Log "노드 $nid ($name): 사이트 기기를 만들지 못했어요 — $(Get-K $r.json 'message')"; return $null }
  $o.devices[$nid] = @{ id = [int](Get-K $d 'id'); token = [string](Get-K $d 'token') }
  Save-Cfg $o
  Log "노드 $nid ($name): 사이트 기기를 만들었어요 (📡 대기 칸)"
  return $o.devices[$nid]
}

# ── 한 번 붙어서 끊길 때까지
function Run-Once($o) {
  $m = Mt-Open (Matter-Url $o.matter)
  $nodes = @{}; $pushers = @{}
  $feed = {
    param([string]$nid)
    $n = $nodes[$nid]; if (-not $n) { return }
    $vals = Read-Values $n.attrs
    if ($vals.Count -eq 0) { return }
    if (-not $pushers.Contains($nid)) {
      try { $dev = Ensure-Device $o $nid $n.attrs } catch { Log "노드 $($nid): 사이트에 닿지 않아요 — $($_.Exception.Message)"; return }
      if (-not $dev) { return }
      $pushers[$nid] = New-Pusher $nid $dev (5 + 3 * $pushers.Count)
    }
    Pusher-Update $pushers[$nid] $vals ([bool]$n.avail)
  }
  $setNode = { param($nd) $nid = [string](Get-K $nd 'node_id'); $a = Get-K $nd 'attributes'; if ($a -isnot [Collections.IDictionary]) { $a = @{} }; $nodes[$nid] = @{ attrs = $a; avail = [bool](Get-K $nd 'available') }; & $feed $nid }
  $onEvent = {
    param($x)
    $ev = Get-K $x 'event'; $data = Get-K $x 'data'
    if ($ev -eq 'node_added' -or $ev -eq 'node_updated') { & $setNode $data }
    elseif ($ev -eq 'node_removed') { $nodes.Remove([string]$data); $pushers.Remove([string]$data) }
    elseif ($ev -eq 'attribute_updated' -and @($data).Count -eq 3) {
      $nid = [string]$data[0]; $n = $nodes[$nid]
      if ($n) { $n.attrs[[string]$data[1]] = $data[2]; if ([string]$data[1] -like '*/1026/0' -or [string]$data[1] -like '*/1029/0') { & $feed $nid } }
    }
  }
  try {
    $list = Mt-Cmd $m 'start_listening' $null 60 $onEvent
    foreach ($nd in @($list)) { if ($nd) { & $setNode $nd } }
    Log "Matter 서버에 붙음 (SDK $(Get-K $m.info 'sdk_version')) · 노드 $($nodes.Count) · 보내는 센서 $($pushers.Count)"
    while ($true) {
      $x = Mt-Recv $m 1
      if ($null -ne $x -and (Has-K $x 'event')) { & $onEvent $x }
      foreach ($p in @($pushers.Values)) {
        if (($null -ne $p.pending -and (Mono) -ge $p.pending) -or (Mono) -ge $p.next) {
          $res = Pusher-Push $o $p
          if ($res -eq 'unknown') {   # 사이트에서 지운 기기 — 다시 만들지 않음 (다시 보내려면 config.json 의 skip 에서 빼기)
            Log "노드 $($p.nid): 사이트에서 지운 기기예요 — 이제 안 보내요"
            $o.devices.Remove($p.nid); $o.skip = @($o.skip + $p.nid); Save-Cfg $o; $pushers.Remove($p.nid)
          }
        }
      }
    }
  } finally { Mt-Close $m }
}
function Run-Link {
  $wait = 5
  while ($true) {
    $o = Load-Cfg
    try { Run-Once $o; $wait = 5 } catch { Log "⚠️ $($_.Exception.Message) — $($wait)초 뒤 다시" }
    Start-Sleep -Seconds $wait
    $wait = [Math]::Min($wait * 2, 120)
  }
}

# ── 명령
function Show-Nodes($o) {
  $m = Mt-Open (Matter-Url $o.matter)
  try {
    $list = @(Mt-Cmd $m 'get_nodes' $null 30)
    Write-Host "[IoT 연결] Matter 서버: $(Matter-Url $o.matter) (SDK $(Get-K $m.info 'sdk_version')) · 노드 $($list.Count)" -ForegroundColor Cyan
    foreach ($nd in $list) {
      $a = Get-K $nd 'attributes'; if ($a -isnot [Collections.IDictionary]) { $a = @{} }; $v = Read-Values $a; $nid = [string](Get-K $nd 'node_id')
      $t = if ($v.Contains('temperature')) { "$($v.temperature)°C" } else { '-' }; $h = if ($v.Contains('humidity')) { "$($v.humidity)%" } else { '-' }
      $s = if ($o.devices.Contains($nid)) { '→ 사이트 기기 #' + $o.devices[$nid].id } elseif ($o.skip -contains $nid) { '(안 보냄)' } elseif ($v.Count) { '(켜면 사이트 기기를 만듦)' } else { '(온습도 없음)' }
      Write-Host ("   노드 {0,-3} {1} 온도 {2,-7} 습도 {3,-6} {4} {5}" -f $nid, $(if (Get-K $nd 'available') { '🟢' } else { '⚪' }), $t, $h, (Node-Label $a), $s)
    }
    return $list.Count
  } finally { Mt-Close $m }
}
function Do-Pair($o, [string]$code) {
  if (-not $code) {
    Write-Host '[IoT 연결] 애플 홈(센서 › ⚙️ › 페어링 모드 켜기) · 구글 홈(연결된 Matter 앱 및 서비스) · SmartThings(다른 서비스와 공유)에서 받은 코드를 넣어 주세요.' -ForegroundColor Cyan
    $code = Read-Host '공유 코드 (Enter = 그만)'
    if (-not $code) { return $false }
  }
  $c = Clean-Code $code
  if (-not $c) { Write-Host '[IoT 연결] 코드 모양이 아니에요 (11 · 21자리 숫자 또는 MT: 로 시작).' -ForegroundColor Yellow; return $false }
  Write-Host '[IoT 연결] 센서를 넣는 중… (1~2분)' -ForegroundColor Cyan
  $m = Mt-Open (Matter-Url $o.matter)
  try {
    $nd = Mt-Cmd $m 'commission_with_code' @{ code = $c; network_only = $true } 300
    $a = Get-K $nd 'attributes'; if ($a -isnot [Collections.IDictionary]) { $a = @{} }; $v = Read-Values $a
    Write-Host "[IoT 연결] ✅ 넣었어요: 노드 $(Get-K $nd 'node_id') · $(Node-Label $a) · 온도 $(Get-K $v 'temperature') · 습도 $(Get-K $v 'humidity')" -ForegroundColor Green
    if ($v.Count -eq 0) { Write-Host '[IoT 연결] ⚠️ 이 기기에서 온도 · 습도를 찾지 못했어요 (온습도 센서가 맞는지).' -ForegroundColor Yellow }
    return $true
  } catch { Write-Host "[IoT 연결] 넣지 못했어요: $($_.Exception.Message) — 코드가 만료되지 않았는지 · Thread 센서면 경계 라우터를 확인해 주세요." -ForegroundColor Yellow; return $false }
  finally { Mt-Close $m }
}

if ($Lib) { return }
if ($Pair -or $Nodes) {
  $ErrorActionPreference = 'Stop'
  $o = Load-Cfg
  try { if ($Pair) { [void](Do-Pair $o '') } else { [void](Show-Nodes $o) } } catch { Write-Host "[IoT 연결] ⚠️ $($_.Exception.Message)" -ForegroundColor Yellow }
  return
}
Run-Link
