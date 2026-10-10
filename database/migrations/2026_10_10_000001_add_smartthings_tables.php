<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema as S;
use Plugins\Custom\HaLink\Support\Schema;

/**
 * HA 연결 0.2.0 — SmartThings (WebHook SmartApp): hal_st_installs · hal_st_sensors · hal_st_codes + hal_devices.source
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
        foreach (['hal_st_sensors', 'hal_st_installs', 'hal_st_codes'] as $t) {
            S::dropIfExists($t);
        }
        if (S::hasTable('hal_devices') && S::hasColumn('hal_devices', 'source')) {
            S::table('hal_devices', function (Blueprint $t) {
                $t->dropColumn('source');
            });
        }
    }
};
