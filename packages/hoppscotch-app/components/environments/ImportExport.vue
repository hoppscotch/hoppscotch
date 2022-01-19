<template>
  <SmartModal
    v-if="show"
    :title="`${t('environment.title')}`"
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
                readEnvironmentGist()
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
                  createEnvironmentGist()
                  options.tippy().hide()
                }
              "
            />
          </span>
        </tippy>
      </span>
    </template>
    <template #body>
      <div class="flex flex-col px-2 space-y-2">
        <SmartItem
          svg="folder-plus"
          :label="t('import.from_json')"
          @click.native="openDialogChooseFileToImportFrom"
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
  environments$,
  replaceEnvironments,
  appendEnvironments,
  Environment,
} from "~/newstore/environments"

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const axios = useAxios()
const toast = useToast()
const t = useI18n()
const environments = useReadonlyStream(environments$, [])
const currentUser = useReadonlyStream(currentUser$, null)

// Template refs
const options = ref<any>()
const inputChooseFileToImportFrom = ref<HTMLInputElement>()

const environmentJson = computed(() => {
  return JSON.stringify(environments.value, null, 2)
})

const createEnvironmentGist = async () => {
  if (!currentUser.value) {
    toast.error(t("profile.no_permission").toString())

    return
  }

  try {
    const res = await axios.$post(
      "https://api.github.com/gists",
      {
        files: {
          "hoppscotch-environments.json": {
            content: environmentJson.value,
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

const readEnvironmentGist = async () => {
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
    const environments = JSON.parse(Object.values(files)[0].content)
    replaceEnvironments(environments)
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

    const environments = JSON.parse(content)
    if (
      environments._postman_variable_scope === "environment" ||
      environments._postman_variable_scope === "globals"
    ) {
      importFromPostman(environments)
    } else if (environments[0]) {
      const [name, variables] = Object.keys(environments[0])
      if (name === "name" && variables === "variables") {
        // Do nothing
      }
      importFromHoppscotch(environments)
    } else {
      failedImport()
    }
  }

  reader.readAsText(inputChooseFileToImportFrom.value.files[0])
  inputChooseFileToImportFrom.value.value = ""
}

const importFromHoppscotch = (environments: Environment[]) => {
  appendEnvironments(environments)
  fileImported()
}

const importFromPostman = ({
  name,
  values,
}: {
  name: string
  values: { key: string; value: string }[]
}) => {
  const environment: Environment = { name, variables: [] }
  values.forEach(({ key, value }) => environment.variables.push({ key, value }))
  const environments = [environment]
  importFromHoppscotch(environments)
}

const exportJSON = () => {
  const dataToWrite = environmentJson.value
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
