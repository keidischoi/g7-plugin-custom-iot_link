<?php

namespace Plugins\Custom\IotLink\Console;

use Illuminate\Console\Command;
use Plugins\Custom\IotLink\Services\SmartThingsService;

/**
 * php artisan custom-iot_link:st-poll [--max=50] — 1.4.4 SmartThings 자동 다시 잇기 (스케줄 15분마다)
 *  회원이 화면을 보지 않아도: 값이 오래(st_poll_min) 안 온 기기는 지금 값을 물어보고 빠진 구독은 다시 만듦 · 로그인 토큰은 미리 새로 받음
 */
class StPollCommand extends Command
{
    protected $signature = 'custom-iot_link:st-poll {--max=50 : 한 번에 다시 이을 SmartThings 위치 수}';

    protected $description = 'IoT 연결 — SmartThings 끊긴 기기 자동 다시 잇기 · 토큰 미리 새로 받기';

    public function handle(): int
    {
        $r = (new SmartThingsService())->pollAll(max(1, min(500, (int) $this->option('max'))));
        $this->info('다시 이은 위치 '.$r['polled'].'곳 · 토큰 확인 '.$r['fresh'].'곳');

        return self::SUCCESS;
    }
}
