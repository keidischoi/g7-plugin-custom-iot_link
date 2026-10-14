<?php

namespace Plugins\Custom\IotLink\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema as S;

/**
 * 표 정의 한 곳 (마이그레이션 · 처음 쓸 때 자동 생성).
 *  hal_devices   회원이 연결한 기기 (Home Assistant 가 값을 보내는 주소 하나) — 온습도 · 상태, 어디에 붙였는지
 *  hal_readings  온습도 기록 (기기마다 한 시간에 한 줄)
 *  hal_runs      가동 기록 (켜짐 · 출력 중이던 구간 — 정비 수첩이 「가동 몇 시간마다」에 씀)
 *  hal_links     회원의 연결 코드 (HACS 통합이 이 코드로 사이트와 이어짐 — 기기를 만들고 고침).
 *                updated_at = 그 회원이 사이트의 IoT 연결 · 정비 수첩 화면을 마지막으로 본 때 (0.1.5 「자리 비움」 판단 — 칸을 늘리지 않으려고 이 칸을 씀)
 *  hal_settings  관리자 설정
 *  0.2.0 SmartThings (WebHook SmartApp)
 *  hal_st_installs  SmartThings 앱 설치 하나 (installedApp) — 회원 · 사이트 기기와 이음. 토큰은 Laravel Crypt 로 암호화해 둠
 *  hal_st_sensors   그 설치에서 고른 센서의 마지막 값 (capability · attribute 마다 한 줄)
 *  hal_st_codes     회원이 만든 일회용 연결 코드 (SmartThings 앱 설정 화면에 적음 · 30분 · 한 번)
 *  hal_devices.source  ha(Home Assistant · 기본) · smartthings
 *  1.1.0 SmartThings 로그인 연결 (API Access App · OAuth)
 *  hal_st_states    「SmartThings 연결하기」를 누른 회원의 일회용 state (15분 · 한 번) — 돌아온 요청이 그 회원 것인지 확인
 *  hal_st_installs.config  {mode: oauth, devices: [[칸, deviceId, componentId]], map: {deviceId: 사이트 기기 id}, power_on_w}
 */
final class Schema
{
    public const DEVICES = 'hal_devices';

    public const READINGS = 'hal_readings';

    public const RUNS = 'hal_runs';

    public const SETTINGS = 'hal_settings';

    public const LINKS = 'hal_links';

    public const ST_INSTALLS = 'hal_st_installs';

    public const ST_SENSORS = 'hal_st_sensors';

    public const ST_CODES = 'hal_st_codes';

    public const ST_STATES = 'hal_st_states';

    public const SLOTS = 'hal_slots';   // 1.4.8 💳 산 센서 칸

    public const TABLES = [self::DEVICES, self::READINGS, self::RUNS, self::SETTINGS, self::LINKS, self::ST_INSTALLS, self::ST_SENSORS, self::ST_CODES, self::ST_STATES, self::SLOTS];

    private static bool $ok = false;

    public static function ensure(): bool
    {
        if (self::$ok) {
            return true;
        }
        $ck = 'g7:ensure:'.md5(__FILE__).':'.@filemtime(__FILE__);   // 속도: 매 화면 표 확인 대신 — 확인한 뒤 하루 기억 (업데이트로 파일이 바뀌면 다시)
        try {
            if (\Illuminate\Support\Facades\Cache::get($ck) === 1) {
                return self::$ok = true;
            }
        } catch (\Throwable) {
        }
        try {
            if (! S::hasTable(self::DEVICES)) {
                S::create(self::DEVICES, function (Blueprint $t) {
                    $t->id();
                    $t->unsignedBigInteger('user_id')->index();
                    $t->string('token', 32)->unique()->comment('받는 주소의 비밀 키');
                    $t->string('name', 60);
                    $t->string('target', 12)->default('location')->index()->comment('location(필라멘트 · 레진 보관 위치) · printer(내 프린터) · equipment(업체 장비) · other');
                    $t->string('location', 40)->nullable()->index()->comment('정비 수첩 필라멘트의 보관 위치와 같은 글');
                    $t->unsignedBigInteger('printer_id')->nullable()->index()->comment('내 프린터 mpr_printers.id');
                    $t->unsignedBigInteger('company_id')->nullable()->index();
                    $t->unsignedBigInteger('equipment_id')->nullable()->index()->comment('업체 보유 장비 — 재고 관리 inv_equipment.id (예전 업체검색 cmp_equipment.id · 번호 같음)');
                    $t->text('entities')->nullable()->comment('HA 엔티티 이름 (설정 글을 만들 때만 씀) {temp, hum, state, progress, remaining, job}');
                    $t->decimal('temp', 5, 1)->nullable();
                    $t->decimal('humidity', 5, 1)->nullable();
                    $t->string('state', 40)->nullable()->comment('HA 가 보낸 상태 글 그대로');
                    $t->boolean('is_on')->default(false)->comment('가동 중 (출력 중 · 켜짐)');
                    $t->unsignedSmallInteger('humidity_max')->nullable()->comment('습도가 이 값을 넘으면 알림 (%)');
                    $t->smallInteger('temp_max')->nullable()->comment('온도가 이 값을 넘으면 알림 (°C)');
                    $t->boolean('notify')->default(true);
                    $t->dateTime('alerted_at')->nullable()->comment('기준을 넘어 알림을 보낸 때 (내려오면 비움)');
                    $t->dateTime('last_seen_at')->nullable();
                    $t->boolean('snap_public')->default(false)->comment('카메라 사진을 다른 사람에게 보임 (회원이 정함)');
                    $t->dateTime('snap_at')->nullable()->comment('카메라 사진을 마지막으로 받은 때 (기기마다 최신 한 장만 둠)');
                    $t->timestamps();
                });
            }
            if (! S::hasTable(self::READINGS)) {
                S::create(self::READINGS, function (Blueprint $t) {
                    $t->id();
                    $t->unsignedBigInteger('device_id');
                    $t->dateTime('at')->comment('그 시간 (정각)');
                    $t->decimal('temp', 5, 1)->nullable();
                    $t->decimal('humidity', 5, 1)->nullable();
                    $t->unique(['device_id', 'at']);
                });
            }
            if (! S::hasTable(self::RUNS)) {
                S::create(self::RUNS, function (Blueprint $t) {
                    $t->id();
                    $t->unsignedBigInteger('device_id')->index();
                    $t->dateTime('started_at')->index();
                    $t->dateTime('ended_at')->nullable();
                });
            }
            if (! S::hasTable(self::LINKS)) {
                S::create(self::LINKS, function (Blueprint $t) {
                    $t->id();
                    $t->unsignedBigInteger('user_id')->unique();
                    $t->string('code', 32)->unique()->comment('연결 코드 (비밀)');
                    $t->dateTime('used_at')->nullable()->comment('통합이 마지막으로 쓴 때');
                    $t->timestamps();
                });
            }
            if (! S::hasTable(self::SETTINGS)) {
                S::create(self::SETTINGS, function (Blueprint $t) {
                    $t->id();
                    $t->string('key', 40)->unique();
                    $t->longText('value')->nullable();
                    $t->timestamp('updated_at')->nullable();
                });
            }

            self::smartThings();

        try {
            \Illuminate\Support\Facades\Cache::put($ck, 1, 86400);
        } catch (\Throwable) {
        }
            return self::$ok = true;
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::warning('[custom-iot_link] 표를 만들지 못했습니다.', ['error' => $e->getMessage()]);
            } catch (\Throwable) {
            }

            return false;
        }
    }

    /** 0.2.0 SmartThings 표 · 칸 (마이그레이션 2026_10_10_000001 · 처음 쓸 때) */
    private static function smartThings(): void
    {
        if (! S::hasColumn(self::DEVICES, 'source')) {
            S::table(self::DEVICES, function (Blueprint $t) {
                $t->string('source', 16)->default('ha')->comment('ha(Home Assistant) · smartthings');
            });
        }
        if (! S::hasTable(self::ST_INSTALLS)) {
            S::create(self::ST_INSTALLS, function (Blueprint $t) {
                $t->id();
                $t->string('installed_app_id', 64)->unique();
                $t->string('location_id', 64)->nullable();
                $t->string('app_id', 64)->nullable();
                $t->unsignedBigInteger('user_id')->nullable()->index()->comment('이어진 회원 (연결 코드로)');
                $t->unsignedBigInteger('device_id')->nullable()->index()->comment('값을 넘길 사이트 기기 hal_devices.id');
                $t->text('auth_token')->nullable()->comment('암호화 (Crypt)');
                $t->text('refresh_token')->nullable()->comment('암호화 (Crypt)');
                $t->dateTime('token_expires_at')->nullable();
                $t->dateTime('refreshing_at')->nullable()->comment('토큰을 새로 받는 중 (한 번에 하나만)');
                $t->dateTime('token_checked_at')->nullable();
                $t->string('temp_scale', 2)->nullable()->comment('위치의 온도 단위 C · F');
                $t->string('location_name', 80)->nullable();
                $t->text('config')->nullable()->comment('고른 기기 {devices: [[칸, deviceId, componentId]], power_on_w}');
                $t->string('status', 16)->default('syncing')->comment('syncing · active · unlinked · error');
                $t->string('last_error', 160)->nullable();
                $t->dateTime('last_event_at')->nullable();
                $t->timestamps();
            });
        }
        if (! S::hasTable(self::SLOTS)) {   // 1.4.8 💳
            S::create(self::SLOTS, function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('user_id')->index()->comment('산 회원');
                $t->unsignedBigInteger('company_id')->nullable()->index()->comment('업체 칸이면 그 업체 (없으면 회원 칸)');
                $t->unsignedInteger('size')->default(1)->comment('센서 몇 개 (1 · 10)');
                $t->string('currency', 10);
                $t->unsignedBigInteger('amount')->default(0);
                $t->string('mode', 10)->default('once')->comment('once · monthly');
                $t->string('status', 10)->default('pending')->comment('pending · active · expired');
                $t->dateTime('expires_at')->nullable();
                $t->boolean('auto_renew')->default(true);
                $t->timestamps();
            });
        }
        if (S::hasTable(self::DEVICES) && ! S::hasColumn(self::DEVICES, 'grp')) {   // 1.4.6 📁 분류
            S::table(self::DEVICES, function (Blueprint $t) {
                $t->string('grp', 20)->nullable()->comment('1.4.6 분류 — 비우면 붙인 곳 따라 · equip(장비) · mine(개인 재고) · c{업체 번호} · none(미분류)');
            });
        }
        if (S::hasTable(self::ST_INSTALLS) && ! S::hasColumn(self::ST_INSTALLS, 'polled_at')) {
            S::table(self::ST_INSTALLS, function (Blueprint $t) {
                $t->dateTime('polled_at')->nullable()->comment('1.4.1 값이 오래 안 와서 지금 값을 직접 물어본 때');
            });
        }
        if (! S::hasTable(self::ST_SENSORS)) {
            S::create(self::ST_SENSORS, function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('install_id')->index();
                $t->string('st_device_id', 64);
                $t->string('component_id', 40)->default('main');
                $t->string('label', 80)->nullable();
                $t->string('capability', 60);
                $t->string('attribute', 60);
                $t->string('value', 60)->nullable();
                $t->string('unit', 12)->nullable();
                $t->decimal('num', 12, 2)->nullable();
                $t->dateTime('updated_at')->nullable();
                $t->unique(['install_id', 'st_device_id', 'component_id', 'capability', 'attribute'], 'hal_st_sensors_key');
            });
        }
        if (! S::hasTable(self::ST_CODES)) {
            S::create(self::ST_CODES, function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('user_id')->index();
                $t->string('code', 8)->unique();
                $t->unsignedBigInteger('device_id')->nullable()->comment('붙일 사이트 기기 (없으면 새로 만듦)');
                $t->dateTime('expires_at');
                $t->dateTime('used_at')->nullable();
                $t->timestamp('created_at')->nullable();
            });
        }
        // 1.1.0 로그인 연결 (OAuth)
        if (! S::hasTable(self::ST_STATES)) {
            S::create(self::ST_STATES, function (Blueprint $t) {
                $t->id();
                $t->unsignedBigInteger('user_id')->index();
                $t->string('state', 64)->unique();
                $t->dateTime('expires_at');
                $t->dateTime('used_at')->nullable();
                $t->timestamp('created_at')->nullable();
            });
        }
    }
}
