param([string]$Link)
. $Link -Lib
$ErrorActionPreference = 'Continue'
$b = Ble-Init; $script:Ble = $b
Write-Output "init: $b"
$cases = @(
 @('BTHome v2', '16:D2FC4002CA0903BF13', ''),
 @('pvvx', '16:1A18112233445566290 9A011D00B550100'.Replace(' ',''), ''),
 @('ATC1441', '16:1A1866554433221100EB2D550BB801', ''),
 @('Govee H5075', 'FF:88EC000393D36400', ''),
 @('SwitchBot', '16:000D540064059 72D'.Replace(' ',''), ''),
 @('Inkbird', 'FF:2909A01100000000AA', 'sps'),
 @('Xiaomi 100D', '16:95FE5000AA0101112233445566 0D1004EB00C301'.Replace(' ',''), ''),
 @('Xiaomi 암호', '16:95FE5800AA0101112233445566', ''),
 @('BTHome 암호', '16:D2FC4102CA09', ''),
 @('냉장고', 'FF:75003433365204020808 09:4B696D63686920526566', 'Kimchi Ref')
)
foreach ($c in $cases) { Write-Output ("{0} => {1}" -f $c[0], [Ble3ds]::DecodeHex($c[1], $c[2])) }
[Ble3ds]::Q.Enqueue('A4C1381A2B3C||-60|pvvx|23.5|45.1')
[Ble3ds]::Q.Enqueue('A4C138AABBCC|ATC_AABBCC|-60|ATC|21|')
$r = @(Ble-Take) | Where-Object { $_.key -like 'ble/A4:C1:38:*' }
foreach ($x in $r) { Write-Output ("take {0} {1} t={2} h={3}" -f $x.key, $script:BleNames[$x.key], $x.vals.temperature, $x.vals.humidity) }
[Ble3ds]::Stop()
