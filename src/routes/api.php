<?php

use Illuminate\Support\Facades\Route;
use Plugins\Custom\HaLink\Http\Controllers\AdminController;
use Plugins\Custom\HaLink\Http\Controllers\AssetController;
use Plugins\Custom\HaLink\Http\Controllers\HaController;

/*
| PluginRouteServiceProvider prefix: api/plugins/custom-ha_link
*/

Route::get('assets/{file}', [AssetController::class, 'show'])
    ->where('file', 'ha-link-app\.js|ha-link\.css')->middleware('throttle:600,1')->name('assets');

// Home Assistant → 사이트 (로그인 없음, 주소의 비밀 키). 주소 하나가 보내는 곳(IP)마다 1분에 30번까지
Route::post('in/{token}', [HaController::class, 'ingest'])->where('token', '[a-f0-9]{32}')->middleware('throttle:30,1')->name('in');

// 카메라 사진 (본문 = JPEG) — 1분에 6번까지, 서비스가 정한 간격보다 잦으면 버림
Route::post('in/{token}/snap', [HaController::class, 'snap'])->where('token', '[a-f0-9]{32}')->middleware('throttle:6,1')->name('in.snap');

// 회원이 공개로 둔 카메라 사진 (로그인 없음)
Route::get('snap/{id}.jpg', [HaController::class, 'snapPublic'])->whereNumber('id')->middleware('throttle:240,1')->name('snap.public');

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
    Route::post('devices/{id}/rotate', [HaController::class, 'rotate'])->whereNumber('id')->name('devices.rotate');
    Route::delete('devices/{id}', [HaController::class, 'delete'])->whereNumber('id')->name('devices.destroy');
    Route::get('devices/{id}/snap', [HaController::class, 'snapShow'])->whereNumber('id')->name('devices.snap');
    Route::post('link/rotate', [HaController::class, 'rotateLink'])->name('link.rotate');

    Route::get('admin/settings', [AdminController::class, 'show'])->middleware('permission:admin,core.plugins.read')->name('admin.settings.show');
    Route::put('admin/settings', [AdminController::class, 'save'])->middleware('permission:admin,core.plugins.update')->name('admin.settings.save');
});
