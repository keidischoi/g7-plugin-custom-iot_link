<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 1.4.0 다른 확장에 묻는 곳 한 군데 — 그 확장 표를 직접 읽지 않음 (없거나 꺼져 있거나 실패하면 빈 값).
 *  - 업체검색(custom-companies)   Api\Companies — 내가 대표 · 관리자인 업체
 *  - 재고 관리(custom-inventory)  Api\Inventory — 업체 보유 장비 · 필라멘트 보관 위치 · 그 위치에 있는 것
 */
final class Links
{
    public const COMPANIES = 'Modules\\Custom\\Companies\\Api\\Companies';

    public const INVENTORY = 'Modules\\Custom\\Inventory\\Api\\Inventory';

    /** 검사용 — ['companies' => class, 'inventory' => class] 로 바꿔 끼움 */
    public static array $override = [];

    private static function call(string $key, string $default, string $fn, mixed $fallback, mixed ...$args): mixed
    {
        $c = self::$override[$key] ?? $default;
        try {
            if (! class_exists($c) || ! method_exists($c, 'active') || ! $c::active() || ! method_exists($c, $fn)) {
                return $fallback;
            }
            $r = $c::$fn(...$args);

            return gettype($r) === gettype($fallback) ? $r : $fallback;
        } catch (\Throwable) {
            return $fallback;
        }
    }

    public static function inventoryOn(): bool
    {
        $c = self::$override['inventory'] ?? self::INVENTORY;
        try {
            return class_exists($c) && $c::active();
        } catch (\Throwable) {
            return false;
        }
    }

    /** @return list<array{id: int, name: string}> 회원이 대표 · 관리자인 업체 (이름순) */
    public static function companiesOf(int $uid): array
    {
        $out = [];
        foreach (self::call('companies', self::COMPANIES, 'companiesOf', [], $uid, ['owner', 'manager']) as $c) {
            if (is_array($c) && (int) ($c['id'] ?? 0) > 0) {
                $out[] = ['id' => (int) $c['id'], 'name' => (string) ($c['name'] ?? '')];
            }
        }
        usort($out, static fn ($a, $b) => strcmp($a['name'], $b['name']));

        return $out;
    }

    /** 1.5.0 🏢 회원이 속한 업체 — 직원도 (업체 기기 보기) @return list<array{id: int, name: string, role: string}> */
    public static function memberCompaniesOf(int $uid): array
    {
        $out = [];
        foreach (self::call('companies', self::COMPANIES, 'companiesOf', [], $uid, ['owner', 'manager', 'staff']) as $c) {
            if (is_array($c) && (int) ($c['id'] ?? 0) > 0) {
                $out[] = ['id' => (int) $c['id'], 'name' => (string) ($c['name'] ?? ''), 'role' => (string) ($c['role'] ?? '')];
            }
        }
        usort($out, static fn ($a, $b) => strcmp($a['name'], $b['name']));

        return $out;
    }

    /** 1.5.0 이 플러그인이 내 업체에 맡긴 값 (keep_days — 업체 센서 기록 보관) @return array<string, mixed> */
    public static function companyData(int $cid): array
    {
        $l = $cid > 0 ? self::call('companies', self::COMPANIES, 'link', [], $cid, 'custom-iot_link') : [];   // 기본값이 배열이어야 결과(배열)를 받음

        return is_array($l) && is_array($l['data'] ?? null) ? $l['data'] : [];
    }

    /** @param list<int> $cids @return array<int, array{id: int, company_id: int, name: string}> 장비 번호(재고 관리) → … */
    public static function equipment(array $cids): array
    {
        $out = [];
        foreach ($cids ? self::call('inventory', self::INVENTORY, 'equipmentFor', [], $cids) : [] as $list) {
            foreach ((array) $list as $e) {
                $out[(int) $e['id']] = ['id' => (int) $e['id'], 'company_id' => (int) $e['company_id'], 'name' => (string) ($e['name'] ?? '')];
            }
        }

        return $out;
    }

    /** @return list<string> 회원의 필라멘트 보관 위치 (개인 것 + 속한 업체 것) */
    public static function spoolLocations(int $uid): array
    {
        return array_values(array_map('strval', self::call('inventory', self::INVENTORY, 'spoolLocations', [], $uid)));
    }

    /** @return array{mine: list<string>, company: list<string>} 그 보관 위치에 있는 것 */
    public static function spoolsAt(int $uid, string $location): array
    {
        $r = self::call('inventory', self::INVENTORY, 'spoolsAt', [], $uid, $location);

        return ['mine' => array_values((array) ($r['mine'] ?? [])), 'company' => array_values((array) ($r['company'] ?? []))];
    }

    /** 1.4.11 센서 보관 위치를 바꿈 — 옛 보관함이 비면 재고 관리가 보관함 이름을 따라 바꿈 (재고 관리 0.3.40+) */
    public static function sensorMoved(int $uid, string $from, string $to): bool
    {
        $r = self::call('inventory', self::INVENTORY, 'sensorMoved', [], $uid, $from, $to);

        return (bool) ($r['renamed'] ?? false);
    }
}
