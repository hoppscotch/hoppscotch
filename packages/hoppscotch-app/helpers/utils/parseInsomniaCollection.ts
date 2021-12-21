function transformUrl(insomniaUrl: string) {
  if (insomniaUrl === "") return {}
  const postmanUrl: any = {}
  postmanUrl.raw = insomniaUrl
  const urlParts = insomniaUrl.split(/:\/\//)
  let rawHostAndPath
  if (urlParts.length === 1) {
    rawHostAndPath = urlParts[0]
  } else if (urlParts.length === 2) {
    postmanUrl.protocol = urlParts[0]
    rawHostAndPath = urlParts[1]
  } else {
    console.error(
      "Error: Unexpected number of components found in the URL string. Exiting."
    )
    process.exit(3)
  }
  // https://stackoverflow.com/questions/4607745/split-string-only-on-first-instance-of-specified-character
  const hostAndPath = rawHostAndPath.split(/\/(.+)/)
  postmanUrl.host = hostAndPath[0].split(/\./)
  postmanUrl.path =
    hostAndPath[1] === undefined ? [] : hostAndPath[1].split(/\//)
  return postmanUrl
}

function transformHeaders(insomniaHeaders: any) {
  const outputHeaders: any[] = []
  insomniaHeaders.forEach((element: any) => {
    const header: any = {}
    header.key = element.name
    header.value = element.value
    outputHeaders.push(header)
  })
  return outputHeaders
}

function transformBody(insomniaBody: any) {
  const body: any = {}
  switch (insomniaBody.mimeType) {
    case "":
    case "application/json":
    case "application/xml":
      body.mode = "raw"
      body.raw = insomniaBody.text
      break
    case "multipart/form-data":
      body.mode = "formdata"
      body.formdata = []
      insomniaBody.params.forEach((param: any) => {
        body.formdata.push({ key: param.name, value: param.value })
      })
      break
    case "application/x-www-form-urlencoded":
      body.mode = "urlencoded"
      body.urlencoded = []
      insomniaBody.params.forEach((param: any) => {
        body.urlencoded.push({ key: param.name, value: param.value })
      })
      break
    case "application/octet-stream":
      body.mode = "file"
      body.file = {}
      body.file.src = "/C:/PleaseSelectAFile"
      console.warn(
        "Warning: A file is supposed to be a part of the request!!! Would need to be manually selected in Postman."
      )
      break
    default:
      console.warn(
        "Warning: Body type unsupported; skipped!!! ... " +
          insomniaBody.mimeType
      )
      body.mode = "raw"
      body.raw =
        "github.com/Vyoam/InsomniaToPostmanFormat: Unsupported body type " +
        insomniaBody.mimeType
      break
  }
  return body
}

function transformItem(insomniaItem: any) {
  const postmanItem: any = {}
  postmanItem.name = insomniaItem.name
  const request: any = {}
  request.method = insomniaItem.method
  request.header = transformHeaders(insomniaItem.headers)
  if (Object.keys(insomniaItem.body).length !== 0) {
    request.body = transformBody(insomniaItem.body)
  }
  request.url = transformUrl(insomniaItem.url)
  if (insomniaItem.parameters && insomniaItem.parameters.length > 0) {
    if (request.url.raw !== undefined && request.url.raw.includes("?")) {
      console.warn(
        "Warning: Query params detected in both the raw query and the 'parameters' object of Insomnia request!!! Exported Postman collection may need manual editing for erroneous '?' in url."
      )
    }
    request.url.query = []
    insomniaItem.parameters.forEach((param: any) => {
      request.url.query.push({ key: param.name, value: param.value })
    })
  }
  request.auth = {} // todo
  if (Object.keys(insomniaItem.authentication).length !== 0) {
    console.warn("Warning: Auth param export not yet supported!!!")
  }
  postmanItem.request = request
  postmanItem.response = []
  return postmanItem
}

const rootId = "d1097c3b-2011-47a4-8f95-87b8f4b54d6d" // unique guid for root

function generateMaps(insomniaParentChildList: any) {
  const parentChildrenMap = new Map()
  const flatMap = new Map()
  insomniaParentChildList.forEach((element: any) => {
    flatMap.set(element._id, element)
    let elementArray = []
    switch (element._type) {
      case "workspace":
        // 'bug': only one workspace to be selected (the last one which comes up here)
        elementArray.push(element)
        parentChildrenMap.set(rootId, elementArray) // in any case will select the top workspace when creating tree
        break
      case "request":
        elementArray = parentChildrenMap.get(element.parentId)
        if (elementArray === undefined) elementArray = []
        elementArray.push(element)
        parentChildrenMap.set(element.parentId, elementArray)
        break
      case "request_group":
        elementArray = parentChildrenMap.get(element.parentId)
        if (elementArray === undefined) elementArray = []
        elementArray.push(element)
        parentChildrenMap.set(element.parentId, elementArray)
        break
      default:
        console.warn(
          "Warning: Item type unsupported; skipped!!! ... " + element._type
        )
    }
  })
  const maps = [parentChildrenMap, flatMap]
  return maps
}

function getCollectionName(insomniaParentChildList: any) {
  let collectionName = "Untitled"

  insomniaParentChildList.forEach((element: any) => {
    if (element._type === "workspace") {
      collectionName = element.name
    }
  })

  return collectionName
}

function generateTreeRecursively(element: any, parentChildrenMap: any) {
  let postmanItem: any = {}
  switch (element._type) {
    case "request_group":
      postmanItem.name = element.name
      postmanItem.item = []
      parentChildrenMap.get(element._id).forEach((child: any) => {
        postmanItem.item.push(generateTreeRecursively(child, parentChildrenMap))
      })
      break
    case "request":
      postmanItem = transformItem(element)
      break
    default:
      console.warn(
        "Warning: Item type unsupported; skipped!!! ... " + element._type
      )
  }
  return postmanItem
}

function getSubItemTrees(parentChildrenMap: any) {
  const subItemTrees: any[] = []
  const roots = parentChildrenMap.get(rootId)
  parentChildrenMap.get(roots[0]._id).forEach((element: any) => {
    subItemTrees.push(generateTreeRecursively(element, parentChildrenMap))
  })
  return subItemTrees
}

export function parseInsomniaCollection(inputDataString: string) {
  const inputData = JSON.parse(inputDataString)

  console.log("Parsing Insomnia collection...", inputData)

  if (inputData.__export_format !== 4) {
    console.error(
      "Error: Version (__export_format " +
        inputData.__export_format +
        ") not supported. Only version 4 is supported."
    )
    process.exit(2)
  }

  const outputData: any = {
    info: {
      _postman_id: "",
      name: "",
      schema:
        "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [],
  }

  outputData.info._postman_id = uuidv4()
  outputData.info.name = getCollectionName(inputData.resources)

  const maps = generateMaps(inputData.resources)
  console.log(maps)
  const parentChildrenMap = maps[0]
  //   const flatMap = maps[1]

  const subItems: any = getSubItemTrees(parentChildrenMap)
  outputData.item.push(...subItems)

  return outputData
}

function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
