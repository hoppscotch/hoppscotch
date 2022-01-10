<template>
  <SmartModal
    v-if="show"
    :title="`${t('modal.import_export')} ${t('modal.collections')}`"
    max-width="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <ButtonSecondary
        v-if="importerType !== null"
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.go_back')"
        svg="arrow-left"
        @click.native="resetImport"
      />
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
      <div v-if="importerType !== null" class="relative flex flex-col px-2">
        <div
          class="absolute top-0 w-0.5 bg-primaryDark left-5 -z-1 bottom-1"
        ></div>
        <div
          v-for="(step, index) in importerSteps"
          :key="`step-${index}`"
          class="flex flex-col space-y-8"
        >
          <div v-if="step.name === 'FILE_OR_URL_IMPORT'" class="space-y-4">
            <p class="flex items-center">
              <span
                class="inline-flex items-center justify-center flex-shrink-0 mr-4 rounded-full border-5 border-primary text-secondaryLight"
                :class="{
                  'text-green-500': hasFile,
                }"
              >
                <i class="material-icons">check_circle</i>
              </span>
              <span>
                {{ t("import.json_description") }}
              </span>
            </p>
            <p class="flex flex-col ml-12">
              <input
                id="inputChooseFileToImportFrom"
                ref="inputChooseFileToImportFrom"
                name="inputChooseFileToImportFrom"
                type="file"
                class="transition cursor-pointer file:transition file:cursor-pointer text-secondaryLight hover:text-secondaryDark file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-secondary hover:file:text-secondaryDark file:bg-primaryLight hover:file:bg-primaryDark"
                :accept="step.metadata.acceptedFileTypes"
                @change="onFileChange"
              />
            </p>
          </div>
        </div>
        <ButtonPrimary
          :label="t('import.title')"
          class="mt-6"
          :disabled="enableImportButton"
          @click.native="finishImport"
        />
        {{ enableImportButton }}
      </div>
      <div v-else class="flex flex-col px-2">
        <SmartExpand>
          <template #body>
            <SmartItem
              v-for="(importer, index) in RESTCollectionImporters"
              :key="`importer-${index}`"
              :svg="importer.icon"
              :label="t(`${importer.name}`)"
              @click.native="importerType = index"
            />
            ---
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
          </template>
        </SmartExpand>
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
import { computed, ref } from "@nuxtjs/composition-api"
// import { HoppRESTRequest, translateToNewRequest } from "@hoppscotch/data"
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
// import { parseInsomniaCollection } from "~/helpers/utils/parseInsomniaCollection"
import {
  appendRESTCollections,
  restCollections$,
  setRESTCollections,
  // Collection,
  // makeCollection,
} from "~/newstore/collections"
import { RESTCollectionImporters } from "~/helpers/import-export/import/importers"

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

// Template refs
const mode = ref("import_export")
const mySelectedCollectionID = ref(undefined)
const collectionJson = ref("")
const inputChooseFileToImportFrom = ref<HTMLInputElement | any>()
// const fileName = ref<string>("")

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
  resetImport()
  emit("hide-modal")
}

const stepResults = ref<string[]>([])

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

const importerType = ref<number | null>(null)

const importerModule = computed(() =>
  importerType.value !== null
    ? RESTCollectionImporters[importerType.value]
    : null
)
const importerSteps = computed(() => importerModule.value?.steps ?? null)

const finishImport = async () => {
  await importerAction(stepResults.value)
    .then(() => {
      fileImported()
    })
    .catch(() => {
      failedImport()
    })
}

const importerAction = async (stepResults: any[]) => {
  if (!importerModule.value) return
  const result = await importerModule.value?.importer(stepResults as any)()
  if (E.isLeft(result)) {
    console.log("error", result.left)
    toast.error(t("error.something_went_wrong").toString())
  } else if (E.isRight(result)) {
    debugger
    appendRESTCollections(result.right)
    console.log("success", result)
  }
}

const hasFile = ref(false)

const onFileChange = () => {
  if (!inputChooseFileToImportFrom.value[0]) return

  if (
    !inputChooseFileToImportFrom.value[0].files ||
    inputChooseFileToImportFrom.value[0].files.length === 0
  ) {
    inputChooseFileToImportFrom.value[0].value = ""
    toast.show(t("action.choose_file").toString())
    return
  }

  console.log("filename", inputChooseFileToImportFrom.value[0].files[0].name)

  const reader = new FileReader()
  reader.onload = ({ target }) => {
    const content = target!.result as string | null
    if (!content) {
      toast.show(t("action.choose_file").toString())
      return
    }

    stepResults.value.push(content)
    hasFile.value = !!content?.length
  }
  reader.readAsText(inputChooseFileToImportFrom.value[0].files[0])
}

const enableImportButton = computed(
  () => !(stepResults.value.length === importerSteps.value?.length)
)

const resetImport = () => {
  stepResults.value = []
  hasFile.value = false
  importerType.value = null
}
</script>
