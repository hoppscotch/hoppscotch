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
    settings: {},
    collections: [{
        name: 'My First Collection',
        folders: [],
        requests: [],
    }],
    selectedRequest: {},
    editingRequest: {},
});

export const mutations = {

    applySetting (state, setting) {
        if (setting == null || !(setting instanceof Array) || setting.length !== 2)
            throw new Error("You must provide a setting (array in the form [key, value])");

        const [key, value] = setting;
        // Do not just remove this check.
        // Add your settings key to the SETTINGS_KEYS array at the
        // top of the file.
        // This is to ensure that application settings remain documented.
        if (!SETTINGS_KEYS.includes(key)) throw new Error("The settings structure does not include the key " + key);

        state.settings[key] = value;
    },

    replaceCollections (state, collections) {
        state.collections = collections;
    },

    importCollections (state, collections) {
        state.collections = [...state.collections, ...collections];

        let index = 0;
        for (let collection of collections) {
            collection.collectionIndex = index;
            index += 1;
        }
    },

    addNewCollection (state, collection) {
        state.collections.push({
            name: '',
            folders: [],
            requests: [],
            ...collection,
        })
    },

    removeCollection (state, payload) {
        const { collectionIndex } = payload;
        state.collections.splice(collectionIndex, 1)
    },

    editCollection (state, payload) {
        const { collection, collectionIndex } = payload
        state.collections[collectionIndex] = collection
    },

    addFolder (state, payload) {
        const { collectionIndex, folder } = payload;
        state.collections[collectionIndex].folders.push(folder);
    },

    removeFolder (state, payload) {
        const { collectionIndex, folderIndex } = payload;
        state.collections[collectionIndex].folders.splice(folderIndex, 1)
    },

    saveFolder (state, payload) {
        const { savedFolder } = payload;
        state.collections[savedFolder.collectionIndex].folders[savedFolder.folderIndex] = savedFolder;
    },

    addRequest (state, payload) {
        const { request } = payload;

        // Request that is directly attached to collection
        if (request.folder === -1) {
            state.collections[request.collection].requests.push(request);
            return
        }

        state.collections[request.collection].folders[request.folder].requests.push(request);
    },

    saveRequest (state, payload) {
        const { request } = payload;

        // Remove the old request from collection
        if (request.hasOwnProperty('oldCollection') && request.oldCollection > -1) {
            const folder = request.hasOwnProperty('oldFolder') && request.oldFolder >= -1 ? request.oldFolder : request.folder;
            if (folder > -1) {
                state.collections[request.oldCollection].folders[folder].requests.splice(request.requestIndex, 1)
            } else {
                state.collections[request.oldCollection].requests.splice(request.requestIndex, 1)
            }
        } else if (request.hasOwnProperty('oldFolder') && request.oldFolder !== -1) {
            state.collections[request.collection].folders[folder].requests.splice(request.requestIndex, 1)
        }

        delete request.oldCollection;
        delete request.oldFolder;

        // Request that is directly attached to collection
        if (request.folder === -1) {
            state.collections[request.collection].requests[request.requestIndex] = request;
            return
        }

        state.collections[request.collection].folders[request.folder].requests[request.requestIndex] = request;
    },

    removeRequest (state, payload) {
        const { collectionIndex, folderIndex, requestIndex } = payload;

        // Request that is directly attached to collection
        if (folderIndex === -1) {
            state.collections[collectionIndex].requests.splice(requestIndex, 1)
            return
        }

        state.collections[collectionIndex].folders[folderIndex].requests.splice(requestIndex, 1)
    },

    selectRequest (state, payload) {
        state.selectedRequest = Object.assign({}, payload.request);
    },

    editRequest (state, payload) {
        state.editingRequest = Object.assign({}, payload.request);
    },

};
