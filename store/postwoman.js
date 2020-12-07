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
  providerInfo: {},
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

  addFolder({ collections }, payload) {
    const { name, path } = payload

    const newFolder = {
      name: name,
      requests: [],
      folders: [],
    }

    // Walk from collections to destination with the path
    const indexPaths = path.split("/").map((x) => parseInt(x))

    let target = collections[indexPaths.shift()]
    while (indexPaths.length > 0) target = target.folders[indexPaths.shift()]

    target.folders.push(newFolder)
  },

  editFolder({ collections }, payload) {
    const { collectionIndex, folder, folderIndex, folderName } = payload
    const collection = collections[collectionIndex]

    let parentFolder = findFolder(folderName, collection, true)
    if (parentFolder && parentFolder.folders) {
      Vue.set(parentFolder.folders, folderIndex, folder)
    }
  },

  removeFolder({ collections }, payload) {
    const { collectionIndex, folderIndex, folderName } = payload
    const collection = collections[collectionIndex]

    let parentFolder = findFolder(folderName, collection, true)
    if (parentFolder && parentFolder.folders) {
      parentFolder.folders.splice(folderIndex, 1)
    }
  },

  editRequest({ collections }, payload) {
    const {
      requestCollectionIndex,
      requestFolderName,
      requestFolderIndex,
      requestNew,
      requestIndex,
    } = payload

    let collection = collections[requestCollectionIndex]

    if (requestFolderIndex === -1) {
      Vue.set(collection.requests, requestIndex, requestNew)
      return
    }

    let folder = findFolder(requestFolderName, collection, false)
    Vue.set(folder.requests, requestIndex, requestNew)
  },

  saveRequestAs({ collections }, payload) {
    const { request, collectionIndex, folderName, requestIndex } = payload

    const specifiedCollection = collectionIndex !== undefined
    const specifiedFolder = folderName !== undefined
    const specifiedRequest = requestIndex !== undefined

    if (specifiedCollection && specifiedFolder && specifiedRequest) {
      const folder = findFolder(folderName, collections[collectionIndex])
      Vue.set(folder.requests, requestIndex, request)
    } else if (specifiedCollection && specifiedFolder && !specifiedRequest) {
      const folder = findFolder(folderName, collections[collectionIndex])
      const requests = folder.requests
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

  removeRequest({ collections }, payload) {
    const { collectionIndex, folderName, requestIndex } = payload
    let collection = collections[collectionIndex]

    if (collection.name === folderName) {
      collection.requests.splice(requestIndex, 1)
      return
    }
    let folder = findFolder(folderName, collection, false)

    if (folder) {
      folder.requests.splice(requestIndex, 1)
    }
  },

  selectRequest(state, { request }) {
    state.selectedRequest = Object.assign({}, request)
  },

  moveRequest({ collections }, payload) {
    const {
      oldCollectionIndex,
      newCollectionIndex,
      newFolderIndex,
      newFolderName,
      oldFolderName,
      requestIndex,
    } = payload

    const isCollection = newFolderIndex === -1
    const oldCollection = collections[oldCollectionIndex]
    const newCollection = collections[newCollectionIndex]
    const request = findRequest(oldFolderName, oldCollection, requestIndex)

    if (isCollection) {
      newCollection.requests.push(request)
      return
    }

    if (!isCollection) {
      const folder = findFolder(newFolderName, newCollection, false)
      if (folder) {
        folder.requests.push(request)
        return
      }
    }
  },

  setProviderInfo(state, value) {
    state.providerInfo = value
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

function findRequest(folderName, currentFolder, requestIndex) {
  let selectedFolder, result

  if (folderName === currentFolder.name) {
    let request = currentFolder.requests[requestIndex]
    currentFolder.requests.splice(requestIndex, 1)
    return request
  } else {
    for (let i = 0; i < currentFolder.folders.length; i += 1) {
      selectedFolder = currentFolder.folders[i]

      result = findRequest(folderName, selectedFolder, requestIndex)

      if (result !== false) {
        return result
      }
    }
    return false
  }
}

function findFolder(folderName, currentFolder, returnParent, parentFolder) {
  let selectedFolder, result

  if (folderName === currentFolder.name && returnParent) {
    return parentFolder
  } else if (folderName === currentFolder.name && !returnParent) {
    return currentFolder
  } else {
    for (let i = 0; i < currentFolder.folders.length; i++) {
      selectedFolder = currentFolder.folders[i]

      result = findFolder(folderName, selectedFolder, returnParent, currentFolder)

      if (result !== false) {
        return result
      }
    }
    return false
  }
}
