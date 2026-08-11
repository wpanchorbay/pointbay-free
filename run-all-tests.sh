#!/bin/bash
# Full behavioral suite: Phase A (free, Pro deactivated) then Phase B (free
# regression + @pro, Pro activated), one QIT environment, screenshots + contact
# sheet. Run from the PLUGIN ROOT:  bash run-all-tests.sh
# Replace pointbaypro at scaffold time.
set -e
export PATH="$PATH:$HOME/.config/composer/vendor/bin"
PRO_SLUG="pointbaypro"

echo "==> Tearing down any existing QIT environment"
qit env:down >/dev/null 2>&1 || true

echo "==> Spinning up QIT environment (woocommerce + free SUT + pro sibling)"
qit env:up -e default -n

cd tests/e2e
rm -rf screenshots  # stale shots from a prior run would bleed into this run's contact sheet
echo "==> Sourcing environment"
source "$(qit env:source 2>/dev/null | tail -1)"     # tail -1 strips the "update available" banner
export WP_URL="$QIT_BASE_URL" WP_BASE_URL="$QIT_BASE_URL"
echo "    Target: $WP_URL"

echo "==> Seeding fixtures (00-setup)"
QIT_PHASE=free npx playwright test tests/00-setup.spec.js --workers=1

SPECS=$(ls tests/*.spec.js | grep -v '00-setup.spec.js')

echo "==> PHASE A: free specs (Pro deactivated)"
node toggle-plugin.js deactivate "$PRO_SLUG"
QIT_PHASE=free CTRF_OUTPUT=ctrf-free.json \
    npx playwright test --grep-invert '@pro' --workers=1 $SPECS || PHASE_A_FAILED=1

echo "==> PHASE B: free regression + @pro specs (Pro activated)"
node toggle-plugin.js activate "$PRO_SLUG"
QIT_PHASE=pro CTRF_OUTPUT=ctrf-pro.json \
    npx playwright test --workers=1 $SPECS || PHASE_B_FAILED=1

echo "==> Building screenshot contact sheet"
node make-contact-sheet.js

echo ""
echo "Results:     tests/e2e/results/ctrf-free.json , tests/e2e/results/ctrf-pro.json"
echo "Screenshots: tests/e2e/screenshots/index.html   (gitignored)"
[ -n "$PHASE_A_FAILED$PHASE_B_FAILED" ] && { echo "One or more phases had failures — inspect CTRF + screenshots."; exit 1; }
echo "All phases green."
