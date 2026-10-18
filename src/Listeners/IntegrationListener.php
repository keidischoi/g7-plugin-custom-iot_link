<?php

namespace Plugins\Custom\IotLink\Listeners;

use App\Contracts\Extension\HookListenerInterface;
use Plugins\Custom\IotLink\Services\HaService;

/**
 * 다른 확장과 잇는 곳
 *  - 회원 삭제(core.user.after_delete): 이 회원의 기기 · 기록 정리
 *  - 공개 사진(custom-iot_link.printer_snapshot · 예전 이름 custom-ha_link.printer_snapshot 도): 그 「내 프린터」에 붙인 기기의 카메라 사진 — 회원이 공개로 둔 것만.
 *    쓰는 쪽: HookManager::applyFilters('custom-iot_link.printer_snapshot', null, $printerId) → ['url' => …, 'at' => …] 또는 null
 *  - 1.2.0 주변 온습도(custom-iot_link.printer_env): 그 「내 프린터」에 붙인 기기의 온도 · 습도 (Home Assistant · SmartThings) → ['temp', 'humidity', 'at', 'source', 'name'] 또는 null
 *  - 1.2.0 보내는 곳(custom-iot_link.sources): ['ha' => bool, 'smartthings' => bool] — 프린터 라운지가 자동 연결에 SmartThings 를 보일지
 *  (정비 수첩 · 내 프린터 · 업체 장비는 서비스가 표를 읽거나 그 서비스에 넘김 — 그 확장 코드는 고치지 않음)
 */
class IntegrationListener implements HookListenerInterface
{
    public static function getSubscribedHooks(): array
    {
        return [
            'core.user.after_delete' => ['method' => 'onUserDeleted', 'priority' => 60, 'sync' => true],
            'custom-iot_link.printer_snapshot' => ['method' => 'printerSnapshot', 'priority' => 50, 'type' => 'filter', 'sync' => true],
            // 1.0.0 예전 이름 — 내 프린터 0.1.26 이하는 이 이름으로만 물음
            'custom-ha_link.printer_snapshot' => ['method' => 'printerSnapshot', 'priority' => 50, 'type' => 'filter', 'sync' => true],
            // 1.2.0 프린터 라운지(내 프린터 0.1.28+)가 물음 — 그 프린터에 붙인 기기의 온습도 · 쓸 수 있는 보내는 곳(SmartThings 켜짐)
            'custom-iot_link.printer_env' => ['method' => 'printerEnv', 'priority' => 50, 'type' => 'filter', 'sync' => true],
            'custom-iot_link.sources' => ['method' => 'sources', 'priority' => 50, 'type' => 'filter', 'sync' => true],
            // 1.5.0 🏢 내 업체 › 고치기 「📡 IoT 연결」 칸 (센서 기록 보관) · 업체별 안내 (업체 기기 수 · 연결 끊김 · 바로 가기)
            'custom-companies.form.sections' => ['method' => 'companyForm', 'priority' => 35, 'type' => 'filter'],
            'custom-companies.me.info' => ['method' => 'companyInfo', 'priority' => 35, 'type' => 'filter'],
        ];
    }

    public function handle(...$args): void {}

    /** 1.5.0 🏢 내 업체 고치기 화면 칸 @return list<array<string, mixed>> */
    public function companyForm(mixed $list = []): array
    {
        $list = is_array($list) ? array_values($list) : [];
        if (! \Plugins\Custom\IotLink\Support\Settings::get('enabled') || ! \Plugins\Custom\IotLink\Support\Settings::get('company_link')) {
            return $list;
        }
        $site = (int) \Plugins\Custom\IotLink\Support\Settings::get('keep_days');
        $list[] = ['ext' => 'custom-iot_link', 'title' => 'IoT 연결', 'emoji' => '📡',
            'desc' => implode("\n", [
                '📡 업체 장비 · 업체 프린터에 붙인 센서(온습도계 · 플러그 · 카메라)는 「🏢 업체 기기」로 따로 모여요 — 대표 · 매니저가 함께 고치고, 직원은 보기만.',
                '🗑 센서 기록(한 시간에 한 줄)은 사이트 기본 '.$site.'일 보관 — 아래에서 더 짧게 정할 수 있어요 (0 = 사이트 기본 · 더 길게는 안 돼요).',
            ]),
            'fields' => [['key' => 'keep_days', 'label' => '🗑 센서 기록 보관(일)', 'type' => 'number', 'min' => 0, 'max' => 365, 'default' => 0, 'help' => '0 = 사이트 기본 ('.$site.'일)']]];

        return $list;
    }

    /** 1.5.0 🏢 내 업체 화면의 업체별 안내 (업체 사람에게) @return list<array<string, mixed>> */
    public function companyInfo(mixed $list = [], mixed $companyId = 0, mixed $uid = 0, mixed $role = ''): array
    {
        $list = is_array($list) ? array_values($list) : [];
        $cid = (int) $companyId;
        try {
            $svc = new HaService();
            if ($cid < 1 || ! \Plugins\Custom\IotLink\Support\Settings::get('enabled') || ! in_array($cid, array_column($svc->memberCompanies((int) $uid), 'id'), true)) {
                return $list;
            }
            $rows = \Illuminate\Support\Facades\DB::table(\Plugins\Custom\IotLink\Support\Schema::DEVICES)->where('company_id', $cid)->get(['last_seen_at']);
            $cut = date('Y-m-d H:i:s', time() - (int) \Plugins\Custom\IotLink\Support\Settings::get('stale_hours') * 3600);
            $stale = $rows->filter(fn ($r) => ! $r->last_seen_at || (string) $r->last_seen_at < $cut)->count();
            $list[] = ['ext' => 'custom-iot_link', 'title' => 'IoT 연결', 'emoji' => '📡',
                'lines' => [$rows->count() ? '📡 업체 기기 '.$rows->count().'개'.($stale ? ' · 📴 소식 없음 '.$stale.'개' : ' · 모두 연결됨').' · 기록 '.HaService::companyKeepDays($cid).'일 보관' : '아직 업체 기기가 없어요 — IoT 연결에서 업체 장비 · 업체 프린터에 센서를 붙이면 여기에 모여요.'],
                'links' => [['label' => '📡 업체 기기 보기', 'url' => '/iot-link?scope=company&c='.$cid]]];
        } catch (\Throwable) {
        }

        return $list;
    }

    public function printerSnapshot(mixed $value = null, mixed $printerId = 0): mixed
    {
        try {
            return (new HaService())->printerSnapshot((int) (is_scalar($printerId) ? $printerId : 0)) ?? $value;
        } catch (\Throwable) {
            return $value;
        }
    }

    public function printerEnv(mixed $value = null, mixed $printerId = 0): mixed
    {
        try {
            return (new HaService())->printerEnv((int) (is_scalar($printerId) ? $printerId : 0)) ?? $value;
        } catch (\Throwable) {
            return $value;
        }
    }

    public function sources(mixed $value = null): mixed
    {
        try {
            return (new HaService())->sources();
        } catch (\Throwable) {
            return $value;
        }
    }

    public function onUserDeleted(mixed $user = null): void
    {
        try {
            (new HaService())->removeUser(is_object($user) ? (int) ($user->id ?? 0) : (int) $user);
        } catch (\Throwable) {
        }
    }
}
