<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('modal.collections')"
    styles="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <ButtonSecondary
        v-if="importerType !== null"
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.go_back')"
        :icon="IconArrowLeft"
        @click="resetImport"
      />
    </template>
    <template #body>
      <div v-if="importerType !== null" class="flex flex-col">
        <div class="flex flex-col pb-4">
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
                  <icon-lucide-check-circle class="svg-icons" />
                </span>
                <span>
                  {{ t(`${step.metadata.caption}`) }}
                </span>
              </p>
              <p
                class="flex flex-col ml-10 border border-dashed rounded border-dividerDark"
              >
                <input
                  id="inputChooseFileToImportFrom"
                  ref="inputChooseFileToImportFrom"
                  name="inputChooseFileToImportFrom"
                  type="file"
                  class="p-4 cursor-pointer transition file:transition file:cursor-pointer text-secondary hover:text-secondaryDark file:mr-2 file:py-2 file:px-4 file:rounded file:border-0 file:text-secondary hover:file:text-secondaryDark file:bg-primaryLight hover:file:bg-primaryDark"
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
                  <icon-lucide-check-circle class="svg-icons" />
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
                  :placeholder="`${t('import.gist_url')}`"
                />
              </p>
            </div>
            <div
              v-else-if="step.name === 'TARGET_MY_COLLECTION'"
              class="flex flex-col"
            >
              <div class="select-wrapper">
                <select
                  v-model="mySelectedCollectionID"
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
                    class="bg-primary"
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
          :loading="importingMyCollections"
          @click="finishImport"
        />
      </div>
      <div v-else class="flex flex-col">
        <SmartExpand>
          <template #body>
            <SmartItem
              v-for="(importer, index) in importerModules"
              :key="`importer-${index}`"
              :icon="importer.icon"
              :label="t(`${importer.name}`)"
              @click="importerType = index"
            />
          </template>
        </SmartExpand>
        <hr />
        <div class="flex flex-col space-y-2">
          <SmartItem
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :icon="IconDownload"
            :loading="exportingTeamCollections"
            :label="t('export.as_json')"
            @click="emit('export-json-collection')"
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
              :icon="IconGithub"
              :loading="creatingGistCollection"
              :label="t('export.create_secret_gist')"
              @click="emit('create-collection-gist')"
            />
          </span>
        </div>
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import IconArrowLeft from "~icons/lucide/arrow-left"
import IconDownload from "~icons/lucide/download"
import IconGithub from "~icons/lucide/github"
import { computed, PropType, ref, watch } from "vue"
import { pipe } from "fp-ts/function"
import * as E from "fp-ts/Either"
import { HoppRESTRequest, HoppCollection } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { currentUser$ } from "~/helpers/fb/auth"
import { appendRESTCollections, restCollections$ } from "~/newstore/collections"
import { RESTCollectionImporters } from "~/helpers/import-export/import/importers"
import { StepReturnValue } from "~/helpers/import-export/steps"

const toast = useToast()
const t = useI18n()

type CollectionType = "team-collections" | "my-collections"

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
    required: true,
  },
  collectionsType: {
    type: String as PropType<CollectionType>,
    default: "my-collections",
    required: true,
  },
  exportingTeamCollections: {
    type: Boolean,
    default: false,
    required: false,
  },
  creatingGistCollection: {
    type: Boolean,
    default: false,
    required: false,
  },
  importingMyCollections: {
    type: Boolean,
    default: false,
    required: false,
  },
})

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "update-team-collections"): void
  (e: "export-json-collection"): void
  (e: "create-collection-gist"): void
  (e: "import-to-teams", payload: HoppCollection<HoppRESTRequest>[]): void
}>()

const hasFile = ref(false)
const hasGist = ref(false)

const importerType = ref<number | null>(null)

const stepResults = ref<StepReturnValue[]>([])

const inputChooseFileToImportFrom = ref<HTMLInputElement | any>()
const mySelectedCollectionID = ref<number | undefined>(undefined)
const inputChooseGistToImportFrom = ref<string>("")

const importerModules = computed(() =>
  RESTCollectionImporters.filter(
    (i) => i.applicableTo?.includes(props.collectionsType) ?? true
  )
)

const importerModule = computed(() => {
  if (importerType.value === null) return null
  return importerModules.value[importerType.value]
})

const importerSteps = computed(() => importerModule.value?.steps ?? null)

const enableImportButton = computed(
  () => !(stepResults.value.length === importerSteps.value?.length)
)

watch(mySelectedCollectionID, (newValue) => {
  if (newValue === undefined) return
  stepResults.value = []
  stepResults.value.push(newValue)
})

watch(inputChooseGistToImportFrom, (url) => {
  stepResults.value = []
  if (url === "") {
    hasGist.value = false
  } else {
    hasGist.value = true
    stepResults.value.push(inputChooseGistToImportFrom.value)
  }
})

const myCollections = useReadonlyStream(restCollections$, [])
const currentUser = useReadonlyStream(currentUser$, null)

const importerAction = async (stepResults: StepReturnValue[]) => {
  if (!importerModule.value) return

  pipe(
    await importerModule.value.importer(stepResults as any)(),
    E.match(
      (err) => {
        failedImport()
        console.error("error", err)
      },
      (result) => {
        if (props.collectionsType === "team-collections") {
          emit("import-to-teams", result)
        } else {
          appendRESTCollections(result)
          fileImported()
        }
      }
    )
  )
}

const finishImport = async () => {
  await importerAction(stepResults.value)
}

const onFileChange = () => {
  stepResults.value = []

  const inputFileToImport = inputChooseFileToImportFrom.value[0]

  if (!inputFileToImport) {
    hasFile.value = false
    return
  }

  if (!inputFileToImport.files || inputFileToImport.files.length === 0) {
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

  reader.readAsText(inputFileToImport.files[0])
}

const fileImported = () => {
  toast.success(t("state.file_imported").toString())
  hideModal()
}
const failedImport = () => {
  toast.error(t("import.failed").toString())
}
const hideModal = () => {
  resetImport()
  emit("hide-modal")
}

const resetImport = () => {
  importerType.value = null
  hasFile.value = false
  hasGist.value = false
  stepResults.value = []
  inputChooseFileToImportFrom.value = ""
  inputChooseGistToImportFrom.value = ""
  mySelectedCollectionID.value = undefined
}
</script>
