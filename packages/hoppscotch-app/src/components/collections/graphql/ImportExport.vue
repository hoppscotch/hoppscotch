<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${t('modal.collections')}`"
    max-width="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <span>
        <tippy interactive trigger="click" theme="popover">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.more')"
            :icon="IconMoreVertical"
            :on-shown="() => tippyActions.focus()"
          />
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <SmartItem
                :icon="IconGithub"
                :label="t('import.from_gist')"
                @click="
                  () => {
                    readCollectionGist()
                    hide()
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
                  :icon="IconGithub"
                  :label="t('export.create_secret_gist')"
                  @click="
                    () => {
                      createCollectionGist()
                      hide()
                    }
                  "
                />
              </span>
            </div>
          </template>
        </tippy>
      </span>
    </template>
    <template #body>
      <div class="flex flex-col space-y-2">
        <SmartItem
          :icon="IconFolderPlus"
          :label="t('import.from_json')"
          @click="openDialogChooseFileToImportFrom"
        />
        <input
          ref="inputChooseFileToImportFrom"
          class="input"
          type="file"
          accept="application/json"
          @change="importFromJSON"
        />
        <hr />
        <SmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :icon="IconDownload"
          :label="t('export.as_json')"
          @click="exportJSON"
        />
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import axios from "axios"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconDownload from "~icons/lucide/download"
import IconGithub from "~icons/lucide/github"
import { computed, ref } from "vue"
import { currentUser$ } from "~/helpers/fb/auth"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
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

const toast = useToast()
const t = useI18n()
const collections = useReadonlyStream(graphqlCollections$, [])
const currentUser = useReadonlyStream(currentUser$, null)

// Template refs
const tippyActions = ref<any | null>(null)
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
    const res = await axios.post(
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
    window.open(res.data.html_url)
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
    const { files } = (await axios.get(
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

const openDialogChooseFileToImportFrom = () => {
  if (inputChooseFileToImportFrom.value)
    inputChooseFileToImportFrom.value.click()
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
