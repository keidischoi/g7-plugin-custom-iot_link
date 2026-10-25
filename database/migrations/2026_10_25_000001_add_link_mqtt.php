<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * IoT 연결 1.15.0 — hal_links.mqtt (📨 MQTT 중계 — 브로커 설정 · 고른 토픽)
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
        if (S::hasTable('hal_links') && S::hasColumn('hal_links', 'mqtt')) {
            S::table('hal_links', fn ($t) => $t->dropColumn('mqtt'));
        }
    }
};
