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
    public static function member(int $uid): int
    {
        $map = Settings::limitMap('max_devices_members');
        $n = $map[(string) $uid] ?? null;
        if ($n === null && $map !== []) {
            try {
                $email = mb_strtolower((string) DB::table('users')->where('id', $uid)->value('email'));
                $n = $email !== '' ? ($map[$email] ?? null) : null;
            } catch (\Throwable) {
            }
        }

        return min(10000, ($n ?? (int) Settings::get('max_devices')) + self::bought($uid, null));   // 1.4.8 + 산 칸
    }

    /** 1.4.8 💳 산 센서 칸 (쓰는 중 · 달마다는 기한 안) — $cid 없으면 회원 칸, 있으면 그 업체 칸 (누가 샀든) */
    public static function bought(int $uid, ?int $cid): int
    {
        if (! Settings::get('slot_enabled')) {
            return 0;
        }
        try {
            $q = DB::table(Schema::SLOTS)->where('status', 'active')->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()));
            $cid ? $q->where('company_id', $cid) : $q->where('user_id', $uid)->whereNull('company_id');

            return (int) $q->sum('size');
        } catch (\Throwable) {
            return 0;
        }
    }

    /** 0 = 막지 않음 */
    public static function company(int $cid): int
    {
        $base = Settings::limitMap('max_devices_companies')[(string) $cid] ?? (int) Settings::get('max_devices_company');

        return $base > 0 ? min(100000, $base + self::bought(0, $cid)) : 0;   // 1.4.8 + 산 칸 (0 = 막지 않음은 그대로)
    }

    /** 업체에 든 기기 수 (회원 모두) — $except 는 빼고 셈 (고치는 기기) */
    public static function companyUsed(int $cid, array $except = []): int
    {
        try {
            return DB::table(Schema::DEVICES)->where(function ($q) use ($cid) {
                $q->where('grp', 'c'.$cid)->orWhere(fn ($w) => $w->where(fn ($g) => $g->whereNull('grp')->orWhere('grp', ''))->where('target', 'equipment')->where('company_id', $cid));
            })->when($except !== [], fn ($q) => $q->whereNotIn('id', $except))->count();
        } catch (\Throwable) {
            return 0;
        }
    }

    /** 업체에 $add 개를 더 둘 수 있나 — 안 되면 알림 글 · 되면 null */
    public static function companyFull(int $cid, int $add = 1, array $except = [], string $name = ''): ?string
    {
        $lim = self::company($cid);
        if ($lim <= 0) {
            return null;
        }
        $used = self::companyUsed($cid, $except);

        return $used + $add > $lim ? '업체 「'.($name !== '' ? $name : '#'.$cid).'」에는 기기를 '.$lim.'개까지 둘 수 있어요 (지금 '.$used.'개).' : null;
    }
}
