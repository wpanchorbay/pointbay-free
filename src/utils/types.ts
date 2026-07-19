/**
 * Type definitions for the LoyaltyBay plugin.
 *
 * Customize these types for your own plugin's data structures.
 */

export interface PluginData {
    plugin_name: string;
    short_name: string;
    menu_label: string;
    custom_icon: string;
    menu_icon: string;
    author_name: string;
    author_uri: string;
    support_uri: string;
    docs_uri: string;
    position: number;
}

export interface WpSettings {
    dateFormat: string;
    timeFormat: string;
}

/**
 * Plugin settings as stored in the WordPress option.
 * Must match the PHP default settings in Common.php.
 */
export interface PluginSettings {
    general_isEnabled: boolean;
    general_apiToken: string;
    appearance_primaryColor: string;
    appearance_customCss: string;
    advanced_deleteAllOnUninstall: boolean;
    debug_enableMode: boolean;
}

/**
 * The main store type, matching the data passed by PHP's wp_localize_script().
 */
export interface BoilerplateStore {
    version: string;
    root_id: string;
    nonce: string;
    store: string;
    rest_url: string;
    pluginData: PluginData;
    wpSettings: WpSettings;
    plugin_settings: PluginSettings;
}
