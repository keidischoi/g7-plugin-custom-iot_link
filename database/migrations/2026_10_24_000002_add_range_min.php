<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * IoT 연결 1.9.0 — hal_devices.humidity_min · temp_min (🔔 알림 구간 아래 기준)
 *  표 정의는 src/Support/Schema.php 한 곳 (처음 쓸 때 자동 생성과 같음).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! class_exists(Schema::class)) {
            require_once dirname(__DIR__, 2).'/src/Support/Schema.php';
        }
        Schema::ensure();
    }

    public function down(): void
    {
        if (S::hasTable('hal_devices') && S::hasColumn('hal_devices', 'humidity_min')) {
            S::table('hal_devices', fn ($t) => $t->dropColumn(['humidity_min', 'temp_min']));
        }
    }
};
