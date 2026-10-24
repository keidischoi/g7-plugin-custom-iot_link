<?php

namespace Plugins\Custom\IotLink\Services;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Plugins\Custom\IotLink\Support\Limits;
use Plugins\Custom\IotLink\Support\Points;
use Plugins\Custom\IotLink\Support\Schema;
use Plugins\Custom\IotLink\Support\Settings;

/**
 * 1.4.8 💳 센서 칸 — 한도(회원 · 업체)를 넘는 센서를 코인 · 마일리지로 1개 · 10개 묶음씩 사서 더 붙임.
 *  - once: 한 번 사면 계속 · monthly: 달마다 결제 (자동 연장 · 모자라거나 끄면 칸이 끝남)
 *  - 칸이 끝나 한도를 넘어도 붙인 기기는 지우지 않음 — 새로 붙이거나 그 업체로 옮기는 것만 막힘
 *  - 업체 칸: 그 업체의 대표 · 관리자가 사고, 업체 한도(「0 = 막지 않음」이 아닐 때)에 더해짐
 */
class SlotService
{
    public const SIZES = [1, 10];

    /** 1.8.3 한 번에 살 수 있는 칸 수 */
    public const MAX_QTY = 100;

    public static function on(): bool
    {
        return (bool) Settings::get('slot_enabled');
    }

    /**
     * @param  list<array{id: int, name: string}>  $companies  내가 대표 · 관리자인 업체
     * @param  bool  $exempt  1.8.4 관리자(한도 예외) — 살 필요 없음 (산 칸 목록 · 취소만)
     * @return array<string, mixed> 회원 화면 — enabled = 창을 보임 · selling = 사기 칸을 보임
     */
    public function info(int $uid, array $companies, bool $exempt = false): array
    {
        if ($uid <= 0 || ! Schema::ensure()) {
            return ['enabled' => false];
        }
        $cids0 = array_column($companies, 'id');
        $has = DB::table(Schema::SLOTS)->where('status', '!=', 'pending')->where(fn ($q) => $q->where('user_id', $uid)->orWhereIn('company_id', $cids0 ?: [0]))->exists();
        $selling = self::on() && ! $exempt;
        if (! $selling && ! $has) {   // 1.8.4 팔지 않고 산 칸도 없으면 창 없음
            return ['enabled' => false];
        }
        if (self::on()) {
            $this->renew($uid);
        }
        $cur = [];
        foreach ($selling ? Points::CURRENCIES : [] as $c) {
            if (Points::available($c)) {
                $prices = [];
                foreach (self::SIZES as $n) {
                    if (Points::price($c, $n) > 0) {
                        $prices[] = ['n' => $n, 'price' => Points::price($c, $n), 'text' => Points::format(Points::price($c, $n), $c)];
                    }
                }
                $cur[] = ['key' => $c, 'label' => Points::label($c), 'balance' => Points::balance($uid, $c), 'charge_url' => Points::chargeUrl($c), 'prices' => $prices,
                    'unit' => Points::price($c, 1), 'pack' => Points::price($c, 10)];   // 1.8.3 개수를 정해 살 때 화면이 값을 셈 (서버도 같은 셈)
            }
        }
        $cids = array_column($companies, 'id');
        $cn = array_column($companies, 'name', 'id');
        $rows = DB::table(Schema::SLOTS)->where('status', '!=', 'pending')->where(fn ($q) => $q->where('user_id', $uid)->orWhereIn('company_id', $cids ?: [0]))->orderByDesc('id')->limit(40)->get();
        $targets = [['key' => 'me', 'label' => '나 (개인 · 장비)']];
        foreach ($companies as $c) {
            if (Limits::company((int) $c['id']) > 0) {
                $targets[] = ['key' => 'c'.$c['id'], 'label' => '🏢 '.$c['name']];
            }
        }

        return ['enabled' => true, 'selling' => $selling, 'exempt' => $exempt, 'mode' => (string) Settings::get('slot_mode'), 'currencies' => $cur, 'targets' => $targets, 'max_qty' => self::MAX_QTY, 'cancel_days' => (int) Settings::get('slot_cancel_days'),
            'slots' => $rows->map(fn ($s) => ['id' => (int) $s->id, 'size' => (int) $s->size, 'cancel' => $this->cancelable($uid, $s), 'for' => $s->company_id ? '🏢 '.($cn[(int) $s->company_id] ?? '업체') : '나', 'mine' => (int) $s->user_id === $uid,
                'amount_text' => Points::format((int) $s->amount, (string) $s->currency), 'mode' => (string) $s->mode, 'status' => (string) $s->status,
                'expires_at' => $s->expires_at ? Carbon::parse((string) $s->expires_at)->toIso8601String() : null, 'auto_renew' => (bool) $s->auto_renew])->all()];
    }

    /**
     * 칸 사기 — $for 'me' 또는 'c{업체}' · $n 1 · 10
     *
     * @param  list<array{id: int, name: string}>  $companies
     * @return array{0: bool, 1: string, 2?: array<string, mixed>}
     */
    public function buy(int $uid, string $cur, int $n, string $for, array $companies): array
    {
        if (! self::on()) {
            return [false, '지금은 센서 칸을 팔지 않아요.'];
        }
        if ($uid <= 0 || ! Schema::ensure()) {
            return [false, '로그인해 주세요.'];
        }
        if ($n < 1 || $n > self::MAX_QTY || ! Points::available($cur) || Points::total($cur, $n) <= 0) {   // 1.8.3 1 ~ 100 개 (10개마다 묶음 값)
            return [false, '이 결제 수단 · 개수는 지금 살 수 없어요.'];
        }
        $cid = null;
        if ($for !== 'me') {
            $cid = preg_match('/^c(\d+)$/', $for, $m) ? (int) $m[1] : 0;
            if (! in_array($cid, array_column($companies, 'id'), true)) {
                return [false, '내가 대표 · 관리자인 업체에만 살 수 있어요.'];
            }
            if (Limits::company($cid) <= 0) {
                return [false, '이 업체는 기기 수를 막지 않아요 — 살 필요가 없어요.'];
            }
        }
        $mode = (string) Settings::get('slot_mode');
        $price = Points::total($cur, $n);
        $id = (int) DB::table(Schema::SLOTS)->insertGetId(['user_id' => $uid, 'company_id' => $cid, 'size' => $n, 'currency' => $cur, 'amount' => $price, 'mode' => $mode, 'status' => 'pending',
            'expires_at' => $mode === 'monthly' ? now()->addMonthNoOverflow() : null, 'auto_renew' => true, 'created_at' => now(), 'updated_at' => now()]);
        $r = Points::spend($uid, $price, $cur, 'slot:'.$id, '[IoT 연결] 센서 칸 '.$n.'개 #'.$id.($cid ? ' (업체)' : '').($mode === 'monthly' ? ' (한 달)' : ''));
        if (! $r[0]) {
            DB::table(Schema::SLOTS)->where('id', $id)->delete();

            return [false, $r[1], ['reason' => $r[2] ?? '']];
        }
        DB::table(Schema::SLOTS)->where('id', $id)->update(['status' => 'active', 'updated_at' => now()]);
        $now = $cid ? Limits::company($cid) : Limits::member($uid);

        return [true, '센서 칸 '.$n.'개를 샀어요! 🎉 이제 '.($cid ? '이 업체에 ' : '').$now.'개까지 붙일 수 있어요.', ['allowed' => $now]];
    }

    /**
     * 1.8.3 취소할 수 있는 칸 수 — 산 사람 · 산 뒤 관리자가 정한 날 수 안 · 쓰는 중(active) · 안 쓴 것만
     *  안 쓴 것 = 그 칸을 빼도 지금 붙인 기기가 한도 안에 드는 만큼 (회원 칸 = 내 기기 수 · 업체 칸 = 그 업체에 든 기기 수)
     *
     * @return array{n: int, why: string}
     */
    public function cancelable(int $uid, object $s): array
    {
        $days = (int) Settings::get('slot_cancel_days');
        if ((int) $s->user_id !== $uid || (string) $s->status !== 'active') {
            return ['n' => 0, 'why' => ''];
        }
        if ($days <= 0) {
            return ['n' => 0, 'why' => '취소를 받지 않아요'];
        }
        if (Carbon::parse((string) $s->created_at)->addDays($days)->isPast()) {
            return ['n' => 0, 'why' => '산 뒤 '.$days.'일이 지났어요'];
        }
        $cid = $s->company_id ? (int) $s->company_id : null;
        $used = $cid ? Limits::companyUsed($cid) : (int) DB::table(Schema::DEVICES)->where('user_id', $uid)->count();
        $room = ($cid ? Limits::company($cid) : Limits::member($uid)) - $used;
        $n = max(0, min((int) $s->size, $room));

        return ['n' => $n, 'why' => $n > 0 ? '' : '사용 중이에요 (기기를 떼면 취소할 수 있어요)'];
    }

    /**
     * 1.8.3 칸 취소 — 안 쓴 만큼 $n 개 · 낸 값에서 그 몫을 돌려줌 (모두 취소하면 칸이 끝남)
     *
     * @return array{0: bool, 1: string}
     */
    public function cancel(int $uid, int $id, int $n): array
    {
        if (! Schema::ensure()) {
            return [false, '잠시 뒤 다시 해 주세요.'];
        }
        $s = DB::table(Schema::SLOTS)->where('id', $id)->first();
        if (! $s || (int) $s->user_id !== $uid) {
            return [false, '내가 산 칸만 취소할 수 있어요.'];
        }
        $c = $this->cancelable($uid, $s);
        $n = $n > 0 ? $n : (int) $s->size;
        if ($c['n'] <= 0 || $n > $c['n']) {
            return [false, $c['n'] > 0 ? '지금은 '.$c['n'].'개까지 취소할 수 있어요.' : ($c['why'] !== '' ? '취소할 수 없어요 — '.$c['why'].'.' : '취소할 수 없는 칸이에요.')];
        }
        $size = (int) $s->size;
        $back = $n === $size ? (int) $s->amount : intdiv((int) $s->amount * $n, $size);   // 낸 값의 몫 (모두면 낸 값 그대로)
        [$ok, $msg] = Points::refund((string) $s->currency, 'slot:'.$s->id, $back, '[IoT 연결] 센서 칸 '.$n.'개 취소 #'.$s->id);
        if (! $ok) {
            return [false, $msg];
        }
        DB::table(Schema::SLOTS)->where('id', $s->id)->update(['size' => $size - $n, 'amount' => (int) $s->amount - $back, 'status' => $n === $size ? 'cancelled' : 'active', 'updated_at' => now()]);

        return [true, '센서 칸 '.$n.'개를 취소했어요 — '.Points::format($back, (string) $s->currency).' 돌려줬어요.'];
    }

    /** 자동 연장 켜고 끄기 (산 사람만) @return array{0: bool, 1: string} */
    public function setAuto(int $uid, int $id, bool $on): array
    {
        $n = Schema::ensure() ? DB::table(Schema::SLOTS)->where('id', $id)->where('user_id', $uid)->update(['auto_renew' => $on, 'updated_at' => now()]) : 0;

        return $n ? [true, $on ? '자동 연장을 켰어요.' : '자동 연장을 껐어요 — 기한이 지나면 칸이 끝나요.'] : [false, '칸을 찾을 수 없어요.'];
    }

    /** 달마다 칸 연장 — 기한이 지난 칸을 산 사람의 같은 화폐로 결제해 한 달 늘림 · 못 하면 끝남. $uid 0 = 모두 (스케줄) @return int 연장한 칸 */
    public function renew(int $uid = 0): int
    {
        if (! self::on() || ! Schema::ensure()) {
            return 0;
        }
        $n = 0;
        $q = DB::table(Schema::SLOTS)->where('status', 'active')->where('mode', 'monthly')->whereNotNull('expires_at')->where('expires_at', '<=', now())->limit(200);
        if ($uid > 0) {
            $q->where('user_id', $uid);
        }
        foreach ($q->get() as $s) {
            $exp = Carbon::parse((string) $s->expires_at);
            $ok = false;
            $price = Points::total((string) $s->currency, (int) $s->size);   // 1.8.3 정한 개수 그대로
            if ($s->auto_renew && Points::available((string) $s->currency) && $price > 0) {
                $r = Points::spend((int) $s->user_id, $price, (string) $s->currency, 'slot:'.$s->id.':'.$exp->format('Y-m'), '[IoT 연결] 센서 칸 '.$s->size.'개 #'.$s->id.' 연장 ('.$exp->format('Y-m').')');
                $ok = $r[0];
                if ($ok) {
                    DB::table(Schema::SLOTS)->where('id', $s->id)->update(['amount' => $price, 'expires_at' => $exp->copy()->addMonthNoOverflow(), 'updated_at' => now()]);
                    $n++;
                }
            }
            if (! $ok) {
                DB::table(Schema::SLOTS)->where('id', $s->id)->update(['status' => 'expired', 'updated_at' => now()]);
            }
        }

        return $n;
    }
}
