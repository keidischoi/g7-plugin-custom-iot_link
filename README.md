# 📡 IoT 연결 (custom-iot_link)

G7(그누보드7) 플러그인. 회원의 Home Assistant · SmartThings 가 보내는 온습도 · 프린터 · 장비 상태를 받아 정비 수첩(custom-maintenance) · 내 프린터(custom-my_printer) · 업체 장비(custom-companies)에 잇습니다.

- 사이트가 회원 집으로 접속하지 않습니다. 회원이 자기 Home Assistant 에 `rest_command` + `automation` 을 붙여 넣으면 값이 들어옵니다 (화면이 설정 글을 만들어 줌).
- 받는 주소: `POST /api/plugins/custom-iot_link/in/{비밀 키}` — `{"temperature": 23.4, "humidity": 41, "state": "running", "progress": 42, "remaining_min": 75, "job": "…"}` (있는 것만)
- 화면 `/iot-link` · 관리자 `/admin/iot-link`

## 🔁 1.0.0 이름 바꿈 — 🏠 HA 연결(`custom-ha_link`) → 📡 IoT 연결(`custom-iot_link`)

- 표(`hal_*`) · 설정(`hal_settings`) · 카메라 사진 폴더(`storage/app/ha_link`) · 알림 종류(`custom_ha_link_alert`) · 홈 디자인 메뉴 키(`ha_link`)는 **그대로** — 새 플러그인이 예전 데이터를 그대로 씀 (옮길 것 없음). 예전 기본 메뉴 이름 「HA 연결」은 「IoT 연결」로 바뀜 (직접 바꾼 이름은 그대로).
- **예전 주소도 계속 받음**: `/api/plugins/custom-ha_link/…` (Home Assistant `rest_command` · HACS 통합 · SmartThings Target URL) → 같은 컨트롤러, `/ha-link` · `/admin/ha-link` → 같은 화면(주소 줄은 새 주소로 바뀜), 필터 `custom-ha_link.printer_snapshot` 도. 회원 · 관리자가 고칠 것은 없음. 새로 만드는 설정 글 · Target URL 안내는 새 주소.
- 먼저 올릴 것 (두 식별자 모두 받음): 내 프린터 0.1.27 · 정비 수첩 0.3.1 · 재고 관리 0.1.1 · 홈 디자인 0.7.97 · HACS 통합 3ds 0.3.1
- ⚠️ 예전 플러그인은 **비활성화만** — `--delete-data` 로 지우면 두 플러그인이 같이 쓰는 `hal_*` 표가 지워짐.

### 옮기기 (서버)

```
# 0) 백업 — DB 와 plugins/custom-ha_link · storage/app/ha_link
# 1) 두 식별자를 받는 버전으로
sudo -u http php82 artisan plugin:update custom-my_printer --force --layout-strategy=overwrite
sudo -u http php82 artisan plugin:update custom-maintenance --force --layout-strategy=overwrite
sudo -u http php82 artisan module:update custom-inventory --force --layout-strategy=overwrite
sudo -u http php82 artisan module:update custom-home_design --force --layout-strategy=overwrite
# 2) 새 플러그인 — custom-iot_link-1.0.0.zip 을 plugins/_pending 에 풀기 (plugins/_pending/custom-iot_link/plugin.php)
sudo -u http php82 artisan plugin:install custom-iot_link --force
sudo -u http php82 artisan plugin:activate custom-iot_link --force
# 3) 예전 플러그인 끄기 (데이터는 지우지 않음)
sudo -u http php82 artisan plugin:deactivate custom-ha_link --force
# 4) 정리
sudo -u http php82 artisan migrate --force
sudo -u http php82 artisan hooks:clear
sudo -u http php82 artisan cache:clear
sudo -u http php82 artisan ext-static:publish --force
```

되돌리기: `plugin:deactivate custom-iot_link --force` → `plugin:activate custom-ha_link --force` → `hooks:clear` · `cache:clear` · `ext-static:publish --force` (데이터는 같은 표라 그대로).

## 📡 SmartThings (1.1.0 로그인 연결 — API Access App · OAuth)

SmartThings 는 또 하나의 「보내는 곳」 — 받은 센서 값을 Home Assistant 와 같은 받기(`HaService::ingest`)로 넘깁니다.

### 회원

`/iot-link` 의 SmartThings 카드 → **🔗 SmartThings 연결하기** → 삼성 계정 로그인 → 위치를 고르고 **허용** → 사이트로 돌아오면 **⚙️ 센서 고르기**(온습도계는 미리 체크) → 저장. 화면의 「❓ 연결 방법 › 📡 SmartThings」에 그림 안내가 있습니다.

- 센서 하나가 기기 카드 하나 — 이름이 같은 카드가 있으면 거기에, 필라멘트 **보관 위치**와 이름이 같으면 그 보관함에 붙습니다. 카드의 ✏️ 에서 알림 기준 · 붙일 곳을 정합니다.
- 값: 온도(°F→°C) · 습도 → 기기 온습도, 전력(정한 W 넘으면) 또는 스위치 → 가동 상태, 문 · 움직임 · 재실 · 누수 · 배터리 · 전력량 · 밝기 → 센서 값
- 센서를 더하거나 빼기: ⚙️ 센서 고르기 (다시 로그인하지 않음) · 다른 위치: ➕ 다른 위치 연결 · 그만 쓰기: 연결 끊기 (기기 카드 · 기록은 남음)
- 💳 **고지**: 삼성이 SmartThings API 를 유료 이용제로 바꾸는 중이라 무료 이용이 중지되어 값이 들어오지 않게 될 수 있습니다. 이 안내는 회원 화면(SmartThings 카드 · 연결 방법 · 센서 고르기)에 늘 보입니다.

### 관리자 (한 번) — 관리자 › IoT 연결 › 📡 SmartThings

- **⚡ 자동 등록**: [account.smartthings.com/tokens](https://account.smartthings.com/tokens) 에서 개인 액세스 토큰을 만들어(권한: 애플리케이션) 붙여 넣고 「⚡ 자동 등록」 → 사이트가 앱을 만들고 Client ID · Client Secret 저장 · 주소 확인까지 합니다. 토큰은 저장하지 않습니다.
- **📝 직접 등록**: [Developer Center](https://developer.smartthings.com/console) › Service Integrations › Register New App, 또는 SmartThings CLI `smartthings apps:create` → *OAuth-In App*. 화면의 복사 단추로 아래 값을 넣고, 나온 Client ID · Client Secret 을 관리자 화면에 저장합니다.

| 항목 | 값 |
| --- | --- |
| Target URL (받는 곳) | `https://사이트/api/plugins/custom-iot_link/smartthings` — 모든 요청의 HTTP 서명(rsa-sha256 · Digest · Date)을 확인 |
| Redirect URI (돌아오는 곳) | `https://사이트/iot-link` |
| Scopes (권한) | `r:devices:*` · `r:locations:*` (읽기만) |

- 주소 확인(CONFIRMATION)은 SmartThings 가 받는 곳으로 보내면 사이트가 알아서 답합니다 (관리자 화면에 ✅).
- 토큰은 Laravel Crypt 로 암호화 · 끝나 가면 refresh_token 으로 새로 받음 (`APP_KEY` 를 바꾸면 회원이 「🔗 다시 연결」을 한 번 눌러야 함)
- 💳 SmartThings 는 2026-10 부터 API 를 유료 플랜으로 바꾸는 중입니다 (개인 월 $4.99 · 상업용은 따로 — [SmartThings 의 안내](https://blog.smartthings.com/smartthings-updates/a-new-enhanced-smartthings-api-experience/)). 등록 · 연결이 거부되면 Developer Center 에서 플랜을 확인하세요.

### 예전 방식 (0.2.0 연결 코드 · WebHook SmartApp)

[Developer Workspace](https://developer.smartthings.com/workspace) 에서 *Automation for the SmartThings App* → *WebHook Endpoint* 로 등록한 경우입니다. Target URL · 권한은 위와 같고, 관리자 「고급」에서 「(예전 방식) 연결 코드로 잇기도 보이기」를 켜면 회원 화면에 연결 코드 칸이 나옵니다 (코드를 SmartThings 앱 › 자동화 › ＋ › 루틴 추가 › 발견 › 이 앱의 설정 화면에 적음). *Deploy to Test* 상태에서는 등록한 계정만 설치할 수 있습니다.

## 설치 (NAS)

```
php82 artisan plugin:install custom-iot_link; php82 artisan plugin:activate custom-iot_link; php82 artisan hooks:cache; php82 artisan cache:clear
```

## 업데이트 (1.0.0 이후)

```
sudo -u http php82 artisan plugin:update custom-iot_link --force --layout-strategy=overwrite
sudo -u http php82 artisan migrate --force
sudo -u http php82 artisan hooks:clear
sudo -u http php82 artisan cache:clear
sudo -u http php82 artisan ext-static:publish --force
```

## 검사

```
php tests/run.php
G7_VENDOR=…/vendor php tests/sim.php
G7_VENDOR=…/vendor php tests/rename.php
```
