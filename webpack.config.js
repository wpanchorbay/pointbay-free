const defaults = require("@wordpress/scripts/config/webpack.config");

// Single (modern) build target. The legacy target was removed: nothing enqueued
// its *-legacy.js output, and it compiled React/ReactDOM/scheduler/moment into
// the bundle instead of taking them from WordPress core.
module.exports = {
  ...defaults,
  externals: {
    react: "React",
    "react-dom": "ReactDOM",
  },
  entry: {
    admin: "./src/admin.tsx",
    settings: "./src/settings.tsx",
    "block-checkout": "./src/checkout/index.tsx",
    "block-cart": "./src/cart/index.tsx",
  },
  output: {
    ...defaults.output,
    filename: "[name].js",
    clean: false,
  },
};
