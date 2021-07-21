import Vue from "vue"

export const state = () => ({
  editingEnvironment: {},
  selectedRequest: {},
  selectedGraphqlRequest: {},
  editingRequest: {},
})

export const mutations = {
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
