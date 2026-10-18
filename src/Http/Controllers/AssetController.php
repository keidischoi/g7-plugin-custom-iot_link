<?php

namespace Plugins\Custom\IotLink\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;

/**
 * 화면 JS/CSS 를 API 경로로 내려줌 (빌드 · 퍼블리시 없이 zip 덮어쓰기만으로 반영). ?v=버전 이면 길게 캐시.
 */
class AssetController extends Controller
{
    private const FILES = [
        'iot-link-app.js' => 'application/javascript',
        'iot-link.css' => 'text/css',
    ];

    /** 1.0.0 예전 이름(HA 연결) 때의 파일 이름 → 지금 파일 (예전 화면 · 캐시가 부르는 주소) */
    public const LEGACY = [
        'ha-link-app.js' => 'iot-link-app.js',
        'ha-link.css' => 'iot-link.css',
    ];

    /** 1.4.15 화면 파일 캐시 — ?v= 가 지금 버전과 같을 때만 길게 캐시 (옛 불러오기가 옛 v 로 부르면 no-cache → 업데이트한 화면이 바로 보임) */
    public static function version(): string
    {
        static $v = null;
        if ($v === null) {
            $v = '';
            for ($d = __DIR__, $i = 0; $i < 7; $d = dirname($d), $i++) {
                foreach (['plugin.json', 'module.json'] as $f) {
                    if (is_file($d.'/'.$f)) {
                        $j = json_decode((string) @file_get_contents($d.'/'.$f), true);
                        $v = is_array($j) ? (string) ($j['version'] ?? '') : '';

                        return $v;
                    }
                }
            }
        }

        return $v;
    }

    public function show(Request $request, string $file): Response
    {
        $file = self::LEGACY[$file] ?? $file;
        if (! isset(self::FILES[$file])) {
            return response('/* not found */', 404, ['Content-Type' => 'text/plain']);
        }
        $path = dirname(__DIR__, 3).'/resources/assets/'.$file;
        if (! is_file($path)) {
            return response('/* missing */', 200, ['Content-Type' => self::FILES[$file].'; charset=UTF-8', 'Cache-Control' => 'no-cache']);
        }
        $mtime = (int) @filemtime($path);
        $etag = '"'.substr(md5($file.'|'.$mtime.'|'.(int) @filesize($path)), 0, 20).'"';
        $headers = [
            'Content-Type' => self::FILES[$file].'; charset=UTF-8',
            'Cache-Control' => (string) $request->query('v') === self::version() ? 'public, max-age=31536000, immutable' : 'no-cache',
            'ETag' => $etag,
            'X-Content-Type-Options' => 'nosniff',
        ];
        if (trim((string) $request->headers->get('If-None-Match', '')) === $etag) {
            unset($headers['Content-Type']);

            return response('', 304, $headers);
        }

        return response((string) file_get_contents($path), 200, $headers);
    }
}
