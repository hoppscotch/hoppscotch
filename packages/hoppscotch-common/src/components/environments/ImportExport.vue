<template>
  <ImportExportBase
    ref="collections-import-export"
    modal-title="environment.title"
    :importer-modules="importerModules"
    :exporter-modules="exporterModules"
    @hide-modal="emit('hide-modal')"
  />
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { Environment } from "@hoppscotch/data"
import { ImporterOrExporter } from "~/components/importExport/types"
import { FileSource } from "~/helpers/import-export/import/import-sources/FileSource"
import { GistSource } from "~/helpers/import-export/import/import-sources/GistSource"
import { hoppEnvImporter } from "~/helpers/import-export/import/hoppEnv"

import * as E from "fp-ts/Either"
import { appendEnvironments, environments$ } from "~/newstore/environments"

import { createTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import { GQLError } from "~/helpers/backend/GQLClient"
import { CreateTeamEnvironmentMutation } from "~/helpers/backend/graphql"
import { postmanEnvImporter } from "~/helpers/import-export/import/postmanEnv"

import IconFolderPlus from "~icons/lucide/folder-plus"
import IconPostman from "~icons/hopp/postman"
import IconUser from "~icons/lucide/user"
import { initializeDownloadCollection } from "~/helpers/import-export/export"
import { computed } from "vue"
import { useReadonlyStream } from "~/composables/stream"
import { environmentsExporter } from "~/helpers/import-export/export/environments"
import { environmentsGistExporter } from "~/helpers/import-export/export/environmentsGistExport"
import { platform } from "~/platform"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  teamEnvironments?: TeamEnvironment[]
  teamId?: string | undefined
  environmentType: "MY_ENV" | "TEAM_ENV"
}>()

const myEnvironments = useReadonlyStream(environments$, [])

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const environmentJson = computed(() => {
  if (
    props.environmentType === "TEAM_ENV" &&
    props.teamEnvironments !== undefined
  ) {
    const teamEnvironments = props.teamEnvironments.map(
      (x) => x.environment as Environment
    )
    return teamEnvironments
  }

  return myEnvironments.value
})

const HoppEnvironmentsImport: ImporterOrExporter = {
  metadata: {
    id: "import.from_json",
    name: "import.from_json",
    icon: IconFolderPlus,
    title: "import.from_json",
    applicableTo: ["personal-workspace", "team-workspace"],
    disabled: false,
  },
  component: FileSource({
    acceptedFileTypes: "application/json",
    caption: "import.hoppscotch_environment_description",
    onImportFromFile: async (environments) => {
      const res = await hoppEnvImporter(environments)()

      if (E.isLeft(res)) {
        failedImport()
        return
      }

      handleImportToStore(res.right)
      emit("hide-modal")
    },
  }),
}

const PostmanEnvironmentsImport: ImporterOrExporter = {
  metadata: {
    id: "import.from_postman",
    name: "import.from_postman",
    icon: IconPostman,
    title: "import.from_json",
    applicableTo: ["personal-workspace", "team-workspace"],
    disabled: false,
  },
  component: FileSource({
    acceptedFileTypes: "application/json",
    caption: "import.postman_environment_description",
    onImportFromFile: async (environments) => {
      const res = await postmanEnvImporter(environments)()

      if (E.isLeft(res)) {
        failedImport()
        return
      }

      handleImportToStore(res.right)

      emit("hide-modal")
    },
  }),
}

const EnvironmentsImportFromGIST: ImporterOrExporter = {
  metadata: {
    id: "import.environments_from_gist",
    name: "import.environments_from_gist",
    icon: IconFolderPlus,
    title: "import.environments_from_gist",
    applicableTo: ["personal-workspace", "team-workspace"],
    disabled: false,
  },
  component: GistSource({
    caption: "import.environments_from_gist_description",
    onImportFromGist: async (environments) => {
      const res = await hoppEnvImporter(environments)()

      if (E.isLeft(res)) {
        failedImport()
        return
      }

      handleImportToStore(res.right)
      emit("hide-modal")
    },
  }),
}

const HoppEnvironmentsExport: ImporterOrExporter = {
  metadata: {
    id: "export.as_json",
    name: "export.as_json",
    title: "action.download_file",
    icon: IconUser,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace"],
  },
  action: async () => {
    const message = initializeDownloadCollection(
      environmentsExporter(environmentJson.value),
      "Environments"
    )

    E.isRight(message)
      ? toast.success(t(message.right))
      : toast.error(t("export.failed"))
  },
}

const HoppEnvironmentsGistExporter: ImporterOrExporter = {
  metadata: {
    id: "export.as_gist",
    name: "export.create_secret_gist",
    title:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      currentUser && currentUser.provider === "github.com"
        ? "export.create_secret_gist"
        : "export.require_github",
    icon: IconUser,
    disabled: !currentUser.value
      ? true
      : currentUser.value.provider !== "github.com",
    applicableTo: ["personal-workspace", "team-workspace"],
  },
  action: async () => {
    if (!currentUser.value) {
      toast.error(t("profile.no_permission"))
      return
    }

    const accessToken = currentUser.value?.accessToken

    if (accessToken) {
      const res = await environmentsGistExporter(
        JSON.stringify(environmentJson.value),
        accessToken
      )

      if (E.isLeft(res)) {
        toast.error(t("export.failed"))
      } else {
        toast.success(t("export.success"))
        window.open(res.right, "_blank")
      }
    }
  },
}

const importerModules = [
  HoppEnvironmentsImport,
  EnvironmentsImportFromGIST,
  PostmanEnvironmentsImport,
]

const exporterModules = [HoppEnvironmentsExport, HoppEnvironmentsGistExporter]

const failedImport = () => {
  toast.error(t("import.failed").toString())
}

const handleImportToStore = async (environments: Environment[]) => {
  if (props.environmentType === "MY_ENV") {
    appendEnvironments(environments)
    toast.success(t("state.file_imported"))
  } else {
    await importToTeams(environments)
  }
}

const importToTeams = async (content: Environment[]) => {
  const envImportPromises: Promise<
    E.Either<GQLError<"">, CreateTeamEnvironmentMutation>
  >[] = []

  for (const [, env] of content.entries()) {
    const res = createTeamEnvironment(
      JSON.stringify(env.variables),
      props.teamId as string,
      env.name
    )()

    envImportPromises.push(res)
  }

  const res = await Promise.all(envImportPromises)

  const failedImports = res.some((r) => E.isLeft(r))

  if (failedImports) {
    toast.error(t("import.failed"))
  } else {
    toast.success(t("import.success"))
  }
}

const emit = defineEmits<{
  (e: "hide-modal"): () => void
}>()
</script>
