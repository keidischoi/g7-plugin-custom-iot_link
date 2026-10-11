<?php

namespace Plugins\Custom\IotLink\Providers;

use Illuminate\Support\ServiceProvider;
use Plugins\Custom\IotLink\Console\StPollCommand;

/**
 * 1.4.4 코어 PluginServiceProvider 가 src/Providers/*ServiceProvider.php 를 찾아 등록 — 콘솔 명령 (스케줄은 plugin.php::getSchedules).
 */
class IotLinkServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        if ($this->app->runningInConsole()) {
            if (class_exists(\Plugins\Custom\IotLink\Plugin::class)) {
                \Plugins\Custom\IotLink\Plugin::autoload();
            }
            $this->commands([StPollCommand::class]);
        }
    }
}
