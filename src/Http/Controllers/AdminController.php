<?php

namespace Plugins\Custom\HaLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Crypt;
use Plugins\Custom\HaLink\Services\HaService;
use Plugins\Custom\HaLink\Services\SmartThingsService;
use Plugins\Custom\HaLink\Support\Settings;

/** 관리자 — 설정 · 숫자 (회원 기기의 값 · 주소는 보이지 않음). 0.2.0 SmartThings Client Secret 은 암호화해 두고 내보내지 않음 */
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
}
