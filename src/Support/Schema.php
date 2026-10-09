<?php

namespace Plugins\Custom\HaLink\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema as S;

/**
 * 표 정의 한 곳 (마이그레이션 · 처음 쓸 때 자동 생성).
 *  hal_devices   회원이 연결한 기기 (Home Assistant 가 값을 보내는 주소 하나) — 온습도 · 상태, 어디에 붙였는지
 *  hal_readings  온습도 기록 (기기마다 한 시간에 한 줄)
 *  hal_runs      가동 기록 (켜짐 · 출력 중이던 구간 — 정비 수첩이 「가동 몇 시간마다」에 씀)
 *  hal_links     회원의 연결 코드 (HACS 통합이 이 코드로 사이트와 이어짐 — 기기를 만들고 고침)
 *  hal_settings  관리자 설정
 */
final class Schema
{
    public const DEVICES = 'hal_devices';

    public const READINGS = 'hal_readings';

    public const RUNS = 'hal_runs';

    public const SETTINGS = 'hal_settings';

    public const LINKS = 'hal_links';

    public const TABLES = [self::DEVICES, self::READINGS, self::RUNS, self::SETTINGS, self::LINKS];

    private static bool $ok = false;

    public static function ensure(): bool
    {
        if (self::$ok) {
            return true;
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
                    $t->unsignedBigInteger('equipment_id')->nullable()->index()->comment('업체 보유 장비 cmp_equipment.id');
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

            return self::$ok = true;
        } catch (\Throwable $e) {
            try {
                \Illuminate\Support\Facades\Log::warning('[custom-ha_link] 표를 만들지 못했습니다.', ['error' => $e->getMessage()]);
            } catch (\Throwable) {
            }

            return false;
        }
    }
}
