<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * IoT 연결 (0.1.0 — 예전 이름 HA 연결 custom-ha_link) — 표 정의는 src/Support/Schema.php 한 곳 (처음 쓸 때 자동 생성과 같음).
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
        foreach (['hal_runs', 'hal_readings', 'hal_devices', 'hal_links', 'hal_settings'] as $t) {
            S::dropIfExists($t);
        }
    }
};
