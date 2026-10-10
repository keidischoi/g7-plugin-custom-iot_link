<?php

namespace Plugins\Custom\IotLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Crypt;
use Plugins\Custom\IotLink\Services\HaService;
use Plugins\Custom\IotLink\Services\SmartThingsService;
use Plugins\Custom\IotLink\Support\Settings;

/** 관리자 — 설정 · 숫자 (회원 기기의 값 · 주소는 보이지 않음). 0.2.0 SmartThings Client Secret 은 암호화해 두고 내보내지 않음 · 1.1.0 앱 자동 등록 */
class AdminController extends Controller
{
    public function show(HaService $svc): JsonResponse
    {
        return response()->json(['success' => true, 'data' => ['settings' => Settings::public(), 'stats' => $svc->stats(), 'smartthings' => (new SmartThingsService($svc))->adminInfo()]]);
    }

    public function save(Request $request): JsonResponse
    {
        $in = $request->input('settings');
        $in = is_array($in) ? $in : [];
        unset($in['st_client_secret_set']);
        // Client Secret — 새로 적었을 때만 바꿈 (비우면 그대로) · 암호화해서 둠
        $sec = is_string($in['st_client_secret'] ?? null) ? trim($in['st_client_secret']) : '';
        if ($sec !== '' && strlen($sec) < 500) {
            $in['st_client_secret'] = 'enc:'.Crypt::encryptString($sec);
        } elseif (($in['st_client_secret_clear'] ?? false) === true) {
            $in['st_client_secret'] = '';
        } else {
            unset($in['st_client_secret']);
        }
        unset($in['st_client_secret_clear']);
        Settings::save($in);

        return response()->json(['success' => true, 'message' => '저장했어요.', 'data' => ['settings' => Settings::public(), 'smartthings' => (new SmartThingsService())->adminInfo()]]);
    }

    /** 1.1.0 ⚡ 자동 등록 — 관리자의 SmartThings 개인 액세스 토큰으로 앱을 만들고 Client ID · Secret 을 저장 (토큰은 저장 · 기록하지 않음) */
    public function register(Request $request): JsonResponse
    {
        $tok = $request->input('token');
        [$ok, $msg] = (new SmartThingsService())->register(is_string($tok) ? $tok : '');

        return new JsonResponse(['success' => $ok, 'message' => $msg, 'data' => $ok ? ['settings' => Settings::public(), 'smartthings' => (new SmartThingsService())->adminInfo()] : null], $ok ? 200 : 422, ['Cache-Control' => 'no-store']);
    }
}
