<?php

namespace Plugins\Custom\IotLink\Api;

use Illuminate\Support\Facades\DB;
use Plugins\Custom\IotLink\Services\HaService;
use Plugins\Custom\IotLink\Support\Rules;
use Plugins\Custom\IotLink\Support\Schema;
use Plugins\Custom\IotLink\Support\Settings;

/**
 * 1.4.0 🏠 IoT 연결(HA · SmartThings)이 다른 확장에 알려 주는 것 — 그 확장이 hal_* 표를 직접 읽지 않도록 (재고 관리 · 정비 수첩).
 *
 *   $H = \Plugins\Custom\IotLink\Api\Ha::class;
 *   if (class_exists($H) && $H::active()) { $hours = $H::runHours('equipment_id', $id, '2026-10-01 00:00:00'); }
 *
 * 꺼져 있거나 실패하면 빈 값 (null · []).
 */
final class Ha
{
    public const VERSION = '1.16.10';

    public static function active(): bool
    {
        try {
            return (bool) Settings::get('enabled') && Schema::ensure();
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * 보관함에 붙인 센서 — 그 회원들 것 (첫 번째 회원 것이 먼저)
     *
     * @param  list<int>  $userIds
     * @return list<array{user_id: int, location: string, name: string, temp: ?float, humidity: ?float, humidity_max: ?int, last_seen_at: ?string}>
     */
    public static function locationSensors(array $userIds): array
    {
        $ids = self::ids($userIds);
        if ($ids === [] || ! self::active()) {
            return [];
        }
        try {
            (new \Plugins\Custom\IotLink\Services\SmartThingsService())->pollDue($ids);   // 1.4.1 SmartThings 값이 오래 안 왔으면 지금 값을 물어봄 (응답 뒤에)
        } catch (\Throwable) {
        }
        try {
            // 1.6.0 📦 보관함 하나에 🌡️ 온도 센서 · 💧 습도 센서가 따로 붙을 수 있음 — 회원 · 보관함마다 한 줄로 합침 (값은 먼저 붙인 것 · 마지막 소식은 늦은 쪽)
            $out = [];
            foreach (DB::table(Schema::DEVICES)->whereIn('user_id', $ids)->where('target', 'location')->whereNotNull('location')->where('location', '!=', '')
                ->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$ids[0]])->orderBy('id')->get() as $d) {
                $k = (int) $d->user_id.'|'.(int) ($d->company_id ?? 0).'|'.Rules::loc((string) $d->location);   // 1.7.19 개인 보관함 · 업체 보관함은 따로
                $row = ['user_id' => (int) $d->user_id, 'company_id' => (int) ($d->company_id ?? 0), 'location' => (string) $d->location, 'name' => (string) $d->name,
                    'temp' => $d->temp !== null ? (float) $d->temp : null, 'humidity' => $d->humidity !== null ? (float) $d->humidity : null,
                    'humidity_max' => $d->humidity_max !== null ? (int) $d->humidity_max : null, 'last_seen_at' => $d->last_seen_at !== null ? (string) $d->last_seen_at : null,
                    // 1.9.0 🔔 보관함에서 바로 구간 고치기 — 습도 · 온도를 재는 기기 번호와 그 구간
                    'humidity_min' => isset($d->humidity_min) ? (int) $d->humidity_min : null, 'temp_min' => isset($d->temp_min) ? (int) $d->temp_min : null, 'temp_max' => $d->temp_max !== null ? (int) $d->temp_max : null,
                    'hum_id' => $d->humidity !== null || $d->humidity_max !== null ? (int) $d->id : null, 'temp_id' => $d->temp !== null || $d->temp_max !== null ? (int) $d->id : null];
                if (! isset($out[$k])) {
                    $out[$k] = $row;
                    continue;
                }
                $o = &$out[$k];
                $o['name'] .= ' · '.$row['name'];
                foreach (['temp', 'humidity', 'humidity_max', 'humidity_min', 'temp_min', 'temp_max', 'hum_id', 'temp_id'] as $f) {   // 1.9.0 구간 · 기기 번호도
                    $o[$f] ??= $row[$f];
                }
                if ($row['last_seen_at'] !== null && ($o['last_seen_at'] === null || $row['last_seen_at'] < $o['last_seen_at'])) {
                    $o['last_seen_at'] = $row['last_seen_at'];   // 하나라도 끊기면 끊김으로 보이게
                }
                unset($o);
            }

            return array_values($out);
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * 보관함마다 시간별 습도 기록 (보관 위치는 빈칸 · 대소문자 무시 — 같은 위치에 센서가 여럿이면 첫 번째 회원 것)
     *
     * @param  list<int>  $userIds
     * @return array<string, array{limit: ?int, rows: list<array{0: string, 1: float}>}>
     */
    public static function humidityHistory(array $userIds): array
    {
        $ids = self::ids($userIds);
        if ($ids === [] || ! self::active()) {
            return [];
        }
        try {
            $devs = DB::table(Schema::DEVICES)->whereIn('user_id', $ids)->where('target', 'location')->whereNotNull('location')
                ->orderByRaw('CASE WHEN user_id = ? THEN 0 ELSE 1 END', [$ids[0]])->orderBy('id')->get(['id', 'location', 'humidity_max']);
            if ($devs->isEmpty()) {
                return [];
            }
            $rows = [];
            foreach (DB::table(Schema::READINGS)->whereIn('device_id', $devs->pluck('id')->all())->whereNotNull('humidity')->orderBy('at')->get(['device_id', 'at', 'humidity']) as $r) {
                $rows[(int) $r->device_id][] = [(string) $r->at, (float) $r->humidity];
            }
            $out = [];
            foreach ($devs as $d) {
                $loc = Rules::loc((string) $d->location);
                if ($loc !== '' && ! isset($out[$loc]) && isset($rows[(int) $d->id])) {
                    $out[$loc] = ['limit' => $d->humidity_max !== null ? (int) $d->humidity_max : null, 'rows' => $rows[(int) $d->id]];
                }
            }

            return $out;
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * 1.7.12 📦 보관함 통째로 옮기기 따라가기 (재고 관리 0.3.83) — 그 보관함(빈칸 · 대소문자 무시)에 붙은 센서를 개인 ↔ 업체로. 옮긴 센서 수
     *  from · to = 업체 번호 (0 = 개인 — 이 회원 것)
     */
    public static function moveLocation(int $uid, string $name, int $from, int $to): int
    {
        $key = Rules::loc($name);
        if ($uid <= 0 || $key === '' || $from === $to || ! self::active()) {
            return 0;
        }
        try {
            $q = DB::table(Schema::DEVICES)->where('target', 'location')->whereNotNull('location');
            $q = $from > 0 ? $q->where('company_id', $from) : $q->where('user_id', $uid)->where(static fn ($w) => $w->whereNull('company_id')->orWhere('company_id', 0));
            $ids = $q->get(['id', 'location'])->filter(static fn ($d) => Rules::loc((string) $d->location) === $key)->pluck('id')->all();

            return $ids ? DB::table(Schema::DEVICES)->whereIn('id', $ids)->update(['company_id' => $to > 0 ? $to : null, 'updated_at' => now()]) : 0;
        } catch (\Throwable) {
            return 0;
        }
    }

    /**
     * 1.4.10 보관함 이름 바꾸기 따라가기 — 이 회원의 보관함 센서(target location) 중 위치가 $from 인 것(빈칸 · 대소문자 무시)을 $to 로.
     * 읽은 값 · 기록은 기기 번호로 남아 그대로 이어짐. 바꾼 센서 수.
     */
    public static function renameLocation(int $uid, string $from, string $to): int
    {
        $old = Rules::loc($from);
        $to = mb_substr(trim(strip_tags($to)), 0, 40);
        if ($uid <= 0 || $old === '' || $to === '' || ! self::active()) {
            return 0;
        }
        try {
            $ids = DB::table(Schema::DEVICES)->where('user_id', $uid)->where('target', 'location')->whereNotNull('location')->get(['id', 'location'])
                ->filter(static fn ($d) => Rules::loc((string) $d->location) === $old)->pluck('id')->all();

            return $ids ? DB::table(Schema::DEVICES)->whereIn('id', $ids)->update(['location' => $to, 'updated_at' => now()]) : 0;
        } catch (\Throwable) {
            return 0;
        }
    }

    /** 이 회원이 사이트 화면(재고 관리 · 정비 수첩)을 보고 있음 — 「자리 비움」이면 값을 느리게 받으므로 (1분에 한 번만 적음) */
    public static function touch(int $uid): void
    {
        if ($uid > 0 && self::active()) {
            try {
                (new HaService())->touchSeen($uid);
            } catch (\Throwable) {
            }
        }
    }

    /**
     * 그 프린터(printer_id) · 장비(equipment_id — 재고 관리 장비 번호)에 붙인 기기들의 가동 시간 (그 뒤로, 시간 · 소수 한 자리).
     * 켜져 있는 구간은 그 기기의 마지막 소식 때까지. 붙인 기기가 없으면 null.
     */
    public static function runHours(string $col, int $id, string $since): ?float
    {
        if (! in_array($col, ['printer_id', 'equipment_id'], true) || $id <= 0 || ! self::active()) {
            return null;
        }
        try {
            $seen = DB::table(Schema::DEVICES)->where($col, $id)->pluck('last_seen_at', 'id');
            if ($seen->isEmpty()) {
                return null;
            }
            $sec = 0;
            $from = strtotime($since);
            foreach (DB::table(Schema::RUNS)->whereIn('device_id', $seen->keys()->all())->where(fn ($w) => $w->whereNull('ended_at')->orWhere('ended_at', '>', $since))->get() as $r) {
                $a = max($from, strtotime((string) $r->started_at));
                $b = strtotime((string) ($r->ended_at ?? $seen[$r->device_id] ?? $r->started_at));
                $sec += max(0, $b - $a);
            }

            return round($sec / 3600, 1);
        } catch (\Throwable) {
            return null;
        }
    }

    /** @param list<int> $ids @return list<int> */
    private static function ids(array $ids): array
    {
        return array_values(array_unique(array_filter(array_map('intval', $ids), static fn ($i) => $i > 0)));
    }
}
