<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * IoT 연결 1.4.6 — hal_devices.grp (📁 분류: 장비 · 개인 재고 · 업체마다 · 미분류)
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
        if (S::hasTable('hal_devices') && S::hasColumn('hal_devices', 'grp')) {
            S::table('hal_devices', fn ($t) => $t->dropColumn('grp'));
        }
    }
};
