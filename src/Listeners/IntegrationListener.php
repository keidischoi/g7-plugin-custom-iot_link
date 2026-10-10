<?php

namespace Plugins\Custom\IotLink\Listeners;

use App\Contracts\Extension\HookListenerInterface;
use Plugins\Custom\IotLink\Services\HaService;

/**
 * 다른 확장과 잇는 곳
 *  - 회원 삭제(core.user.after_delete): 이 회원의 기기 · 기록 정리
 *  - 공개 사진(custom-iot_link.printer_snapshot · 예전 이름 custom-ha_link.printer_snapshot 도): 그 「내 프린터」에 붙인 기기의 카메라 사진 — 회원이 공개로 둔 것만.
 *    쓰는 쪽: HookManager::applyFilters('custom-iot_link.printer_snapshot', null, $printerId) → ['url' => …, 'at' => …] 또는 null
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
        ];
    }

    public function handle(...$args): void {}

    public function printerSnapshot(mixed $value = null, mixed $printerId = 0): mixed
    {
        try {
            return (new HaService())->printerSnapshot((int) (is_scalar($printerId) ? $printerId : 0)) ?? $value;
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
