# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PointBay is a WooCommerce loyalty points and referral rewards plugin (requires WooCommerce). PHP backend under `app/` (PSR-4 namespace `PointBay\`), React/TypeScript admin UI under `src/` (two entry apps: `AdminApp.tsx` → the Points History ledger, `SettingsApp.tsx` → the WooCommerce settings tab). `config/` holds plain PHP config arrays (`admin`, `api`, `core`, `migrations`, `settings`) separate from the `app/` classes — check there before changing settings/REST/menu/migration behavior.

Modules under `app/`: `Admin`, `Api`, `Checkout`, `Core`, `Dashboard`, `Data`, `Database`, `Helper`, `Hooks`, `Models`, `Referrals`, `Services`. Tiers/gamification live in the separate **pointbaypro** add-on, not here.

`readme.txt` is real, accurate feature copy — keep it in sync when behavior changes. It is also the source of truth for the release version: `package.sh` reads `Stable tag` from it.

### Free/Pro seam

The pro add-on (`../pointbaypro`) extends this plugin through public extension points, so don't remove them:

- `apply_filters( 'pointbay_settings_sections', … )` in `src/pages/Settings.tsx` — pro injects extra settings cards.
- `apply_filters( 'pointbay_cron_jobs', array() )` in `app/Core/Cron.php` — pro registers the tier recalculation job. This is why the `pointbay_cron_log` table is created here even though free never writes to it.
- `do_action( 'pointbay_my_rewards_after_balance', $user_id )` in `app/Dashboard/MyRewardsEndpoint.php`.
- `apply_filters( 'pointbay_settings_defaults', … )` and `apply_filters( 'pointbay_options_properties', … )` in `app/Core/Settings.php` — pro adds its own setting keys (e.g. `license_key`) into free's settings defaults/schema so they flow through the same read/write pipeline.
- `apply_filters( 'pointbay_admin_localize', … )` in `app/Admin/Admin.php` — pro adds data to the object localized on every PointBay admin screen.
- `apply_filters( 'pointbay_settings_response', $settings )` in `app/Api/SettingsController.php` (`get_settings()` and `update_settings()`) and `app/Admin/Admin.php`'s `plugin_settings` localize entry — the read/display-only redaction seam, e.g. pro uses this to mask `license_key` before it reaches the browser. Never applied inside `Settings::get_settings()` itself, since that's the internal read path business logic depends on.

Pro also declares `Requires Plugins: pointbay-loyalty-points-referral-rewards-woo`, so while pro is active WordPress renders free's "Deactivate" action as plain text rather than a link — the deactivation feedback modal cannot fire in that state.

## Commands

- `npm run start` / `npm run build` — wp-scripts dev/prod build of the admin UI.
- `npm run build:prod` — `bash build.sh`; prepends license/source-provenance headers and versions built files. Use for real release builds, not `npm run build`.
- `npm run lint` — runs both `lint:php` and `lint:js`.
- `npm run lint:php` — `phpcs --standard=phpcs.xml.dist` (WordPress-Extra + WordPress-Docs).
- `npm run lint:php:fix` — `phpcbf` autofix.
- `npm run lint:js` — `wp-scripts lint-js src` (no separate `.eslintrc`; config is wp-scripts defaults).
- `npm run format` — `wp-scripts format src`.
- `npm run makepot` / `make-json` — i18n string extraction. Note `makepot` excludes `src`, so **JS/TS strings are only picked up from the compiled `build/` output** — build before extracting.
- `npm run zip` — `bash package.sh`, builds the release zips into `dist/`.
- `npm run rebranding` — `bash rename.sh`, renames both file contents and paths for a rebrand.
- Composer has no `scripts` section; it provides the PSR-4 autoloader and `rakit/validation`.

## Testing

There is **no test suite in this repository** — no PHPUnit, no Jest, no Playwright specs, no `tests/` directory. `qit.json` exists (SUT slug `pointbay-loyalty-points-referral-rewards-woo`, source `local`) but configures no test packages.

CI is `.github/workflows/phpcs.yml` only. Verify changes by exercising the plugin in a real WordPress install.

## Packaging

`package.sh` is an **allowlist** — files are only shipped if explicitly copied, so nothing leaks by accident, and new top-level files must be added there deliberately. It ships `app/`, `languages/`, `assets/`, `build/`, `vendor/`, `config/`, `src/` plus the build config, and strips source maps, legacy bundles, and vendor dev metadata. `src/` and the build config ship on purpose so the plugin is rebuildable from the zip alone, as `readme.txt` promises.

WordPress.org screenshots belong in `.wordpress-org/` at the repo root — **not** in `assets/`, which `package.sh` copies into the release zip.

## Conventions

- Text domain: `pointbay-loyalty-points-referral-rewards-woo` (matches the directory and wp.org slug). Custom capability: `manage_pointbay`. Prefixes: `pointbay` / `POINTBAY` / `PointBay`.
- `POINTBAY_PLUGIN_NAME` is the short internal prefix `pointbay` (settings tab id, REST namespace, option key). `POINTBAY_WPORG_SLUG` is the full directory slug, used for anything that must match wordpress.org.
- PHP classes generally follow a Singleton `get_instance()` pattern (e.g. `Plugin`, `Settings`).
- `phpcs.xml.dist` excludes `vendor/`, `node_modules/`, `dist/`, `build/`, `assets/` — don't lint-fix generated output.
- There is no top-level admin menu (`config/admin.php` sets `show_main_menu => false`); both screens hang off the WooCommerce menu.
