<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('environment.title')}`"
    styles="sm:max-w-md"
    @close="hideModal"
  >
    <template #actions>
      <span>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions!.focus()"
        >
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.more')"
            :icon="IconMoreVertical"
          />
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                :icon="IconGithub"
                :label="t('import.from_gist')"
                @click="
                  () => {
                    readEnvironmentGist()
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
                <HoppSmartItem
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
                      createEnvironmentGist()
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
      <div v-if="loading" class="flex flex-col items-center justify-center p-4">
        <HoppSmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div v-else class="flex flex-col space-y-2">
        <HoppSmartItem
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
        <HoppSmartItem
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :icon="IconDownload"
          :label="t('export.as_json')"
          @click="exportJSON"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconDownload from "~icons/lucide/download"
import IconGithub from "~icons/lucide/github"
import { computed, ref } from "vue"
import { Environment } from "@hoppscotch/data"
import { platform } from "~/platform"
import axios from "axios"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import {
  environments$,
  replaceEnvironments,
  appendEnvironments,
} from "~/newstore/environments"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { createTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { GQLError } from "~/helpers/backend/GQLClient"
import { TippyComponent } from "vue-tippy"

const props = defineProps<{
  show: boolean
  teamEnvironments?: TeamEnvironment[]
  teamId?: string | undefined
  environmentType: "MY_ENV" | "TEAM_ENV"
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const toast = useToast()
const t = useI18n()

const loading = ref(false)

const myEnvironments = useReadonlyStream(environments$, [])
const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

// Template refs
const tippyActions = ref<TippyComponent | null>(null)
const inputChooseFileToImportFrom = ref<HTMLInputElement>()

const environmentJson = computed(() => {
  if (
    props.environmentType === "TEAM_ENV" &&
    props.teamEnvironments !== undefined
  ) {
    const teamEnvironments = props.teamEnvironments.map(
      (x) => x.environment as Environment
    )
    return JSON.stringify(teamEnvironments, null, 2)
  } else {
    return JSON.stringify(myEnvironments.value, null, 2)
  }
})

const createEnvironmentGist = async () => {
  if (!currentUser.value) {
    toast.error(t("profile.no_permission").toString())

    return
  }

  try {
    const res = await axios.post(
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

const readEnvironmentGist = async () => {
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
    const environments = JSON.parse(Object.values(files)[0].content)

    if (props.environmentType === "MY_ENV") {
      replaceEnvironments(environments)
      fileImported()
    } else {
      importToTeams(environments)
    }
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

const importToTeams = async (content: Environment[]) => {
  loading.value = true
  for (const [i, env] of content.entries()) {
    if (i === content.length - 1) {
      await pipe(
        createTeamEnvironment(
          JSON.stringify(env.variables),
          props.teamId as string,
          env.name
        ),
        TE.match(
          (err: GQLError<string>) => {
            console.error(err)
            toast.error(`${getErrorMessage(err)}`)
          },
          () => {
            loading.value = false
            hideModal()
            fileImported()
          }
        )
      )()
    } else {
      await pipe(
        createTeamEnvironment(
          JSON.stringify(env.variables),
          props.teamId as string,
          env.name
        ),
        TE.match(
          (err: GQLError<string>) => {
            console.error(err)
            toast.error(`${getErrorMessage(err)}`)
          },
          () => {
            // wait for all the environments to be created then fire the toast
          }
        )
      )()
    }
  }
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
  if (props.environmentType === "MY_ENV") {
    appendEnvironments(environments)
    fileImported()
  } else {
    importToTeams(environments)
  }
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

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "team_environment/not_found":
        return t("team_environment.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}
</script>
