#!/bin/bash
# Free-only gate: Phase A extracted. Fresh env, seed, deactivate Pro, run the
# non-@pro specs exactly as a free-only user experiences them. This is the
# wordpress.org release gate for the free plugin. Run from the PLUGIN ROOT:
#   bash run-free-tests.sh          # headed-equivalent default
#   bash run-free-tests.sh --keep   # reuse a running env instead of recreating
# Replace pointbaypro at scaffold time.
set -e
export PATH="$PATH:$HOME/.config/composer/vendor/bin"
PRO_SLUG="pointbaypro"

if [ "$1" != "--keep" ]; then
    echo "==> Recreating QIT environment"
    qit env:down >/dev/null 2>&1 || true
    qit env:up -e default -n
fi

cd tests/e2e
source "$(qit env:source 2>/dev/null | tail -1)"
export WP_URL="$QIT_BASE_URL" WP_BASE_URL="$QIT_BASE_URL"
echo "    Target: $WP_URL"

echo "==> Seeding fixtures (00-setup)"
QIT_PHASE=free npx playwright test tests/00-setup.spec.js --workers=1

echo "==> Deactivating Pro (free-only run)"
node toggle-plugin.js deactivate "$PRO_SLUG"

SPECS=$(ls tests/*.spec.js | grep -v '00-setup.spec.js')
echo "==> FREE SUITE (Pro deactivated)"
QIT_PHASE=free CTRF_OUTPUT=ctrf-free.json \
    npx playwright test --grep-invert '@pro' --workers=1 $SPECS

node make-contact-sheet.js
echo "Free suite complete. Results: tests/e2e/results/ctrf-free.json"
echo "Screenshots: tests/e2e/screenshots/index.html (gitignored)"
