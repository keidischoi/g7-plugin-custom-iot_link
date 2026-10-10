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

## 📡 SmartThings (0.2.0, WebHook SmartApp)

SmartThings 는 또 하나의 「보내는 곳」 — 받은 센서 값을 Home Assistant 와 같은 받기(`HaService::ingest`)로 넘깁니다.

- 받는 곳: `POST /api/plugins/custom-iot_link/smartthings` (Target URL) — 모든 요청의 HTTP 서명(rsa-sha256 · Digest · Date)을 확인
- 권한(Scopes): `r:devices:*` · `r:locations:*` (읽기만)
- 관리자 › IoT 연결 › 📡 SmartThings 에 등록 안내가 있습니다. 요약:
  1. 관리자 화면에서 「SmartThings 연결 쓰기」를 켜고 저장
  2. [Developer Workspace](https://developer.smartthings.com/workspace) → New Project → *Automation for the SmartThings App*
  3. Register App → *WebHook Endpoint* → Target URL 붙여 넣기 → 이름 · 설명 · 권한 두 개 → Save
  4. 나온 Client ID · Client Secret(한 번만 보임)을 관리자 화면에 저장 (App ID 는 선택)
  5. *Verify App Registration* → 사이트가 CONFIRMATION 을 알아서 확인 → *Deploy to Test*
  6. 다른 회원도 쓰려면 Workspace 에서 배포(Publish) 신청 — Deploy to Test 는 그 개발자 계정만 설치 가능
- 회원: `/iot-link` 의 SmartThings 카드 → 🔑 연결 코드 만들기 → SmartThings 앱 › 자동화 › ＋ › 루틴 추가 › 발견 › 이 앱 → 코드 적기 → 센서 고르기
- 값: 온도(°F→°C) · 습도 → 기기 온습도, 전원 스위치 · 전력(W 기준) → 가동 상태, 문 · 움직임 · 재실 · 누수 · 배터리 · 전력량 · 밝기 → 센서 값
- 토큰은 Laravel Crypt 로 암호화 · 끝나 가면 refresh_token 으로 새로 받음 (`APP_KEY` 를 바꾸면 회원이 앱 설정을 한 번 더 저장해야 함)

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
