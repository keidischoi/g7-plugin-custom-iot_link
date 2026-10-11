<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * IoT 연결 1.4.1 — hal_st_installs.polled_at (값이 오래 안 와서 지금 값을 직접 물어본 때)
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
        if (S::hasTable('hal_st_installs') && S::hasColumn('hal_st_installs', 'polled_at')) {
            S::table('hal_st_installs', fn ($t) => $t->dropColumn('polled_at'));
        }
    }
};
