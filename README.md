# 📡 IoT Link (`custom-iot_link`)

**IoT Link is a plugin for [G7 (Gnuboard 7)](https://github.com/gnuboard/g7) sites.** It receives temperature / humidity, printer and device state pushed from members' Home Assistant, SmartThings or Matter sensors (via the 3ds Matter link), and links it to the site's maintenance log (`custom-maintenance`), My Printer (`custom-my_printer`) and company equipment (`custom-companies`).

This plugin is the **server side required by the Home Assistant integration [3ds (`ha-3ds-link`)](https://github.com/keidischoi/ha-3ds-link)** — install it on your G7 site first, then add the integration in Home Assistant.

- The site never connects into a member's home. Home Assistant (or SmartThings, or the 3ds Matter link) **pushes** values to the site.
- Ingest endpoint: `POST /api/plugins/custom-iot_link/in/{secret key}` — `{"temperature": 23.4, "humidity": 41, "state": "running", "progress": 42, "remaining_min": 75, "job": "…"}` (send only what you have)
- Member page `/iot-link` · admin page `/admin/iot-link`

## Install

Requirements: a G7 site, version 7.0.5 or later, with shell access. Run the commands as the web server user (for example `sudo -u www-data php artisan …` or, on Synology, `sudo -u http php82 artisan …`).

1. Download `custom-iot_link-<version>.zip` from the [latest release](https://github.com/keidischoi/g7-plugin-custom-iot_link/releases/latest).
2. Unzip it into your site's `plugins/_pending/` folder, so that you get `plugins/_pending/custom-iot_link/plugin.php`.
3. Install and activate, then clear caches:

   ```
   php artisan plugin:install custom-iot_link
   php artisan plugin:activate custom-iot_link
   php artisan hooks:clear
   php artisan cache:clear
   php artisan ext-static:publish --force
   ```

4. Log in to your site and open **`/iot-link`** → **➕ Add device**. It shows the **site address** and a **link code** — paste both into the setup form of the Home Assistant integration [3ds](https://github.com/keidischoi/ha-3ds-link). The link code works like a password; keep it private.

## Update

```
php artisan plugin:update custom-iot_link --source=github --force --layout-strategy=overwrite
php artisan migrate --force
php artisan hooks:clear
php artisan cache:clear
php artisan ext-static:publish --force
```

## Upgrading from the old name (1.0.0) — HA Link (`custom-ha_link`) → IoT Link (`custom-iot_link`)

Only relevant if your site ran the old `custom-ha_link` plugin.

- Tables (`hal_*`), settings (`hal_settings`), the camera photo folder (`storage/app/ha_link`), the notification type (`custom_ha_link_alert`) and the home-design menu key (`ha_link`) are **unchanged** — the new plugin uses the old data as is (nothing to migrate). The old default menu name "HA Link" becomes "IoT Link" (names you changed yourself are kept).
- **Old addresses keep working**: `/api/plugins/custom-ha_link/…` (Home Assistant `rest_command`, the HACS integration, SmartThings Target URL) → same controller; `/ha-link` · `/admin/ha-link` → same pages (the address bar switches to the new address); the filter `custom-ha_link.printer_snapshot` too. Members and admins don't need to change anything. Newly generated config snippets and Target URL hints use the new address.
- Update these first (they accept both identifiers): My Printer 0.1.27 · Maintenance 0.3.1 · Inventory 0.1.1 · Home Design 0.7.97 · HACS integration 3ds 0.3.1.
- ⚠️ Only **deactivate** the old plugin — removing it with `--delete-data` would drop the `hal_*` tables that both plugins share.

```
# 0) Back up the database and plugins/custom-ha_link · storage/app/ha_link
# 1) Versions that accept both identifiers
php artisan plugin:update custom-my_printer --force --layout-strategy=overwrite
php artisan plugin:update custom-maintenance --force --layout-strategy=overwrite
php artisan module:update custom-inventory --force --layout-strategy=overwrite
php artisan module:update custom-home_design --force --layout-strategy=overwrite
# 2) New plugin — unzip custom-iot_link-<version>.zip into plugins/_pending (plugins/_pending/custom-iot_link/plugin.php)
php artisan plugin:install custom-iot_link --force
php artisan plugin:activate custom-iot_link --force
# 3) Turn the old plugin off (data is kept)
php artisan plugin:deactivate custom-ha_link --force
# 4) Clean up
php artisan migrate --force
php artisan hooks:clear
php artisan cache:clear
php artisan ext-static:publish --force
```

Roll back: `plugin:deactivate custom-iot_link --force` → `plugin:activate custom-ha_link --force` → `hooks:clear` · `cache:clear` · `ext-static:publish --force` (the data stays, it is the same tables).

## 📡 SmartThings (1.1.0 — sign-in connection: API Access App · OAuth)

SmartThings is another "sender": the sensor values it delivers go through the same ingest as Home Assistant (`HaService::ingest`).

### Members

On `/iot-link`, the SmartThings card → **🔗 Connect SmartThings** → sign in with a Samsung account → pick a location and **Allow** → back on the site, **⚙️ Choose sensors** (thermo-hygrometers are pre-checked) → Save. "❓ How to connect › 📡 SmartThings" on the page has an illustrated guide.

- One sensor = one device card. If a card with the same name exists the sensor joins it; if the name matches a filament **storage location**, it joins that storage box. Alert thresholds and where to attach are set with ✏️ on the card.
- Values: temperature (°F → °C) · humidity → device temperature / humidity; power (above a set W) or a switch → running state; door · motion · presence · water leak · battery · energy · illuminance → sensor values.
- Add or remove sensors: ⚙️ Choose sensors (no new sign-in) · another location: ➕ Connect another location · stop: Disconnect (device cards and history are kept).
- 🖨️ **Printer Lounge (1.2.0)**: if you set "attach to" to **My Printer**, plug power → printing / finished, and a thermo-hygrometer → the printer card's ambient temperature / humidity (Printer Lounge 0.1.28+, filters `custom-iot_link.printer_env` · `custom-iot_link.sources`). Printer Lounge's ⚙ › 🔌 Auto connect › SmartThings opens `/iot-link?st=pick&printer=<id>` directly. Progress, remaining time and camera are not available through SmartThings.
- 🖨️ **Printer devices (1.3.0)**: 3D printers registered in SmartThings with a community Edge driver (Bambu Lab LAN MQTT · Klipper/Moonraker) appear as "printer devices" — print state, progress, nozzle/bed temperature, AMS humidity etc. are read by role and passed to My Printer (`SmartThings::printerTriples()`). Camera images are not available.
- 💳 **Notice**: Samsung is moving the SmartThings API to paid plans, so free usage may stop and values may no longer arrive. This notice is always shown on the member pages (SmartThings card, how-to, sensor picker).

### Admin (once) — Admin › IoT Link › 📡 SmartThings

- **⚡ Auto register**: create a personal access token at [account.smartthings.com/tokens](https://account.smartthings.com/tokens) (scope: Apps), paste it and press "⚡ Auto register" → the site creates the app, stores the Client ID / Client Secret and confirms the address. The token itself is not stored.
- **📝 Manual register**: [Developer Center](https://developer.smartthings.com/console) › Service Integrations › Register New App, or SmartThings CLI `smartthings apps:create` → *OAuth-In App*. Use the copy buttons on the page to fill in the values below, then save the Client ID / Client Secret on the admin page.

| Item | Value |
| --- | --- |
| Target URL | `https://<your site>/api/plugins/custom-iot_link/smartthings` — every request's HTTP signature (rsa-sha256 · Digest · Date) is verified |
| Redirect URI | `https://<your site>/iot-link` |
| Scopes | `r:devices:*` · `r:locations:*` (read only) |

- The address CONFIRMATION that SmartThings sends to the Target URL is answered automatically (✅ on the admin page).
- Tokens are encrypted with Laravel Crypt and refreshed with the refresh_token before they expire (if you change `APP_KEY`, members have to press "🔗 Reconnect" once).
- 💳 From 2026-10 SmartThings is moving its API to paid plans (personal $4.99/month, commercial separately — [SmartThings announcement](https://blog.smartthings.com/smartthings-updates/a-new-enhanced-smartthings-api-experience/)). If registration or connection is refused, check your plan in the Developer Center.

### Legacy method (0.2.0 link code · WebHook SmartApp)

For apps registered in the [Developer Workspace](https://developer.smartthings.com/workspace) as *Automation for the SmartThings App* → *WebHook Endpoint*. Target URL and scopes are the same as above. Turn on "(legacy) also show link-code connection" under the admin "Advanced" section to show the link-code field on the member page (the code is entered in SmartThings app › Automations › ＋ › Add routine › Discover › this app's settings). In *Deploy to Test* state only the registering account can install it.

## 🧩 Matter (1.10.0 — 3ds Matter link, no Home Assistant)

Apple Home / Google Home have no public cloud API, and Matter only works inside the home network — so a small controller has to run at home. The **[3ds Matter link (`matter-3ds-link`)](https://github.com/keidischoi/matter-3ds-link)** connects to a Matter server (an existing one such as the HA Matter Server add-on, or the official `python-matter-server` it can start with Docker) and pushes temperature / humidity to the same ingest endpoint as Home Assistant.

### Members

1. Install the relay — **Windows (1.11.0)**: the 🧩 Matter tab shows a one-liner (`irm "…/api/plugins/custom-iot_link/mt/{link code}.ps1?matter=<server>" | iex`) to paste into PowerShell. Nothing else to install (PowerShell only, like the printer link MprLink): it saves `resources/matter/link.ps1` to `%LOCALAPPDATA%\3dsMatter`, checks the Matter server, offers to add sensors, and registers itself in the Startup folder. **Raspberry Pi / Linux / NAS**: the [Docker version](https://github.com/keidischoi/matter-3ds-link) (`docker compose up -d`, add `--profile server` if there is no Matter server yet; server address in `config/config.yaml` → `matter:`).
2. In Apple Home (sensor › ⚙️ › **Turn On Pairing Mode**), Google Home (**Linked Matter apps & services**) or SmartThings (**Share with other services**) get a sharing code and type it into `link.py pair`.
3. Site devices — the **Windows relay creates one Matter device per sensor automatically** (hub API with the link code; they appear in the 📡 waiting area, drag them onto a storage box / printer). A device deleted on the site is not re-created. For the Linux version: 🧩 Matter tab › **🔑 Create manually** — no Home Assistant entity names are needed; copy the **🔑 ingest key** (or the ready-made `config.yaml` line) into the link's `devices:` with the node number from `link.py nodes`.

### How it is shown / stored

- `hal_devices.source = 'matter'` — a 🧩 Matter badge on the card, its own receivers tab, source filter, a group in the 📡 waiting area and a teal colour marker.
- The link sends `X-G7-Via: matter` and a server ID starting with `matter` (`X-G7-Server`, name in `X-G7-Server-Name`). A device created as a Home Assistant device switches to Matter when the link sends to it. Devices created through the hub API (`POST hub/{code}/devices`) by the link are Matter devices; the HA integration's device list does not include Matter devices (and vice versa).
- Thread sensors need a Thread border router (HomePod mini, Apple TV, Nest Hub …) and IPv6 route settings on the Linux host — see the link's README.

## Tests

```
php tests/run.php
G7_VENDOR=…/vendor php tests/sim.php
G7_VENDOR=…/vendor php tests/rename.php
```

## License

MIT
