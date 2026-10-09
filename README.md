# 🏠 HA 연결 (custom-ha_link)

G7(그누보드7) 플러그인. 회원의 Home Assistant 가 보내는 온습도 · 프린터 · 장비 상태를 받아 정비 수첩(custom-maintenance) · 내 프린터(custom-my_printer) · 업체 장비(custom-companies)에 잇습니다.

- 사이트가 회원 집으로 접속하지 않습니다. 회원이 자기 Home Assistant 에 `rest_command` + `automation` 을 붙여 넣으면 값이 들어옵니다 (화면이 설정 글을 만들어 줌).
- 받는 주소: `POST /api/plugins/custom-ha_link/in/{비밀 키}` — `{"temperature": 23.4, "humidity": 41, "state": "running", "progress": 42, "remaining_min": 75, "job": "…"}` (있는 것만)
- 화면 `/ha-link` · 관리자 `/admin/ha-link`

## 설치 (NAS)

```
php82 artisan plugin:install custom-ha_link; php82 artisan plugin:activate custom-ha_link; php82 artisan hooks:cache; php82 artisan cache:clear
```

## 검사

```
php tests/run.php
G7_VENDOR=…/vendor php tests/sim.php
```
