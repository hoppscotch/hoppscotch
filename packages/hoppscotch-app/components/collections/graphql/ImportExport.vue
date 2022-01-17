<template>
  <SmartModal
    v-if="show"
    :title="`${t('modal.collections')}`"
    max-width="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <span>
        <tippy ref="options" interactive trigger="click" theme="popover" arrow>
          <template #trigger>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.more')"
              svg="more-vertical"
            />
          </template>
          <SmartItem
            icon="assignment_returned"
            :label="t('import.from_gist')"
            @click.native="
              () => {
                readCollectionGist()
                options.tippy().hide()
              }
            "
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
          >
            <SmartItem
              :disabled="
                !currentUser
                  ? true
                  : currentUser.provider !== 'github.com'
                  ? true
                  : false
              "
              icon="assignment_turned_in"
              :label="t('export.create_secret_gist')"
              @click.native="
                () => {
                  createCollectionGist()
                  options.tippy().hide()
                }
              "
            />
          </span>
        </tippy>
      </span>
    </template>
    <template #body>
      <div class="flex flex-col space-y-2 px-2">
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.preserve_current')"
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
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.replace_current')"
          svg="file"
          :label="t('action.replace_json')"
          @click.native="openDialogChooseFileToReplaceWith"
        />
        <input
          ref="inputChooseFileToReplaceWith"
          class="input"
          type="file"
          accept="application/json"
          @change="replaceWithJSON"
        />
        <hr />
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          svg="download"
          :label="t('export.as_json')"
          @click.native="exportJSON"
        />
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { computed, ref } from "@nuxtjs/composition-api"
import { currentUser$ } from "~/helpers/fb/auth"
import {
  useAxios,
  useI18n,
  useReadonlyStream,
  useToast,
} from "~/helpers/utils/composables"
import {
  graphqlCollections$,
  setGraphqlCollections,
  appendGraphqlCollections,
} from "~/newstore/collections"

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const axios = useAxios()
const toast = useToast()
const t = useI18n()
const collections = useReadonlyStream(graphqlCollections$, [])
const currentUser = useReadonlyStream(currentUser$, null)

// Template refs
const options = ref<any>()
const inputChooseFileToReplaceWith = ref<HTMLInputElement>()
const inputChooseFileToImportFrom = ref<HTMLInputElement>()

const collectionJson = computed(() => {
  return JSON.stringify(collections.value, null, 2)
})

const createCollectionGist = async () => {
  if (!currentUser.value) {
    toast.error(t("profile.no_permission").toString())

    return
  }

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
    setGraphqlCollections(collections)
    fileImported()
  } catch (e) {
    failedImport()
    console.error(e)
  }
}

const hideModal = () => {
  emit("hide-modal")
}

const openDialogChooseFileToReplaceWith = () => {
  if (inputChooseFileToReplaceWith.value)
    inputChooseFileToReplaceWith.value.click()
}

const openDialogChooseFileToImportFrom = () => {
  if (inputChooseFileToImportFrom.value)
    inputChooseFileToImportFrom.value.click()
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

    const collections = JSON.parse(content)

    // TODO: File validation
    if (collections[0]) {
      const [name, folders, requests] = Object.keys(collections[0])
      if (name === "name" && folders === "folders" && requests === "requests") {
        // Do nothing
      }
    } else {
      failedImport()
    }
    setGraphqlCollections(collections)
    fileImported()
  }

  reader.readAsText(inputChooseFileToReplaceWith.value.files[0])
  inputChooseFileToReplaceWith.value.value = ""
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

  reader.onload = ({ target }) => {
    const content = target!.result as string | null

    if (!content) {
      toast.show(t("action.choose_file").toString())
      return
    }

    const collections = JSON.parse(content)
    if (collections[0]) {
      const [name, folders, requests] = Object.keys(collections[0])
      if (name === "name" && folders === "folders" && requests === "requests") {
        // Do nothing
      }
    } else {
      failedImport()
      return
    }
    appendGraphqlCollections(collections)
    fileImported()
  }
  reader.readAsText(inputChooseFileToImportFrom.value.files[0])
  inputChooseFileToImportFrom.value.value = ""
}

const exportJSON = () => {
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
</script>
