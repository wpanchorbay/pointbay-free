# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

LoyaltyBay is a WooCommerce loyalty/points/referrals/tiers plugin (requires WooCommerce). PHP backend under `app/` (PSR-4 namespace `LoyaltyBay\`), React/TypeScript admin UI under `src/` (two entry apps: `AdminApp.tsx`, `SettingsApp.tsx`). `config/` holds plain PHP config arrays (admin, api, core, migrations, settings) separate from the `app/` classes — check there before changing settings/REST/migration behavior.

`readme.txt` still contains generic "boilerplate" copy left over from the plugin's origin; don't treat it as an accurate feature list — the real modules live under `app/` (`Referrals`, `Tiers`, `Dashboard`, `Checkout`, etc.).

## Commands

- `npm run start` / `npm run build` — wp-scripts dev/prod build of the admin UI.
- `npm run build:prod` — `bash build.sh`; prepends license headers and versions built files. Use for real release builds, not `npm run build`.
- `npm run build:legacy` / `start:legacy` — legacy browser target build (`BUILD_TARGET=legacy`).
- `npm run lint` — runs both `lint:php` and `lint:js`.
- `npm run lint:php` — `phpcs --standard=phpcs.xml.dist` (WordPress-Extra + WordPress-Docs).
- `npm run lint:php:fix` — `phpcbf` autofix.
- `npm run lint:js` — `wp-scripts lint-js src` (no separate `.eslintrc`; config is wp-scripts defaults).
- `npm run format` — `wp-scripts format src`.
- `npm run makepot` / `make-json` — i18n string extraction.
- `npm run zip` — `bash package.sh`, builds a release zip.
- `php bin/make-resource` — scaffolds a new resource (via `npm run make:resource`).
- Composer has no `scripts` section; only used for the PSR-4 autoloader and `rakit/validation`.

## Testing

There is no PHPUnit or Jest setup — testing is E2E/QIT-based:
- `tests/e2e/` — Playwright specs (`playwright.config.js`) covering gamification, referrals, redemption, refunds, earning, checkout (classic + block), cron, deactivation, registration, reviews.
- `qit.json` configures WooCommerce QIT (slug `loyaltybay`) for managed/E2E test runs; see `tests/run_qit_managed_tests.sh`, `tests/run_all_tests.sh`, `tests/run_individual.sh`.
- CI: `.github/workflows/tests.yml` runs QIT tests; `.github/workflows/phpcs.yml` runs PHPCS.

## Conventions

- Text domain: `loyaltybay`. Custom capability: `manage_loyaltybay`. Prefixes: `loyaltybay` / `LOYALTYBAY` / `LoyaltyBay`.
- PHP classes generally follow a Singleton `get_instance()` pattern (e.g. `Plugin`, `Settings`).
- `phpcs.xml.dist` excludes `vendor/`, `node_modules/`, `dist/`, `build/`, `assets/` — don't lint-fix generated output.
