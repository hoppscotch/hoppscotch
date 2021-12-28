<template>
  <SmartModal
    v-if="show"
    :title="`${t('modal.import_export')} ${t('modal.collections')}`"
    max-width="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <ButtonSecondary
        v-if="mode == 'import_from_my_collections'"
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.go_back')"
        svg="arrow-left"
        @click.native="
          () => {
            mode = 'import_export'
            mySelectedCollectionID = undefined
          }
        "
      />
    </template>
    <template #body>
      <div v-for="(step, index) in importerSteps" :key="`step-${index}`">
        {{ step }}
      </div>
      <div v-if="importerType > 0">start steps</div>
      <div v-if="mode == 'import_export'" class="flex flex-col space-y-2 px-2">
        <SmartExpand>
          <template #body>
            <SmartItem
              svg="folder-plus"
              :label="t('import.json')"
              @click.native="openDialogChooseFileToImportFrom"
            />
            <input
              ref="inputChooseFileToImportFrom"
              class="input"
              type="file"
              accept="application/json"
              @change="importFromJSON"
            />
            <SmartItem
              v-if="collectionsType.type == 'team-collections'"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.preserve_current')"
              svg="user"
              :label="t('import.from_my_collections')"
              @click.native="mode = 'import_from_my_collections'"
            />
            <SmartItem svg="link-2" :label="t('import.from_url')" />
            <SmartItem
              svg="github"
              :label="t('import.from_gist')"
              @click.native="
                () => {
                  readCollectionGist()
                }
              "
            />
            <SmartItem svg="file" :label="t('import.from_openapi')" />
            <SmartItem svg="insomnia" :label="t('import.from_insomnia')" />
            <SmartItem svg="postman" :label="t('import.from_postman')" />
            <input
              ref="inputChooseFileToReplaceWith"
              class="input"
              type="file"
              accept="application/json"
              @change="replaceWithJSON"
            />
          </template>
        </SmartExpand>
        <hr />
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          svg="download"
          :label="t('export.as_json')"
          @click.native="exportJSON"
        />
        <span
          v-tippy="{ theme: 'tooltip' }"
          :title="
            !currentUser
              ? `${t('export.require_github')}`
              : currentUser.provider !== 'github.com'
              ? `${t('export.require_github')}`
              : undefined
          "
          class="flex"
        >
          <SmartItem
            :disabled="
              !currentUser
                ? true
                : currentUser.provider !== 'github.com'
                ? true
                : false
            "
            svg="github"
            :label="t('export.create_secret_gist')"
            @click.native="
              () => {
                createCollectionGist()
              }
            "
          />
        </span>
      </div>
      <div
        v-if="mode == 'import_from_my_collections'"
        class="flex flex-col px-2"
      >
        <div class="select-wrapper">
          <select
            type="text"
            autocomplete="off"
            class="select"
            autofocus
            @change="
              ($event) => {
                mySelectedCollectionID = $event.target.value
              }
            "
          >
            <option
              :key="undefined"
              :value="undefined"
              hidden
              disabled
              selected
            >
              Select Collection
            </option>
            <option
              v-for="(collection, index) in myCollections"
              :key="`collection-${index}`"
              :value="index"
            >
              {{ collection.name }}
            </option>
          </select>
        </div>
      </div>
    </template>
    <template #footer>
      <div v-if="mode == 'import_from_my_collections'">
        <span>
          <ButtonPrimary
            :disabled="mySelectedCollectionID == undefined"
            svg="folder-plus"
            :label="t('import.title')"
            @click.native="importFromMyCollections"
          />
        </span>
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { HoppRESTRequest, translateToNewRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { apolloClient } from "~/helpers/apollo"
import {
  useAxios,
  useI18n,
  useReadonlyStream,
  useToast,
} from "~/helpers/utils/composables"
import { currentUser$ } from "~/helpers/fb/auth"
import * as teamUtils from "~/helpers/teams/utils"
import { parseInsomniaCollection } from "~/helpers/utils/parseInsomniaCollection"
import {
  restCollections$,
  setRESTCollections,
  appendRESTCollections,
  Collection,
  makeCollection,
} from "~/newstore/collections"
import { RESTCollectionImporters } from "~/helpers/import-export/import"

const props = defineProps<{
  show: boolean
  collectionsType:
    | {
        type: "team-collections"
        selectedTeam: {
          id: string
        }
      }
    | { type: "my-collections" }
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "update-team-collections"): void
}>()

const axios = useAxios()
const toast = useToast()
const t = useI18n()
const myCollections = useReadonlyStream(restCollections$, [])
const currentUser = useReadonlyStream(currentUser$, null)

const mode = ref("import_export")
const mySelectedCollectionID = ref(undefined)
const collectionJson = ref("")

// Template refs
const inputChooseFileToReplaceWith = ref<HTMLInputElement>()
const inputChooseFileToImportFrom = ref<HTMLInputElement>()

const getJSONCollection = async () => {
  if (props.collectionsType.type === "my-collections") {
    collectionJson.value = JSON.stringify(myCollections.value, null, 2)
  } else {
    collectionJson.value = await teamUtils.exportAsJSON(
      apolloClient,
      props.collectionsType.selectedTeam.id
    )
  }
  return collectionJson.value
}

const createCollectionGist = async () => {
  if (!currentUser.value) {
    toast.error(t("profile.no_permission").toString())

    return
  }

  getJSONCollection()

  try {
    const res = await axios.$post(
      "https://api.github.com/gists",
      {
        files: {
          "hoppscotch-collections.json": {
            content: collectionJson.value,
          },
        },
      },
      {
        headers: {
          Authorization: `token ${currentUser.value.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    )

    toast.success(t("export.gist_created").toString())
    window.open(res.html_url)
  } catch (e) {
    toast.error(t("error.something_went_wrong").toString())
    console.error(e)
  }
}

const fileImported = () => {
  toast.success(t("state.file_imported").toString())
  hideModal()
}

const failedImport = () => {
  toast.error(t("import.failed").toString())
}

const readCollectionGist = async () => {
  const gist = prompt(t("import.gist_url").toString())
  if (!gist) return

  try {
    const { files } = (await axios.$get(
      `https://api.github.com/gists/${gist.split("/").pop()}`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    )) as {
      files: {
        [fileName: string]: {
          content: any
        }
      }
    }

    const collections = JSON.parse(Object.values(files)[0].content)
    setRESTCollections(collections)
    fileImported()
  } catch (e) {
    failedImport()
    console.error(e)
  }
}

const hideModal = () => {
  mode.value = "import_export"
  mySelectedCollectionID.value = undefined
  emit("hide-modal")
}

// const openDialogChooseFileToReplaceWith = () => {
//   if (inputChooseFileToReplaceWith.value)
//     inputChooseFileToReplaceWith.value.click()
// }

const openDialogChooseFileToImportFrom = () => {
  if (inputChooseFileToImportFrom.value)
    inputChooseFileToImportFrom.value.click()
}

const hasFolder = (item: { item?: any }) => {
  return Object.prototype.hasOwnProperty.call(item, "item")
}

// TODO: I don't even know what is going on here :/
type PostmanCollection = {
  info?: {
    name: string
  }
  name: string
  item: {
    name: string
    request: any
    item?: any
  }[]
  folders?: any
}

const parsePostmanCollection = ({ info, name, item }: PostmanCollection) => {
  const hoppscotchCollection: Collection<HoppRESTRequest> = makeCollection({
    name: "",
    folders: [],
    requests: [],
  })

  hoppscotchCollection.name = info ? info.name : name

  if (item && item.length > 0) {
    for (const collectionItem of item) {
      if (collectionItem.request) {
        if (
          Object.prototype.hasOwnProperty.call(hoppscotchCollection, "folders")
        ) {
          hoppscotchCollection.name = info ? info.name : name
          hoppscotchCollection.requests.push(
            parsePostmanRequest(collectionItem)
          )
        } else {
          hoppscotchCollection.name = name || ""
          hoppscotchCollection.requests.push(
            parsePostmanRequest(collectionItem)
          )
        }
      } else if (hasFolder(collectionItem)) {
        hoppscotchCollection.folders.push(
          parsePostmanCollection(collectionItem as any)
        )
      } else {
        hoppscotchCollection.requests.push(parsePostmanRequest(collectionItem))
      }
    }
  }
  return hoppscotchCollection
}

// TODO: Rewrite
const parsePostmanRequest = ({
  name,
  request,
}: {
  name: string
  request: any
}) => {
  const pwRequest = {
    url: "",
    path: "",
    method: "",
    auth: "",
    httpUser: "",
    httpPassword: "",
    passwordFieldType: "password",
    bearerToken: "",
    headers: [] as { name?: string; type?: string }[],
    params: [] as { disabled?: boolean }[],
    bodyParams: [] as { type?: string }[],
    body: {
      body: "",
      contentType: "application/json",
    },
    rawParams: "",
    rawInput: false,
    contentType: "",
    requestType: "",
    name: "",
  }

  pwRequest.name = name
  if (request.url) {
    const requestObjectUrl = request.url.raw.match(
      /^(.+:\/\/[^/]+|{[^/]+})(\/[^?]+|).*$/
    )
    if (requestObjectUrl) {
      pwRequest.url = requestObjectUrl[1]
      pwRequest.path = requestObjectUrl[2] ? requestObjectUrl[2] : ""
    } else {
      pwRequest.url = request.url.raw
    }
  }

  pwRequest.method = request.method
  const itemAuth = request.auth ? request.auth : ""
  const authType = itemAuth ? itemAuth.type : ""

  try {
    if (authType === "basic") {
      pwRequest.auth = "Basic Auth"
      pwRequest.httpUser =
        itemAuth.basic[0].key === "username"
          ? itemAuth.basic[0].value
          : itemAuth.basic[1].value
      pwRequest.httpPassword =
        itemAuth.basic[0].key === "password"
          ? itemAuth.basic[0].value
          : itemAuth.basic[1].value
    } else if (authType === "oauth2") {
      pwRequest.auth = "OAuth 2.0"
      pwRequest.bearerToken =
        itemAuth.oauth2[0].key === "accessToken"
          ? itemAuth.oauth2[0].value
          : itemAuth.oauth2[1].value
    } else if (authType === "bearer") {
      pwRequest.auth = "Bearer Token"
      pwRequest.bearerToken = itemAuth.bearer[0].value
    }
  } catch (error) {
    console.error(error)
  }

  const requestObjectHeaders = request.header
  if (requestObjectHeaders) {
    pwRequest.headers = requestObjectHeaders
    for (const header of pwRequest.headers) {
      delete header.name
      delete header.type
    }
  }
  if (request.url) {
    const requestObjectParams = request.url.query
    if (requestObjectParams) {
      pwRequest.params = requestObjectParams
      for (const param of pwRequest.params) {
        delete param.disabled
      }
    }
  }
  if (request.body) {
    if (request.body.mode === "urlencoded") {
      const params = request.body.urlencoded
      pwRequest.bodyParams = params || []
      for (const param of pwRequest.bodyParams) {
        delete param.type
      }
    } else if (request.body.mode === "raw") {
      pwRequest.rawInput = true
      pwRequest.rawParams = request.body.raw
      try {
        const body = JSON.parse(request.body.raw)
        pwRequest.body.body = JSON.stringify(body, null, 2)
      } catch (error) {
        console.error(error)
      }
    }
  }
  return translateToNewRequest(pwRequest)
}

const replaceWithJSON = () => {
  if (!inputChooseFileToReplaceWith.value) return

  if (
    !inputChooseFileToReplaceWith.value.files ||
    inputChooseFileToReplaceWith.value.files.length === 0
  ) {
    toast.show(t("action.choose_file").toString())
    return
  }

  const reader = new FileReader()

  reader.onload = ({ target }) => {
    const content = target!.result as string | null

    if (!content) {
      toast.show(t("action.choose_file").toString())
      return
    }

    let collections = JSON.parse(content)

    // TODO: File validation
    if (collections[0]) {
      const [name, folders, requests] = Object.keys(collections[0])
      if (name === "name" && folders === "folders" && requests === "requests") {
        // Do nothing
      }
    } else if (collections.info && collections.info.schema.includes("v2.1.0")) {
      collections = [parsePostmanCollection(collections)]
    } else {
      failedImport()
    }
    if (props.collectionsType.type === "team-collections") {
      teamUtils
        .replaceWithJSON(
          apolloClient,
          collections,
          props.collectionsType.selectedTeam.id
        )
        .then((status) => {
          if (status) {
            fileImported()
          } else {
            failedImport()
          }
        })
        .catch((e) => {
          console.error(e)
          failedImport()
        })
    } else {
      setRESTCollections(collections)
      fileImported()
    }
  }

  reader.readAsText(inputChooseFileToReplaceWith.value.files[0])
  inputChooseFileToReplaceWith.value.value = ""
}

const isInsomniaCollection = (collection: any) => {
  if (typeof collection === "object") {
    return (
      Object.prototype.hasOwnProperty.call(collection, "__export_source") &&
      collection.__export_source.includes("insomnia")
    )
  }
  return false
}

const importFromJSON = () => {
  if (!inputChooseFileToImportFrom.value) return

  if (
    !inputChooseFileToImportFrom.value.files ||
    inputChooseFileToImportFrom.value.files.length === 0
  ) {
    toast.show(t("action.choose_file").toString())
    return
  }

  const reader = new FileReader()

  reader.onload = async ({ target }) => {
    let content = target!.result as string | null

    if (!content) {
      toast.show(t("action.choose_file").toString())
      return
    }

    let collections = JSON.parse(content)
    await importerAction(content)

    if (isInsomniaCollection(collections)) {
      collections = parseInsomniaCollection(content)
      content = JSON.stringify(collections)
    }
    if (collections[0]) {
      const [name, folders, requests] = Object.keys(collections[0])
      if (name === "name" && folders === "folders" && requests === "requests") {
        // Do nothing
      }
    } else if (collections.info && collections.info.schema.includes("v2.1.0")) {
      // replace the variables, postman uses {{var}}, Hoppscotch uses <<var>>
      collections = JSON.parse(content.replaceAll(/{{([a-z]+)}}/gi, "<<$1>>"))
      collections = [parsePostmanCollection(collections)]
    } else {
      failedImport()
      return
    }
    if (props.collectionsType.type === "team-collections") {
      teamUtils
        .importFromJSON(
          apolloClient,
          collections,
          props.collectionsType.selectedTeam.id
        )
        .then((status) => {
          if (status) {
            emit("update-team-collections")
            fileImported()
          } else {
            failedImport()
          }
        })
        .catch((e) => {
          console.error(e)
          failedImport()
        })
    } else {
      appendRESTCollections(collections)
      fileImported()
    }
  }
  reader.readAsText(inputChooseFileToImportFrom.value.files[0])
  inputChooseFileToImportFrom.value.value = ""
}

const importFromMyCollections = () => {
  if (props.collectionsType.type !== "team-collections") return

  teamUtils
    .importFromMyCollections(
      apolloClient,
      mySelectedCollectionID.value,
      props.collectionsType.selectedTeam.id
    )
    .then((success) => {
      if (success) {
        fileImported()
        emit("update-team-collections")
      } else {
        failedImport()
      }
    })
    .catch((e) => {
      console.error(e)
      failedImport()
    })
}

const exportJSON = () => {
  getJSONCollection()

  const dataToWrite = collectionJson.value
  const file = new Blob([dataToWrite], { type: "application/json" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url

  // TODO: get uri from meta
  a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}.json`
  document.body.appendChild(a)
  a.click()
  toast.success(t("state.download_started").toString())
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

const importerType = ref(0)
const importer = RESTCollectionImporters[importerType.value]
const importerSteps = importer.steps

const importerAction = async (content: string) => {
  const result = await importer.importer([content])()
  if (E.isLeft(result)) {
    console.log("error", result.left)
  } else if (E.isRight(result)) {
    console.log("success", result)
  }
}
</script>
