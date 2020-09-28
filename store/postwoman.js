import Vue from "vue"

export const SETTINGS_KEYS = [
  /**
   * Whether or not to enable scrolling to a specified element, when certain
   * actions are triggered.
   */
  "SCROLL_INTO_ENABLED",

  /**
   * Normally, section frames are multicolored in the UI
   * to emphasise the different sections.
   * This setting allows that to be turned off.
   */
  "FRAME_COLORS_ENABLED",

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
  "PROXY_KEY",

  /**
   * An array of properties to exclude from the URL.
   * e.g. 'auth'
   */
  "URL_EXCLUDES",

  /**
   * A boolean value indicating whether to use the browser extensions
   * to run the requests
   */
  "EXTENSIONS_ENABLED",

  /**
   * A boolean value indicating whether to use the URL bar experiments
   */
  "EXPERIMENTAL_URL_BAR_ENABLED",
]

export const state = () => ({
  settings: {},
  collections: [
    {
      name: "My Collection",
      folders: [],
      requests: [],
    },
  ],
  environments: [
    {
      name: "My Environment Variables",
      variables: [],
    },
  ],
  editingEnvironment: {},
  selectedRequest: {},
  editingRequest: {},
})

export const mutations = {
  applySetting({ settings }, setting) {
    if (setting === null || !(setting instanceof Array) || setting.length !== 2) {
      throw new Error("You must provide a setting (array in the form [key, value])")
    }

    const [key, value] = setting
    // Do not just remove this check.
    // Add your settings key to the SETTINGS_KEYS array at the
    // top of the file.
    // This is to ensure that application settings remain documented.
    if (!SETTINGS_KEYS.includes(key)) {
      throw new Error(`The settings structure does not include the key ${key}`)
    }

    settings[key] = value
  },

  removeVariables({ editingEnvironment }, value) {
    editingEnvironment.variables = value
  },

  setEditingEnvironment(state, value) {
    state.editingEnvironment = { ...value }
  },

  setVariableKey({ editingEnvironment }, { index, value }) {
    editingEnvironment.variables[index].key = value
  },

  setVariableValue({ editingEnvironment }, { index, value }) {
    editingEnvironment.variables[index].value = testValue(value)
  },

  removeVariable({ editingEnvironment }, variables) {
    editingEnvironment.variables = variables
  },

  addVariable({ editingEnvironment }, value) {
    editingEnvironment.variables.push(value)
  },

  replaceEnvironments(state, environments) {
    state.environments = environments
  },

  importAddEnvironments(state, { environments, confirmation }) {
    const duplicateEnvironment = environments.some((item) => {
      return state.environments.some((item2) => {
        return item.name.toLowerCase() === item2.name.toLowerCase()
      })
    })
    if (duplicateEnvironment) {
      this.$toast.info("Duplicate environment")
      return
    }
    state.environments = [...state.environments, ...environments]

    let index = 0
    for (let environment of state.environments) {
      environment.environmentIndex = index
      index += 1
    }
    this.$toast.info(confirmation, {
      icon: "folder_shared",
    })
  },

  removeEnvironment({ environments }, environmentIndex) {
    environments.splice(environmentIndex, 1)
  },

  saveEnvironment({ environments }, payload) {
    const { environment, environmentIndex } = payload
    const { name } = environment
    const duplicateEnvironment =
      environments.length === 1
        ? false
        : environments.some(
            (item) =>
              item.environmentIndex !== environmentIndex &&
              item.name.toLowerCase() === name.toLowerCase()
          )
    if (duplicateEnvironment) {
      this.$toast.info("Duplicate environment")
      return
    }
    environments[environmentIndex] = environment
  },

  replaceCollections(state, collections) {
    state.collections = collections
  },

  importCollections(state, collections) {
    state.collections = [...state.collections, ...collections]

    let index = 0
    for (let collection of collections) {
      collection.collectionIndex = index
      index += 1
    }
  },

  addNewCollection({ collections }, collection) {
    const { name } = collection
    const duplicateCollection = collections.some(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicateCollection) {
      this.$toast.info("Duplicate collection")
      return
    }
    collections.push({
      name: "",
      folders: [],
      requests: [],
      ...collection,
    })
  },

  removeCollection({ collections }, payload) {
    const { collectionIndex } = payload
    collections.splice(collectionIndex, 1)
  },

  editCollection({ collections }, payload) {
    const { collection, collectionIndex } = payload
    const { name } = collection
    const duplicateCollection = collections.some(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    )
    if (duplicateCollection) {
      this.$toast.info("Duplicate collection")
      return
    }
    collections[collectionIndex] = collection
  },

  addFolder({collections}, payload) {
    const {name, folder} = payload;

    const newFolder = {
      name: name,
      requests: [],
      folders: [],
    }
    folder.folders.push(newFolder)
  },

  editFolder({collections}, payload) {
    const {collectionIndex, folder, folderIndex, folderName} = payload
    const collection = collections[collectionIndex];
    const folders = collection.folders;

    if (folders[folderIndex] && folders[folderIndex].name === folderName) {
      Vue.set(folders, folderIndex, folder);
    } else {
      replaceFolder(folder, folders, folderName, folderIndex);
    }
  },

  removeFolder({collections}, payload) {
    const {collectionIndex, folderIndex, folderName} = payload
    const collection = collections[collectionIndex];
    const folders = collection.folders;

    if (folders[folderIndex] && folders[folderIndex].name === folderName) {
      folders.splice(folderIndex, 1)
    } else {
      deleteFolder(folders, folderName, folderIndex)
    }
  },

  addRequest({ collections }, payload) {
    const { request } = payload

    // Request that is directly attached to collection
    if (request.folder === -1) {
      collections[request.collection].requests.push(request)
      return
    }

    collections[request.collection].folders[request.folder].requests.push(request)
  },

  editRequest({ collections }, payload) {
    const { requestCollectionIndex, requestFolderName, requestFolderIndex, requestNew, requestIndex } = payload

    let collection = collections[requestCollectionIndex];

    if (requestFolderIndex === -1) {
      Vue.set(collection.requests, requestIndex, requestNew)
      return
    }

    if (collection.folders && collection.folders.length) {
      if (collection.folders[requestFolderIndex].name === requestFolderName) {
        Vue.set(collection.folders[requestFolderIndex].requests, requestIndex, requestNew)
        return
      }
    }

    let folder = findFolder(requestFolderName, collection)
    Vue.set(folder.requests, requestIndex, requestNew)
  },

  saveRequestAs({ collections }, payload) {
    const { request, collectionIndex, folderIndex, requestIndex } = payload

    const specifiedCollection = collectionIndex !== undefined
    const specifiedFolder = folderIndex !== undefined
    const specifiedRequest = requestIndex !== undefined

    if (specifiedCollection && specifiedFolder && specifiedRequest) {
      Vue.set(collections[collectionIndex].folders[folderIndex].requests, requestIndex, request)
    } else if (specifiedCollection && specifiedFolder && !specifiedRequest) {
      const requests = collections[collectionIndex].folders[folderIndex].requests
      const lastRequestIndex = requests.length - 1
      Vue.set(requests, lastRequestIndex + 1, request)
    } else if (specifiedCollection && !specifiedFolder && specifiedRequest) {
      const requests = collections[collectionIndex].requests
      Vue.set(requests, requestIndex, request)
    } else if (specifiedCollection && !specifiedFolder && !specifiedRequest) {
      const requests = collections[collectionIndex].requests
      const lastRequestIndex = requests.length - 1
      Vue.set(requests, lastRequestIndex + 1, request)
    }
  },

  saveRequest({ collections }, payload) {
    const { request } = payload

    // Remove the old request from collection
    if (
      Object.prototype.hasOwnProperty.call(request, "oldCollection") &&
      request.oldCollection > -1
    ) {
      const folder =
        Object.prototype.hasOwnProperty.call(request, "oldFolder") && request.oldFolder >= -1
          ? request.oldFolder
          : request.folder
      if (folder > -1) {
        collections[request.oldCollection].folders[folder].requests.splice(request.requestIndex, 1)
      } else {
        collections[request.oldCollection].requests.splice(request.requestIndex, 1)
      }
    } else if (
      Object.prototype.hasOwnProperty.call(request, "oldFolder") &&
      request.oldFolder !== -1
    ) {
      collections[request.collection].folders[folder].requests.splice(request.requestIndex, 1)
    }

    delete request.oldCollection
    delete request.oldFolder

    // Request that is directly attached to collection
    if (request.folder === -1) {
      Vue.set(collections[request.collection].requests, request.requestIndex, request)
      return
    }

    Vue.set(
      collections[request.collection].folders[request.folder].requests,
      request.requestIndex,
      request
    )
  },

  removeRequest({ collections }, payload) {
    const { collectionIndex, folderName,  requestIndex } = payload

    if (collections[collectionIndex].name === folderName) {
      collections[collectionIndex].requests.splice(requestIndex, 1)
      return
    }
    deleteRequest(collections[collectionIndex].folders, folderName, requestIndex);
  },

  selectRequest(state, { request }) {
    state.selectedRequest = Object.assign({}, request)
  },

  moveRequest({collections}, payload) {
    const {collectionIndex, newFolderIndex, newFolderName, oldFolderIndex, oldFolderName, requestIndex} = payload;
    const collection = collections[collectionIndex];

    // Moving from collection to another folder
    if (collection.name === oldFolderName) {
      const request = collection.requests[requestIndex];
      collection.requests.splice(requestIndex, 1)
      addRequestToFolder(collection, newFolderIndex, newFolderName, request)
      return
    }

    const request = findRequest(oldFolderName,collection, requestIndex)
    addRequestToFolder(collection, newFolderIndex, newFolderName, request)
  },
}

function testValue(myValue) {
  try {
    return JSON.parse(myValue)
  } catch (ex) {
    // Now we know it's a string just leave it as a string value.
    return myValue
  }
}

function addRequestToFolder(collection, newFolderIndex, newFolderName, request) {
  if (newFolderIndex === -1) {
    collection.requests.push(request)
    return
  }

  let folder = findFolder(newFolderName, collection);
  if (folder) {
    folder.requests.push(request)
  }
}

function findRequest(folderName, currentFolder, requestIndex) {
  let selectedFolder, result;

  if (folderName === currentFolder.name) {
    let request = currentFolder.requests[requestIndex];
    currentFolder.requests.splice(requestIndex, 1)
    return request;
  } else {

    for (let i = 0; i < currentFolder.folders.length; i += 1) {
      selectedFolder = currentFolder.folders[i];

      result = findRequest(folderName, selectedFolder, requestIndex);

      if (result !== false) {
        return result;
      }
    }

    return false;
  }
}

function findFolder(folderName, currentFolder) {
  let selectedFolder, result;

  if (folderName === currentFolder.name) {
    return currentFolder;
  } else {

    for (let i = 0; i < currentFolder.folders.length; i++) {
      selectedFolder = currentFolder.folders[i];

      result = findFolder(folderName, selectedFolder);

      if (result !== false) {
        return result;
      }
    }

    return false;
  }
}

function deleteRequest(folders, folderName, requestIndex) {
  if (folders && folders.length) {
    folders.forEach(function (subFolder) {
      if (subFolder.name === folderName) {
        subFolder.requests.splice(requestIndex, 1)
      }
      deleteRequest(subFolder.folders, folderName, requestIndex);
    })
  }
}

function replaceFolder(folder, folders, folderName, folderIndex) {
  if (folders && folders.length) {
    folders.forEach(function (subFolder) {
      if (subFolder.name === folderName) {
        Vue.set(folders, folderIndex, folder)
      }
      replaceFolder(folder, subFolder.folders, folderName, folderIndex);
    })
  }
}

function deleteFolder(folders, folderName, folderIndex) {
  if (folders && folders.length) {
    folders.forEach(function (subFolder) {
      if (subFolder.name === folderName) {
        folders.splice(folderIndex, 1)
      }
      deleteFolder(subFolder.folders, folderName, folderIndex);
    })
  }
}
