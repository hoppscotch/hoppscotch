export const SETTINGS_KEYS = [
    /**
     * The CSS class that should be applied to the root element.
     * Essentially, the name of the background theme.
     */
    "THEME_CLASS",

    /**
     * The hex color code for the currently active theme.
     */
    "THEME_COLOR",

    /**
     * Whether or not THEME_COLOR is considered 'vibrant'.
     *
     * For readability reasons, if the THEME_COLOR is vibrant,
     * any text placed on the theme color will have its color
     * inverted from white to black.
     */
    "THEME_COLOR_VIBRANT",

    /**
     * Normally, section frames are multicolored in the UI
     * to emphasise the different sections.
     * This setting allows that to be turned off.
     */
    "DISABLE_FRAME_COLORS",

    /**
     * Whether or not requests should be proxied.
     */
    "PROXY_ENABLED",

    /**
     * The URL of the proxy to connect to for requests.
     */
    "PROXY_URL",
    /**
     * The security key of the proxy.
     */
    "PROXY_KEY"
];

export const state = () => ({
    settings: {}
});

export const mutations = {

    applySetting (state, setting) {
        if(setting == null || !(setting instanceof Array) || setting.length !== 2)
            throw new Error("You must provide a setting (array in the form [key, value])");

        const [key, value] = setting;
        // Do not just remove this check.
        // Add your settings key to the SETTINGS_KEYS array at the
        // top of the file.
        // This is to ensure that application settings remain documented.
        if(!SETTINGS_KEYS.includes(key)) throw new Error("The settings structure does not include the key " + key);

        state.settings[key] = value;
    }

};
