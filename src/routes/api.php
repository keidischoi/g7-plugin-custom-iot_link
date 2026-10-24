<?php

use Illuminate\Support\Facades\Route;
use Plugins\Custom\IotLink\Http\Controllers\AdminController;
use Plugins\Custom\IotLink\Http\Controllers\AssetController;
use Plugins\Custom\IotLink\Http\Controllers\HaController;
use Plugins\Custom\IotLink\Http\Controllers\SmartThingsController;
use Plugins\Custom\IotLink\Support\LegacyRoutes;

/*
| PluginRouteServiceProvider prefix: api/plugins/custom-iot_link
| 1.0.0 예전 이름(custom-ha_link) 주소도 그대로 받음 — 이 파일 끝의 LegacyRoutes::mirror (회원의 Home Assistant rest_command ·
|       HACS 통합 · SmartThings Target URL 이 예전 주소를 씀)
*/

Route::get('assets/{file}', [AssetController::class, 'show'])
    ->where('file', 'iot-link-app\.js|iot-link\.css|ha-link-app\.js|ha-link\.css')->middleware('throttle:600,1')->name('assets');

// Home Assistant → 사이트 (로그인 없음, 주소의 비밀 키). 주소 하나가 보내는 곳(IP)마다 1분에 30번까지
Route::post('in/{token}', [HaController::class, 'ingest'])->where('token', '[a-f0-9]{32}')->middleware('throttle:30,1')->name('in');

// 카메라 사진 (본문 = JPEG) — 1분에 6번까지, 서비스가 정한 간격보다 잦으면 버림
Route::post('in/{token}/snap', [HaController::class, 'snap'])->where('token', '[a-f0-9]{32}')->middleware('throttle:6,1')->name('in.snap');

// 0.2.0 SmartThings WebHook SmartApp → 사이트 (로그인 없음 — 모든 요청의 HTTP 서명을 확인). SmartThings 클라우드가 여러 회원 것을 같은 곳(IP)에서 보내므로 넉넉히 + 설치마다 1분 한도(서비스)
Route::post('smartthings', [SmartThingsController::class, 'webhook'])->middleware('throttle:600,1')->name('smartthings');

// 회원이 공개로 둔 카메라 사진 (로그인 없음)
Route::get('snap/{id}.jpg', [HaController::class, 'snapPublic'])->whereNumber('id')->middleware('throttle:240,1')->name('snap.public');

// 1.11.0 🧩 Matter 중계 윈도우 한 줄 설치 (로그인 없음, 주소의 연결 코드 — irm "주소" | iex)
Route::get('mt/{code}.ps1', [HaController::class, 'matterPs1'])->where('code', '[a-f0-9]{32}')->middleware('throttle:20,1')->name('matter.ps1');
// 1.12.0 🐧🍎🍓 리눅스 · 맥 · 라즈베리파이 한 줄 (curl -fsSL "주소" | bash — python3 기본 기능만)
Route::get('mt/{code}.sh', [HaController::class, 'matterSh'])->where('code', '[a-f0-9]{32}')->middleware('throttle:20,1')->name('matter.sh');

// HACS 통합 ↔ 사이트 (로그인 없음, 주소의 연결 코드) — 붙일 곳 목록 · 기기 만들기/고치기/지우기
Route::middleware('throttle:30,1')->where(['code' => '[a-f0-9]{32}'])->group(function () {
    Route::get('hub/{code}', [HaController::class, 'hub'])->name('hub');
    Route::post('hub/{code}/devices', [HaController::class, 'hubSave'])->name('hub.devices.store');
    Route::put('hub/{code}/devices/{id}', [HaController::class, 'hubSave'])->whereNumber('id')->name('hub.devices.update');
    Route::delete('hub/{code}/devices/{id}', [HaController::class, 'hubDelete'])->whereNumber('id')->name('hub.devices.destroy');
});

Route::middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
    Route::get('me', [HaController::class, 'index'])->name('me');
    Route::post('devices', [HaController::class, 'save'])->name('devices.store');
    Route::put('devices/{id}', [HaController::class, 'save'])->whereNumber('id')->name('devices.update');
    Route::post('devices/{id}/range', [HaController::class, 'range'])->whereNumber('id')->middleware('throttle:60,1')->name('devices.range');   // 1.9.0 🔔 알림 구간
    Route::post('devices/{id}/place', [HaController::class, 'place'])->whereNumber('id')->middleware('throttle:60,1')->name('devices.place');   // 1.6.0 📦 보관함 보드
    Route::post('devices/{id}/rotate', [HaController::class, 'rotate'])->whereNumber('id')->name('devices.rotate');
    Route::post('slots/buy', [HaController::class, 'slotBuy'])->middleware('throttle:10,1')->name('slots.buy');   // 1.4.8 💳 센서 칸
    Route::post('slots/{id}/cancel', [HaController::class, 'slotCancel'])->whereNumber('id')->middleware('throttle:10,1')->name('slots.cancel');   // 1.8.3
    Route::put('slots/{id}', [HaController::class, 'slotAuto'])->whereNumber('id')->name('slots.update');
    Route::post('devices/group', [HaController::class, 'groupMany'])->middleware('throttle:30,1')->name('devices.group_many');   // 1.4.6 📁 분류 옮기기
    Route::post('devices/delete', [HaController::class, 'deleteMany'])->middleware('throttle:20,1')->name('devices.destroy_many');   // 1.4.5 여러 기기 한 번에
    Route::delete('devices/{id}', [HaController::class, 'delete'])->whereNumber('id')->name('devices.destroy');
    Route::get('devices/{id}/snap', [HaController::class, 'snapShow'])->whereNumber('id')->name('devices.snap');
    Route::post('link/rotate', [HaController::class, 'rotateLink'])->name('link.rotate');
    // 0.2.0 SmartThings — 연결 코드(1분에 10번까지) · 이을 기기 바꾸기 · 끊기 (내 것만)
    Route::post('smartthings/code', [SmartThingsController::class, 'code'])->middleware('throttle:10,1')->name('smartthings.code');
    Route::put('smartthings/installs/{id}', [SmartThingsController::class, 'relink'])->whereNumber('id')->name('smartthings.relink');
    Route::post('smartthings/revive', [SmartThingsController::class, 'revive'])->middleware('throttle:6,1')->name('smartthings.revive');   // 1.4.2 「🔄 다시 잇기」
    Route::delete('smartthings/installs/{id}', [SmartThingsController::class, 'disconnect'])->whereNumber('id')->name('smartthings.disconnect');
    // 1.1.0 SmartThings 로그인 연결 (API Access App · OAuth) — 로그인 주소 받기 · 돌아와서 잇기(state 가 그 회원 것일 때만) · 센서 목록 · 고른 것 저장
    Route::post('smartthings/oauth/start', [SmartThingsController::class, 'oauthStart'])->middleware('throttle:10,1')->name('smartthings.oauth.start');
    Route::post('smartthings/oauth/finish', [SmartThingsController::class, 'oauthFinish'])->middleware('throttle:10,1')->name('smartthings.oauth.finish');
    Route::get('smartthings/installs/{id}/devices', [SmartThingsController::class, 'devices'])->whereNumber('id')->middleware('throttle:20,1')->name('smartthings.devices');
    Route::put('smartthings/installs/{id}/devices', [SmartThingsController::class, 'pick'])->whereNumber('id')->middleware('throttle:20,1')->name('smartthings.devices.pick');

    Route::get('admin/settings', [AdminController::class, 'show'])->middleware('permission:admin,core.plugins.read')->name('admin.settings.show');
    Route::put('admin/settings', [AdminController::class, 'save'])->middleware('permission:admin,core.plugins.update')->name('admin.settings.save');
    // 1.1.0 SmartThings 앱 자동 등록 (관리자의 개인 액세스 토큰으로 — 저장하지 않음)
    Route::post('admin/smartthings/register', [AdminController::class, 'register'])->middleware(['permission:admin,core.plugins.update', 'throttle:6,1'])->name('admin.smartthings.register');
});

// 1.0.0 예전 주소 /api/plugins/custom-ha_link/… → 위와 같은 컨트롤러 (같은 미들웨어 · 제한 · 조건)
LegacyRoutes::mirror(app('router'));
