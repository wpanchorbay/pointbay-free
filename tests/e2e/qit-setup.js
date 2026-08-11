// Exposes the QIT runtime to every spec. No mocking — real environment.
// Copy verbatim into tests/e2e/qit-setup.js. Specs `require('../qit-setup')`
// and then `require('@woocommerce/qit-runtime')` for `qit.wp(...)` / `qit.env`.
const { qit } = require('@woocommerce/qit-runtime');
module.exports = { qit };
