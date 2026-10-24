<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * IoT 연결 1.8.0 — hal_devices.ha_server · ha_server_name (🏠 HA 서버마다 — 통합 0.4.0+ 가 알려 줌)
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
        if (S::hasTable('hal_devices') && S::hasColumn('hal_devices', 'ha_server')) {
            S::table('hal_devices', fn ($t) => $t->dropColumn(['ha_server', 'ha_server_name']));
        }
    }
};
