const { test } = require('@playwright/test');
const { seedProduct, seedCustomer, disableComingSoon, enableCodGateway } = require('./helpers');

/**
 * Seeds fixtures shared by both phases: a purchasable product, a real
 * customer account (guest checkout has no customer_id, so PointBay never
 * awards points on it — a login is required for every earning spec), the
 * store out of "coming soon" mode (WooCommerce default-ON in a fresh env,
 * otherwise the storefront/checkout renders a placeholder instead of content),
 * and Cash on Delivery enabled (WooCommerce ships with no gateway active).
 * Runs once before either phase via the runner script.
 */
test('Seed fixtures', async () => {
    await disableComingSoon();
    await enableCodGateway();
    const productId = await seedProduct({ slug: 'earn-test-product', name: 'Earn Test Product', price: 10 });
    const customerId = await seedCustomer({ username: 'e2ecustomer', email: 'e2ecustomer@example.com', password: 'E2ePass123!' });
    console.log(`Seeded: product #${productId} (earn-test-product, $10), customer #${customerId} (e2ecustomer)`);
});
