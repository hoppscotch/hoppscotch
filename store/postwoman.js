import Vue from "vue"

export const SETTINGS_KEYS = [
  /**
   * Whether or not to enable scrolling to a specified element, when certain
   * actions are triggered.
   */
  "SCROLL_INTO_ENABLED",

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
  editingEnvironment: {},
  selectedRequest: {},
  selectedGraphqlRequest: {},
  editingRequest: {},
})

export const mutations = {
  applySetting({ settings }, setting) {
    if (
      setting === null ||
      !(setting instanceof Array) ||
      setting.length !== 2
    ) {
      throw new Error(
        "You must provide a setting (array in the form [key, value])"
      )
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
    for (const environment of state.environments) {
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

  replaceCollections(state, item) {
    const collections = item.data
    const flag = item.flag
    if (flag === "rest") state.collections = collections
    else state.collectionsGraphql = collections
  },

  importCollections(state, item) {
    const collections = item.data
    const flag = item.flag
    if (flag === "rest")
      state.collections = [...state.collections, ...collections]
    else
      state.collectionsGraphql = [...state.collectionsGraphql, ...collections]

    let index = 0
    for (const collection of collections) {
      collection.collectionIndex = index
      index += 1
    }
  },

  addNewCollection({ collections, collectionsGraphql }, collection) {
    const name = collection.name
    const flag = collection.flag
    let duplicateCollection = null
    if (flag === "rest") {
      duplicateCollection = collections.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      )
    } else {
      duplicateCollection = collectionsGraphql.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      )
    }
    if (duplicateCollection) {
      this.$toast.info("Duplicate collection")
      return
    }
    if (flag === "rest") {
      collections.push({
        name: "",
        folders: [],
        requests: [],
        ...collection,
      })
    } else {
      collectionsGraphql.push({
        name: "",
        folders: [],
        requests: [],
        ...collection,
      })
    }
  },

  removeCollection({ collections, collectionsGraphql }, payload) {
    const { collectionIndex, flag } = payload
    if (flag === "rest") collections.splice(collectionIndex, 1)
    else collectionsGraphql.splice(collectionIndex, 1)
  },

  editCollection({ collections, collectionsGraphql }, payload) {
    const { collection, collectionIndex, flag } = payload
    const { name } = collection
    let duplicateCollection = null
    if (flag === "rest") {
      duplicateCollection = collections.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      )
    } else {
      duplicateCollection = collectionsGraphql.some(
        (item) => item.name.toLowerCase() === name.toLowerCase()
      )
    }
    if (duplicateCollection) {
      this.$toast.info("Duplicate collection")
      return
    }
    if (flag === "rest") collections[collectionIndex] = collection
    else collectionsGraphql[collectionIndex] = collection
  },

  addFolder({ collections, collectionsGraphql }, payload) {
    const { name, path, flag } = payload
    const newFolder = {
      name,
      requests: [],
      folders: [],
    }

    // Walk from collections to destination with the path
    const indexPaths = path.split("/").map((x) => parseInt(x))

    let target = null
    if (flag === "rest") target = collections[indexPaths.shift()]
    else target = collectionsGraphql[indexPaths.shift()]

    while (indexPaths.length > 0) target = target.folders[indexPaths.shift()]

    target.folders.push(newFolder)
  },

  editFolder({ collections, collectionsGraphql }, payload) {
    const { collectionIndex, folder, folderIndex, folderName, flag } = payload
    let collection = null
    if (flag === "rest") collection = collections[collectionIndex]
    else collection = collectionsGraphql[collectionIndex]

    const parentFolder = findFolder(folderName, collection, true)
    if (parentFolder && parentFolder.folders) {
      Vue.set(parentFolder.folders, folderIndex, folder)
    }
  },

  removeFolder({ collections, collectionsGraphql }, payload) {
    const { collectionIndex, folderIndex, folderName, flag } = payload
    let collection = null
    if (flag === "rest") collection = collections[collectionIndex]
    else collection = collectionsGraphql[collectionIndex]

    const parentFolder = findFolder(folderName, collection, true)
    if (parentFolder && parentFolder.folders) {
      parentFolder.folders.splice(folderIndex, 1)
    }
  },

  editRequest({ collections, collectionsGraphql }, payload) {
    const {
      requestCollectionIndex,
      requestFolderName,
      requestFolderIndex,
      requestNew,
      requestIndex,
      flag,
    } = payload
    let collection = null
    if (flag === "rest") collection = collections[requestCollectionIndex]
    else collection = collectionsGraphql[requestCollectionIndex]

    if (requestFolderIndex === -1) {
      Vue.set(collection.requests, requestIndex, requestNew)
      return
    }

    const folder = findFolder(requestFolderName, collection, false)
    Vue.set(folder.requests, requestIndex, requestNew)
  },

  saveRequestAs({ collections, collectionsGraphql }, payload) {
    let { request } = payload
    const { collectionIndex, folderName, requestIndex, flag } = payload

    if (flag === "rest") {
      // Filter out all file inputs
      request = {
        ...request,
        bodyParams: request.bodyParams.map((param) =>
          param?.value?.[0] instanceof File ? { ...param, value: "" } : param
        ),
      }
    }

    const specifiedCollection = collectionIndex !== undefined
    const specifiedFolder = folderName !== undefined
    const specifiedRequest = requestIndex !== undefined

    if (specifiedCollection && specifiedFolder && specifiedRequest) {
      const folder = findFolder(
        folderName,
        flag === "rest"
          ? collections[collectionIndex]
          : collectionsGraphql[collectionIndex]
      )
      Vue.set(folder.requests, requestIndex, request)
    } else if (specifiedCollection && specifiedFolder && !specifiedRequest) {
      const folder = findFolder(
        folderName,
        flag === "rest"
          ? collections[collectionIndex]
          : collectionsGraphql[collectionIndex]
      )
      const requests = folder.requests
      const lastRequestIndex = requests.length - 1
      Vue.set(requests, lastRequestIndex + 1, request)
    } else if (specifiedCollection && !specifiedFolder && specifiedRequest) {
      const requests =
        flag === "rest"
          ? collections[collectionIndex].requests
          : collectionsGraphql[collectionIndex].requests
      Vue.set(requests, requestIndex, request)
    } else if (specifiedCollection && !specifiedFolder && !specifiedRequest) {
      const requests =
        flag === "rest"
          ? collections[collectionIndex].requests
          : collectionsGraphql[collectionIndex].requests
      const lastRequestIndex = requests.length - 1
      Vue.set(requests, lastRequestIndex + 1, request)
    }
  },

  removeRequest({ collections, collectionsGraphql }, payload) {
    const { collectionIndex, folderName, requestIndex, flag } = payload
    let collection = null
    if (flag === "rest") collection = collections[collectionIndex]
    else collection = collectionsGraphql[collectionIndex]

    if (collection.name === folderName) {
      collection.requests.splice(requestIndex, 1)
      return
    }
    const folder = findFolder(folderName, collection, false)

    if (folder) {
      folder.requests.splice(requestIndex, 1)
    }
  },

  selectRequest(state, { request }) {
    state.selectedRequest = Object.assign({}, request)
  },

  selectGraphqlRequest(state, { request }) {
    state.selectedGraphqlRequest = Object.assign({}, request)
  },

  moveRequest({ collections, collectionsGraphql }, payload) {
    const {
      oldCollectionIndex,
      newCollectionIndex,
      newFolderIndex,
      newFolderName,
      oldFolderName,
      requestIndex,
      flag,
    } = payload
    const isCollection = newFolderIndex === -1
    let oldCollection = null
    if (flag === "rest") oldCollection = collections[oldCollectionIndex]
    else oldCollection = collectionsGraphql[oldCollectionIndex]
    let newCollection = null
    if (flag === "rest") newCollection = collections[newCollectionIndex]
    else newCollection = collectionsGraphql[newCollectionIndex]
    const request = findRequest(oldFolderName, oldCollection, requestIndex)

    if (isCollection) {
      newCollection.requests.push(request)
      return
    }

    if (!isCollection) {
      const folder = findFolder(newFolderName, newCollection, false)
      if (folder) {
        folder.requests.push(request)
      }
    }
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
    const request = currentFolder.requests[requestIndex]
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

      result = findFolder(
        folderName,
        selectedFolder,
        returnParent,
        currentFolder
      )

      if (result !== false) {
        return result
      }
    }
    return false
  }
}
