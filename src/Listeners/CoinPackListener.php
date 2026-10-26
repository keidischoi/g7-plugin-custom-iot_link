<?php

namespace Plugins\Custom\IotLink\Listeners;

use App\Contracts\Extension\HookListenerInterface;

/**
 * 1.17.7 📦 코인 팩(custom-coin 2.0.2 · 🛍 상점) — 센서 칸 「내 기기 ×N」(custom-iot_link:slot) · 「업체 기기 ×N」(custom-iot_link:company_slot)을 읽는다고 알림.
 * 팩이 있으면 Limits::member · company 한도에 더해짐 (팩이 끝나도 붙인 기기는 지우지 않음 — 새로 붙이기만 막힘, 산 칸과 같음).
 */
class CoinPackListener implements HookListenerInterface
{
    public static function getSubscribedHooks(): array
    {
        return ['custom-coin.pack_items' => ['method' => 'items', 'priority' => 20, 'type' => 'filter']];
    }

    public function handle(...$args): void {}

    public function items(mixed $keys = []): array
    {
        return array_values(array_unique(array_merge(is_array($keys) ? $keys : [], ['custom-iot_link:slot', 'custom-iot_link:company_slot'])));
    }
}
