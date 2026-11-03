# PointBay — notes

## Known issues

Found while building demo data with `bay-demo-kit` (2026-08-22). Verified against
the Pro source tree. No fix applied here.

**Status re-checked against Pro 1.1.0 (2026-11-03):**

- Tier names matched literally: **fixed.** `TierManager::normalize_tier_slug()` compares
  through `sanitize_title()`, so `Gold`, `GOLD` and `gold` are the same tier. The
  lowercase `pointbay_vip_tier` meta the cron writes is the slug by design.
- `referrals_newCustomerPoints` empty string: **fixed.** `ReferralsTiersPage.tsx`
  falls back to the default when the value is unset; `0` stays a real value.
- Cron flattening the ladder: **no longer reproduces from the code.** `RecalculateTiers`
  only re-buckets users; it never writes `tiers_config`, and a populated stored
  config is treated as authoritative by `maybe_seed_tier_defaults()`.
- `maybe_seed_tier_defaults()` only heals an *empty* `tiers_config`: **still open.**
  An all-zero-threshold / all-1x-multiplier ladder is not detected.

### `maybe_reseed_tiers()` only heals an *empty* tiers_config, not a broken one

`pointbaypro/app/Core/Hooks.php` — the defensive re-seed bails out unless
`tiers_config` is entirely empty:

```php
if ( empty( $settings['tiers_enabled'] ) || ! empty( $settings['tiers_config'] ) ) {
    return;
}
```

A `tiers_config` that exists but is meaningless therefore survives untouched.
Observed on a test site:

```json
[{"name":"gold","threshold":0,"multiplier":1},
 {"name":"silver","threshold":0,"multiplier":1}]
```

Every threshold `0` and every multiplier `1` — a tier ladder where all customers
qualify for the top tier and no tier changes anything. The Referrals & Tiers
screen renders it without complaint, so it reads as configured rather than
broken, and because `tiers_config` is non-empty the plugin will never repair it.

Treating "no tier has a non-zero threshold" or "no tier has a multiplier above
1" as equivalent to empty would catch this. A validation notice on the settings
screen would catch it earlier.

### Tier names are matched literally, with no fallback for case

The earning-multiplier lookup matches the `pointbay_vip_tier` user meta value
against the `name` field in `tiers_config`. A user stamped `gold` against a
configured `Gold` matches nothing and silently earns at the base rate — no
notice, no log entry, and the customer's My Rewards page still displays the tier
name it cannot honour.

Comparing case-insensitively, or normalising on write, would remove a whole
class of silent misconfiguration. Worth noting because tier meta is routinely
set by other code (imports, migrations, CRM syncs) that has no reason to know
the configured casing.

### `referrals_newCustomerPoints` renders as an empty string when unset

The Referrals & Tiers summary prints `New customer bonus: %s points`. With the
setting unset, the screen reads literally:

> New customer bonus:  points

`add_settings_defaults()` declares a default of `100`, but that default is not
applied to this read path, so a site that never opened the settings screen shows
the broken sentence. Defaulting at the point of display would be enough.

### `recalculate_tiers` cron flattens a configured tier ladder within a day

Observed on a demo site, 2026-08-23. A seeded ladder with thresholds derived from
real balances — Bronze 0 / Silver 1205 / Gold 1390, giving a spread of roughly
13 / 9 / 4 customers — was replaced overnight by the plugin's own daily
`recalculate_tiers` job. Afterwards:

- `pointbay_tiers_config` was **empty**, not merely different
- `pointbay_vip_tier` user meta was written in **lowercase** (`gold`, `silver`,
  `bronze`) where the config names them capitalised
- the distribution collapsed to **18 of 26 customers in `gold`**

The cron log row for the run is `recalculate_tiers`, status `success` — it does not
consider this an error.

Three separate problems compound here:

1. **Case.** Anything comparing `pointbay_vip_tier` against a configured tier name
   fails a literal match once the cron has run, because the two sources disagree on
   capitalisation.
2. **Config loss.** `maybe_reseed_tiers()` only heals an *empty* `tiers_config`, so
   an emptied config is refilled with defaults rather than with whatever the
   operator configured. There is no path back to a custom ladder.
3. **Thresholds.** Defaults put almost everyone in the top tier, which is the
   failure a derived ladder exists to avoid — a top tier that nearly every customer
   already occupies communicates nothing.

Fix, if touched: write the tier name from the configured value rather than a
lowercased copy, and treat a *populated* config as authoritative so recalculation
re-buckets users without rewriting the ladder itself.

Note for demo seeding: bay-demo-kit's `PointBaySeeder` derives thresholds from the
seeded balances at the 50th and 85th percentiles and clamps the top tier to the
highest real balance. That is correct at seed time and survives until this cron
next runs — so a PointBay demo left standing for a day shows a flattened ladder
that the seeder did not produce.

## Browser / QA rule: keep the site clean, only WooCommerce active

The resting state of the shared dev site is: ONLY woocommerce is active.
Every other plugin stays deactivated unless a test needs it right now.

Before any browser test:

1. Make sure every plugin except woocommerce is deactivated
   (wp plugin list --status=active --field=name).
2. Activate ONLY the plugins this test needs:
   - the plugin under test (and its Pro add-on, when testing Pro)
   - any other plugin the test truly depends on
3. If any error, warning or notice shows up (on the page, in the
   browser console, or in wp-content/debug.log) while ONLY the needed
   plugins are active, TRACE IT. Find the exact file and line that
   causes it, and say whether it comes from the plugin under test,
   WooCommerce, WordPress or the theme. To check whether the plugin
   under test is the cause, deactivate it and reload: if the error
   stays, it is not the plugin's. Report the finding. Fix it only if
   it is in the plugin under test.
   If you find an error while an unneeded plugin is still active,
   that is your mistake: deactivate it first and re-check before
   tracing anything.
   STOP RULE: while an error is visible on a page you are testing,
   do not carry on testing that page as if all is well. Trace it
   to the exact file and line, report who owns it, and tell the
   user straight away. Only continue after the user has seen the
   finding. A note in your brief saying an error is "known" or
   "already traced" does NOT let you skip this: you must still see
   the error cleared, or the user must say to go on despite it.
   Also stop and report if any error appears in the browser console
   or in debug.log for the plugin under test.
4. Test.
5. When the test is done, deactivate everything you activated, so
   only woocommerce is active again. Do NOT bring back any other
   plugin.
6. Delete all test data you created (prefix it ZZ-QA so it is easy
   to find) and undo any option or setting you changed.
7. In your report, list which plugins you activated for the test and
   confirm only woocommerce is active now.

Never ask the user to check something you can check yourself.
Never edit plugin code during QA.
