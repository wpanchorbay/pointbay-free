# PointBay — notes

## Known issues

Found while building demo data with `bay-demo-kit` (2026-08-22). Verified against
the Pro source tree. No fix applied here.

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

### `pointbay_cron_log` mixes the MySQL clock with the WordPress clock

`started_at` is never written by PHP. `CronJobRunner::run()`'s insert
(`app/Core/CronJobRunner.php:64-70`) supplies only `job_name`, `status` and
`payload`, so the column falls back to its schema default —
`DEFAULT CURRENT_TIMESTAMP` (`app/Database/Migrations/CreateCronLogTable.php`),
evaluated by **MySQL** in the database session's timezone.

`completed_at` is written by PHP with `current_time( 'mysql' )` at :84 and :100 —
the **WordPress** timezone.

Those are two different clocks. Whenever they disagree, every row is wrong.
Observed on a Local by Flywheel stack where MySQL's session `time_zone` is
`SYSTEM` (UTC+6) and WordPress is UTC:

```
job_name            started_at            completed_at
recalculate_tiers   2026-08-22 19:10:43   2026-08-22 13:10:43
```

The job completed six hours before it started. The same skew makes rows appear
future-dated relative to `UTC_TIMESTAMP()`, so any "recent runs" query or ordering
by `started_at` is unreliable, and a computed duration is negative.

This is not exotic: a MySQL server left on `SYSTEM` time while WordPress runs UTC
is the common shipping configuration on shared hosting, so most installs will be
skewed by their local UTC offset.

Fix, if touched: write `started_at` explicitly from PHP alongside the other
insert columns, using the same call the completion path uses, rather than relying
on the column default. Both timestamps then come from one clock. (Whether that
clock should be `current_time('mysql')` or `current_time('mysql', true)`/`gmdate()`
is a separate question — but they must at least match each other.)

Note for demo seeding: bay-demo-kit's `PointBaySeeder::seed_cron_log()` writes
`started_at` explicitly, so its own rows are self-consistent. Only rows created by
the plugin at runtime show the skew — which is how this was found, sitting next to
the seeded ones.

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
