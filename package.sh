#!/bin/bash

# PointBay Packaging Script
# This script builds the project and creates distributable zip files.

# Exit on error
set -e

# Define the zip filename
PLUGIN_SLUG="pointbay-loyalty-points-referral-rewards-woo"
ZIP_NAME="$PLUGIN_SLUG.zip"

echo "------------------------------------------------------"
echo "  Packaging $PLUGIN_SLUG..."
echo "------------------------------------------------------"

# 1. Run the build script
# Pass the readme's Stable tag through as the version so the source links that
# build.sh injects into build/*.js track the release instead of silently pinning
# to build.sh's 1.0.0 default forever.
PLUGIN_VERSION=$(awk '/^Stable tag:/ {print $3; exit}' readme.txt)
echo "Step 1: Running build process (version ${PLUGIN_VERSION})..."
bash build.sh "$PLUGIN_VERSION"

# 2. Regenerate the translation template AFTER the build.
# make-pot cannot parse src/*.tsx, so every JS string it finds comes out of
# build/*.js. Running it first meant the .pot described the PREVIOUS build --
# line references that no shipped file matched, which also breaks make-json
# (its JSON filenames are keyed on a hash of the referenced JS file). Running
# it here makes the .pot describe exactly the bundles in the zip.
echo "Step 2: Generating translations (makepot + make-json)..."
npm run makepot
npm run make-json

# 2. Cleanup previous distribution if exists
echo "Step 3: Cleaning up old files..."
rm -rf dist
rm -f $ZIP_NAME

# 3. Create staging directories
mkdir -p "dist/wordpress/$PLUGIN_SLUG"
mkdir -p "dist/woocommerce/$PLUGIN_SLUG"

# Helper function to copy plugin files to a target path
copy_plugin_files() {
    local DEST=$1
    echo "Copying files to $DEST..."
    
    # Copy folders
    cp -r app "$DEST/"
    cp -r languages "$DEST/"
    cp -r assets "$DEST/"
    cp -r build "$DEST/"
    cp -r vendor "$DEST/"
    cp -r config "$DEST/"

    # Ship the React source alongside the compiled build so the plugin satisfies
    # WordPress.org's "source must be publicly accessible" guideline out of the box
    # (the readme also links the public repo). build/*.js is compiled from src/.
    cp -r src "$DEST/"

    # Strip source maps from the release build (dev-only, large, not for production).
    find "$DEST/build" -name '*.map' -delete

    # Strip the legacy bundles. Nothing enqueues them (no PHP in this plugin or in
    # the pro add-on references "legacy"), and unlike the modern target -- which
    # takes React from WordPress core via window.React -- they compile in React,
    # ReactDOM, scheduler and moment. Shipping them would put ~2.4 MB of minified
    # third-party code in the zip for zero runtime benefit, and would contradict
    # the readme's "React and ReactDOM are provided by WordPress core".
    find "$DEST/build" \( -name '*-legacy.js' -o -name '*-legacy.js.LICENSE.txt' \) -delete

    # Strip dev-only metadata shipped inside composer packages (avoids "hidden files" flags).
    find "$DEST/vendor" \( -name '.gitignore' -o -name '.gitattributes' -o -name '.editorconfig' \
        -o -name 'phpcs.xml' -o -name 'phpunit.xml*' -o -name '.php-cs-fixer*' \) -delete 2>/dev/null || true
    find "$DEST/vendor" -type d \( -name 'tests' -o -name 'test' -o -name 'docs' -o -name '.github' \) \
        -exec rm -rf {} + 2>/dev/null || true

    # Copy files
    cp index.php "$DEST/"
    cp readme.txt "$DEST/"
    cp uninstall.php "$DEST/"
    cp pointbay-loyalty-points-referral-rewards-woo.php "$DEST/"
    cp composer.json "$DEST/"

    # Ship the JS build-tooling config so the bundled src/ is self-buildable from
    # the zip alone (npm install && npm run build reproduces build/*.js). This
    # makes the readme "Development" build steps runnable without the repo and
    # fully satisfies the "source must be publicly accessible" guideline. The
    # public repo additionally carries package-lock.json for byte-exact pinning.
    cp package.json "$DEST/"
    cp webpack.config.js "$DEST/"
    cp tsconfig.json "$DEST/"
    cp tailwind.config.js "$DEST/"
    cp postcss.config.js "$DEST/"

    # Copy changelog if exists
    if [ -f "changelog.txt" ]; then
        cp changelog.txt "$DEST/"
    fi
}

# 4. Copy files to both staging areas
echo "Step 4: Copying folders and files..."
copy_plugin_files "dist/wordpress/$PLUGIN_SLUG"
copy_plugin_files "dist/woocommerce/$PLUGIN_SLUG"

# 5. Create WordPress Zip
# Zipped from INSIDE the staging dir so the plugin files sit at the top level
# of the archive with no wrapping folder.
echo "Step 5: Creating WordPress zip..."
cd "dist/wordpress/$PLUGIN_SLUG"
zip -r "../$ZIP_NAME" . > /dev/null
cd ..
# Remove the folder after zipping to leave only the zip in the subfolder
rm -rf "$PLUGIN_SLUG"
cd ../..

# 6. Create WooCommerce Zip
echo "Step 6: Creating WooCommerce zip..."
cd "dist/woocommerce/$PLUGIN_SLUG"
zip -r "../$ZIP_NAME" . > /dev/null
cd ..
# Remove the folder after zipping to leave only the zip in the subfolder
rm -rf "$PLUGIN_SLUG"
cd ../..

echo "------------------------------------------------------"
echo "Done! Packages created successfully:"
echo "- dist/wordpress/$ZIP_NAME"
echo "- dist/woocommerce/$ZIP_NAME"
echo ""
echo "Note: The zip files contain the plugin files at the top level (no parent directory)."
echo "------------------------------------------------------"
