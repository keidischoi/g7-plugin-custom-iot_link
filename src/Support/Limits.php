<?php

namespace Plugins\Custom\IotLink\Support;

use Illuminate\Support\Facades\DB;

/**
 * 1.4.7 IoT 기기 수 한도 — 회원마다 · 업체마다 (관리자 설정)
 *  - 회원: 「회원마다 다르게」 목록(번호 · 이메일) → 없으면 기본 max_devices
 *  - 업체: 「업체마다 다르게」 목록(번호) → 없으면 기본 max_devices_company (0 = 막지 않음)
 *  - 업체에 든 기기 = 📁 그 업체로 분류한 것 + 분류를 안 고르고 그 업체 장비에 붙인 것 (회원 모두 합쳐)
 */
final class Limits
{
    /** 1.4.9 관리자가 한도에서 빠질 때 쓰는 값 (사실상 무제한) */
    public const FREE = 100000;

    /** @var array<int, bool> */
    private static array $admin = [];

    /** 검사용 — 관리자로 볼 회원 번호 (비우면 진짜로 확인) @var list<int>|null */
    public static ?array $adminOverride = null;

    /** 1.4.9 관리자인가 (최고 관리자 · 관리자 역할) — 설정 「관리자 예외」가 켜져 있을 때만 */
    public static function exempt(int $uid): bool
    {
        if ($uid <= 0 || ! Settings::get('limit_admin_free')) {
            return false;
        }
        if (self::$adminOverride !== null) {
            return in_array($uid, self::$adminOverride, true);
        }
        if (isset(self::$admin[$uid])) {
            return self::$admin[$uid];
        }
        try {
            $m = 'App\\Models\\User';
            $u = class_exists($m) ? $m::find($uid) : null;

            return self::$admin[$uid] = $u !== null && ((bool) ($u->is_super ?? false) || (method_exists($u, 'isAdmin') && $u->isAdmin()));
        } catch (\Throwable) {
            return self::$admin[$uid] = false;
        }
    }

    public static function member(int $uid): int
    {
        if (self::exempt($uid)) {
            return self::FREE;   // 1.4.9 관리자 예외
        }
        $map = Settings::limitMap('max_devices_members');
        $n = $map[(string) $uid] ?? null;
        if ($n === null && $map !== []) {
            try {
                $email = mb_strtolower((string) DB::table('users')->where('id', $uid)->value('email'));
                $n = $email !== '' ? ($map[$email] ?? null) : null;
            } catch (\Throwable) {
            }
        }

        return min(10000, ($n ?? (int) Settings::get('max_devices')) + self::bought($uid, null) + self::pack($uid, 'slot'));   // 1.4.8 + 산 칸 · 1.17.7 + 📦 코인 팩 칸
    }

    /** 1.4.8 💳 산 센서 칸 (쓰는 중 · 달마다는 기한 안) — $cid 없으면 회원 칸, 있으면 그 업체 칸 (누가 샀든) */
    public static function bought(int $uid, ?int $cid): int
    {
        try {   // 1.8.3 판매를 꺼도 이미 산 칸은 그대로 셈 (예전엔 끄면 산 칸이 한도에서 빠졌음)
            $q = DB::table(Schema::SLOTS)->where('status', 'active')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()));
            $cid ? $q->where('company_id', $cid) : $q->where('user_id', $uid)->whereNull('company_id');

            return (int) $q->sum('size');
        } catch (\Throwable) {
            return 0;
        }
    }

    /** @var array<string, int> 한 요청 안 */
    private static array $packCache = [];

    /** 1.17.7 📦 코인 팩(custom-coin 2.0.2 · 🛍 상점)의 센서 칸 개수 — slot = 내 기기 · company_slot = 내가 대표 · 관리자인 업체 (없으면 0) */
    public static function pack(int $uid, string $item): int
    {
        $k = $uid.'|'.$item;
        if (isset(self::$packCache[$k])) {
            return self::$packCache[$k];
        }
        $n = 0;
        try {
            if ($uid > 0 && class_exists(\App\Extension\HookManager::class)) {
                $h = \App\Extension\HookManager::applyFilters('custom-coin.pack_has', null, $uid, 'custom-iot_link', $item);
                $n = is_array($h) && ! empty($h['until']) ? max(1, (int) ($h['qty'] ?? 1)) : 0;
            }
        } catch (\Throwable) {
        }

        return self::$packCache[$k] = $n;
    }

    /** 0 = 막지 않음 */
    public static function company(int $cid): int
    {
        $base = Settings::limitMap('max_devices_companies')[(string) $cid] ?? (int) Settings::get('max_devices_company');

        $pk = 0;
        if ($base > 0) {
            foreach (Links::mastersOf($cid) as $mid) {
                $pk += self::pack($mid, 'company_slot');   // 1.17.7 📦 대표 · 관리자의 코인 팩 「업체 센서 칸」
            }
        }

        return $base > 0 ? min(100000, $base + self::bought(0, $cid) + $pk) : 0;   // 1.4.8 + 산 칸 (0 = 막지 않음은 그대로)
    }

    /** 업체에 든 기기 수 (회원 모두) — $except 는 빼고 셈 (고치는 기기) */
    public static function companyUsed(int $cid, array $except = []): int
    {
        try {
            return DB::table(Schema::DEVICES)->where(function ($q) use ($cid) {
                // 1.9.1 그 업체로 분류한 것 + 업체 장비 · 프린터 · 보관함에 붙어 그 업체 것(company_id)인 것 (다른 업체로 분류한 것은 빼고) — 화면 「🏢 업체 기기」와 같은 수
                $q->where('grp', 'c'.$cid)->orWhere(fn ($w) => $w->where('company_id', $cid)->where(fn ($g) => $g->whereNull('grp')->orWhere('grp', 'not like', 'c%')));
            })->when($except !== [], fn ($q) => $q->whereNotIn('id', $except))->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    /** 업체에 $add 개를 더 둘 수 있나 — 안 되면 알림 글 · 되면 null */
    public static function companyFull(int $cid, int $add = 1, array $except = [], string $name = '', int $uid = 0): ?string
    {
        if (self::exempt($uid)) {
            return null;   // 1.4.9 관리자는 업체 한도도 넘길 수 있음
        }
        $lim = self::company($cid);
        if ($lim <= 0) {
            return null;
        }
        $used = self::companyUsed($cid, $except);

        return $used + $add > $lim ? '업체 「'.($name !== '' ? $name : '#'.$cid).'」에는 기기를 '.$lim.'개까지 둘 수 있어요 (지금 '.$used.'개).' : null;
    }
}
