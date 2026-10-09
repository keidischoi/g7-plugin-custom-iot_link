<?php

namespace Plugins\Custom\HaLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\HaLink\Services\HaService;
use Plugins\Custom\HaLink\Support\Settings;

/** 관리자 — 설정 · 숫자 (회원 기기의 값 · 주소는 보이지 않음) */
class AdminController extends Controller
{
    public function show(HaService $svc): JsonResponse
    {
        return response()->json(['success' => true, 'data' => ['settings' => Settings::all(), 'stats' => $svc->stats()]]);
    }

    public function save(Request $request): JsonResponse
    {
        $in = $request->input('settings');
        Settings::save(is_array($in) ? $in : []);

        return response()->json(['success' => true, 'message' => '저장했어요.', 'data' => ['settings' => Settings::all()]]);
    }
}
