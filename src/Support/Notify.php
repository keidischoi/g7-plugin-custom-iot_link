<?php

namespace Plugins\Custom\HaLink\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * 알림 — 사이트 알림 · 메일 (GenericNotification, 정의는 plugin.php getNotificationDefinitions).
 */
final class Notify
{
    public const TYPE = 'custom_ha_link_alert';

    /** 검사용 — (userId, channels, subject, body) => void */
    public static $override = null;

    /**
     * @param  list<string>  $channels  database · mail
     */
    public static function send(int $userId, array $channels, string $subject, string $body): void
    {
        if ($channels === []) {
            return;
        }
        if (self::$override !== null) {
            (self::$override)($userId, $channels, $subject, $body);

            return;
        }
        try {
            $userClass = 'App\\Models\\User';
            $n = 'App\\Notifications\\GenericNotification';
            if (! class_exists($userClass) || ! class_exists($n) || ! self::ensureDefinition()) {
                return;
            }
            $user = $userClass::query()->find($userId);
            if ($user === null || ! empty($user->withdrawn_at)) {
                return;
            }
            $url = rtrim((string) config('app.url'), '/').'/ha-link';
            $data = ['subject' => $subject, 'body' => $body, 'name' => (string) ($user->nickname ?: $user->name ?: ''), 'drawer_url' => $url,
                'body_html' => '<p>'.nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8')).'</p><p><a href="'.htmlspecialchars($url, ENT_QUOTES, 'UTF-8').'">HA 연결 열기</a></p>'];
            foreach ($channels as $channel) {
                if ($channel === 'mail' && trim((string) ($user->email ?? '')) === '') {
                    continue;
                }
                try {
                    $user->notify(new $n(type: self::TYPE, hookPrefix: 'custom-ha_link', data: $data, extensionType: 'plugin', extensionIdentifier: 'custom-ha_link', channel: $channel));
                } catch (\Throwable $e) {
                    Log::warning('[custom-ha_link] 알림 실패', ['user_id' => $userId, 'channel' => $channel, 'error' => $e->getMessage()]);
                }
            }
        } catch (\Throwable) {
        }
    }

    /** 알림 정의가 DB 에 있는지 (없으면 플러그인 선언 동기화를 한 번 시도) */
    private static function ensureDefinition(): bool
    {
        static $ok = null;
        if ($ok !== null) {
            return $ok;
        }
        $exists = static fn (): bool => DB::table('notification_definitions')->where('type', self::TYPE)->exists();
        try {
            if ($exists()) {
                return $ok = true;
            }
            $manager = app('App\\Extension\\PluginManager');
            $plugin = method_exists($manager, 'getPlugin') ? $manager->getPlugin('custom-ha_link') : null;
            if ($plugin !== null && method_exists($manager, 'syncDeclarativeArtifacts')) {
                $manager->syncDeclarativeArtifacts($plugin);
            }

            return $ok = $exists();
        } catch (\Throwable) {
            return $ok = false;
        }
    }
}
