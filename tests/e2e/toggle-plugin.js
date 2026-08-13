// Activate / deactivate a plugin by slug between test phases (WP-CLI via the
// QIT runtime). Copy verbatim into tests/e2e/toggle-plugin.js.
//   node toggle-plugin.js deactivate <pro-slug>   # Phase A (free)
//   node toggle-plugin.js activate   <pro-slug>   # Phase B (free + pro)
require('./qit-setup');
const { qit } = require('@woocommerce/qit-runtime');

async function main() {
    const [action, slug] = process.argv.slice(2);
    if (!['activate', 'deactivate'].includes(action) || !slug) {
        console.error('Usage: node toggle-plugin.js <activate|deactivate> <plugin-slug>');
        process.exit(1);
    }
    console.log(await qit.wp(`plugin ${action} ${slug} --allow-root`));
}

main().catch((err) => { console.error(err); process.exit(1); });
