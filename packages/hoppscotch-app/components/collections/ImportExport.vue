<template>
  <SmartModal
    v-if="show"
    :title="`${t('modal.collections')}`"
    max-width="sm:max-w-md"
    dialog
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
    </template>
    <template #body>
      <div v-if="importerType !== null" class="flex flex-col">
        <div class="flex flex-col px-2 pb-6">
          <div
            v-for="(step, index) in importerSteps"
            :key="`step-${index}`"
            class="flex flex-col space-y-8"
          >
            <div v-if="step.name === 'FILE_IMPORT'" class="space-y-4">
              <p class="flex items-center">
                <span
                  class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
                  :class="{
                    '!text-green-500': hasFile,
                  }"
                >
                  <i class="material-icons">check_circle</i>
                </span>
                <span>
                  {{ t(`${step.metadata.caption}`) }}
                </span>
              </p>
              <p class="flex flex-col ml-10">
                <input
                  id="inputChooseFileToImportFrom"
                  ref="inputChooseFileToImportFrom"
                  name="inputChooseFileToImportFrom"
                  type="file"
                  class="cursor-pointer transition file:transition file:cursor-pointer text-secondary hover:text-secondaryDark file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-secondary hover:file:text-secondaryDark file:bg-primaryLight hover:file:bg-primaryDark"
                  :accept="step.metadata.acceptedFileTypes"
                  @change="onFileChange"
                />
              </p>
            </div>
            <div v-else-if="step.name === 'URL_IMPORT'" class="space-y-4">
              <p class="flex items-center">
                <span
                  class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
                  :class="{
                    '!text-green-500': hasGist,
                  }"
                >
                  <i class="material-icons">check_circle</i>
                </span>
                <span>
                  {{ t(`${step.metadata.caption}`) }}
                </span>
              </p>
              <p class="flex flex-col ml-10">
                <input
                  v-model="inputChooseGistToImportFrom"
                  type="url"
                  class="input"
                  :placeholder="`${$t('import.gist_url')}`"
                />
              </p>
            </div>
            <div
              v-else-if="step.name === 'TARGET_MY_COLLECTION'"
              class="flex flex-col px-2"
            >
              <div class="select-wrapper">
                <select
                  v-model="mySelectedCollectionID"
                  type="text"
                  autocomplete="off"
                  class="select"
                  autofocus
                >
                  <option :key="undefined" :value="undefined" disabled selected>
                    {{ t("collection.select") }}
                  </option>
                  <option
                    v-for="(collection, collectionIndex) in myCollections"
                    :key="`collection-${collectionIndex}`"
                    :value="collectionIndex"
                  >
                    {{ collection.name }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <ButtonPrimary
          :label="t('import.title')"
          :disabled="enableImportButton"
          class="mx-2"
          :loading="importingMyCollections"
          @click.native="finishImport"
        />
      </div>
      <div v-else class="flex flex-col px-2">
        <SmartExpand>
          <template #body>
            <SmartItem
              v-for="(importer, index) in importerModules"
              :key="`importer-${index}`"
              :svg="importer.icon"
              :label="t(`${importer.name}`)"
              @click.native="importerType = index"
            />
          </template>
        </SmartExpand>
        <hr />
        <div class="flex flex-col space-y-2">
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
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import {
  useAxios,
  useI18n,
  useReadonlyStream,
  useToast,
} from "~/helpers/utils/composables"
import { currentUser$ } from "~/helpers/fb/auth"
import { appendRESTCollections, restCollections$ } from "~/newstore/collections"
import { RESTCollectionImporters } from "~/helpers/import-export/import/importers"
import { StepReturnValue } from "~/helpers/import-export/steps"
import { runGQLQuery, runMutation } from "~/helpers/backend/GQLClient"
import {
  ExportAsJsonDocument,
  ImportFromJsonDocument,
} from "~/helpers/backend/graphql"

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
const mySelectedCollectionID = ref<undefined | number>(undefined)
const collectionJson = ref("")
const inputChooseFileToImportFrom = ref<HTMLInputElement | any>()
const inputChooseGistToImportFrom = ref<string>("")

const getJSONCollection = async () => {
  if (props.collectionsType.type === "my-collections") {
    collectionJson.value = JSON.stringify(myCollections.value, null, 2)
  } else {
    collectionJson.value = pipe(
      await runGQLQuery({
        query: ExportAsJsonDocument,
        variables: {
          teamID: props.collectionsType.selectedTeam.id,
        },
      }),
      E.matchW(
        // TODO: Handle error case gracefully ?
        () => {
          throw new Error("Error exporting collection to JSON")
        },
        (x) => x.exportCollectionsToJSON
      )
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

const hideModal = () => {
  mode.value = "import_export"
  mySelectedCollectionID.value = undefined
  resetImport()
  emit("hide-modal")
}

const stepResults = ref<StepReturnValue[]>([])

watch(mySelectedCollectionID, (newValue) => {
  if (newValue === undefined) return
  stepResults.value = []
  stepResults.value.push(newValue)
})

const importingMyCollections = ref(false)

const importToTeams = async (content: HoppCollection<HoppRESTRequest>) => {
  importingMyCollections.value = true
  if (props.collectionsType.type !== "team-collections") return

  const result = await runMutation(ImportFromJsonDocument, {
    jsonString: JSON.stringify(content),
    teamID: props.collectionsType.selectedTeam.id,
  })()

  if (E.isLeft(result)) {
    console.error(result.left)
  } else {
    emit("update-team-collections")
  }

  importingMyCollections.value = false
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

const importerModules = computed(() =>
  RESTCollectionImporters.filter(
    (i) => i.applicableTo?.includes(props.collectionsType.type) ?? true
  )
)

const importerType = ref<number | null>(null)

const importerModule = computed(() =>
  importerType.value !== null ? importerModules.value[importerType.value] : null
)

const importerSteps = computed(() => importerModule.value?.steps ?? null)

const finishImport = async () => {
  await importerAction(stepResults.value)
}

const importerAction = async (stepResults: any[]) => {
  if (!importerModule.value) return
  const result = await importerModule.value?.importer(stepResults as any)()
  if (E.isLeft(result)) {
    failedImport()
    console.error("error", result.left)
  } else if (E.isRight(result)) {
    if (props.collectionsType.type === "team-collections") {
      importToTeams(result.right)
      fileImported()
    } else {
      appendRESTCollections(result.right)
      fileImported()
    }
  }
}

const hasFile = ref(false)
const hasGist = ref(false)

watch(inputChooseGistToImportFrom, (v) => {
  stepResults.value = []
  if (v === "") {
    hasGist.value = false
  } else {
    hasGist.value = true
    stepResults.value.push(inputChooseGistToImportFrom.value)
  }
})

const onFileChange = () => {
  stepResults.value = []
  if (!inputChooseFileToImportFrom.value[0]) {
    hasFile.value = false
    return
  }

  if (
    !inputChooseFileToImportFrom.value[0].files ||
    inputChooseFileToImportFrom.value[0].files.length === 0
  ) {
    inputChooseFileToImportFrom.value[0].value = ""
    hasFile.value = false
    toast.show(t("action.choose_file").toString())
    return
  }

  const reader = new FileReader()
  reader.onload = ({ target }) => {
    const content = target!.result as string | null
    if (!content) {
      hasFile.value = false
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
  importerType.value = null
  stepResults.value = []
  inputChooseFileToImportFrom.value = ""
  hasFile.value = false
  inputChooseGistToImportFrom.value = ""
  hasGist.value = false
  mySelectedCollectionID.value = undefined
}
</script>
