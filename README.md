# 🏠 HA 연결 (custom-ha_link)

G7(그누보드7) 플러그인. 회원의 Home Assistant · SmartThings 가 보내는 온습도 · 프린터 · 장비 상태를 받아 정비 수첩(custom-maintenance) · 내 프린터(custom-my_printer) · 업체 장비(custom-companies)에 잇습니다.

- 사이트가 회원 집으로 접속하지 않습니다. 회원이 자기 Home Assistant 에 `rest_command` + `automation` 을 붙여 넣으면 값이 들어옵니다 (화면이 설정 글을 만들어 줌).
- 받는 주소: `POST /api/plugins/custom-ha_link/in/{비밀 키}` — `{"temperature": 23.4, "humidity": 41, "state": "running", "progress": 42, "remaining_min": 75, "job": "…"}` (있는 것만)
- 화면 `/ha-link` · 관리자 `/admin/ha-link`

## 📡 SmartThings (0.2.0, WebHook SmartApp)

SmartThings 는 또 하나의 「보내는 곳」 — 받은 센서 값을 Home Assistant 와 같은 받기(`HaService::ingest`)로 넘깁니다.

- 받는 곳: `POST /api/plugins/custom-ha_link/smartthings` (Target URL) — 모든 요청의 HTTP 서명(rsa-sha256 · Digest · Date)을 확인
- 권한(Scopes): `r:devices:*` · `r:locations:*` (읽기만)
- 관리자 › HA 연결 › 📡 SmartThings 에 등록 안내가 있습니다. 요약:
  1. 관리자 화면에서 「SmartThings 연결 쓰기」를 켜고 저장
  2. [Developer Workspace](https://smartthings.developer.samsung.com/workspace/) → New Project → *Automation for the SmartThings App*
  3. Register App → *WebHook Endpoint* → Target URL 붙여 넣기 → 이름 · 설명 · 권한 두 개 → Save
  4. 나온 Client ID · Client Secret(한 번만 보임)을 관리자 화면에 저장 (App ID 는 선택)
  5. *Verify App Registration* → 사이트가 CONFIRMATION 을 알아서 확인 → *Deploy to Test*
  6. 다른 회원도 쓰려면 Workspace 에서 배포(Publish) 신청 — Deploy to Test 는 그 개발자 계정만 설치 가능
- 회원: `/ha-link` 의 SmartThings 카드 → 🔑 연결 코드 만들기 → SmartThings 앱 › 자동화 › ＋ › 루틴 추가 › 발견 › 이 앱 → 코드 적기 → 센서 고르기
- 값: 온도(°F→°C) · 습도 → 기기 온습도, 전원 스위치 · 전력(W 기준) → 가동 상태, 문 · 움직임 · 재실 · 누수 · 배터리 · 전력량 · 밝기 → 센서 값
- 토큰은 Laravel Crypt 로 암호화 · 끝나 가면 refresh_token 으로 새로 받음 (`APP_KEY` 를 바꾸면 회원이 앱 설정을 한 번 더 저장해야 함)

## 설치 (NAS)

```
php82 artisan plugin:install custom-ha_link; php82 artisan plugin:activate custom-ha_link; php82 artisan hooks:cache; php82 artisan cache:clear
```

## 업데이트 (0.2.0 — 마이그레이션 · 레이아웃 바뀜)

```
sudo -u http php82 artisan plugin:update custom-ha_link --force --layout-strategy=overwrite
sudo -u http php82 artisan migrate --force
sudo -u http php82 artisan hooks:clear
sudo -u http php82 artisan cache:clear
sudo -u http php82 artisan ext-static:publish --force
```

## 검사

```
php tests/run.php
G7_VENDOR=…/vendor php tests/sim.php
```
