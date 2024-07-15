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
import { Environment, NonSecretEnvironment } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import { computed, ref } from "vue"

import { ImporterOrExporter } from "~/components/importExport/types"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { hoppEnvImporter } from "~/helpers/import-export/import/hoppEnv"
import { FileSource } from "~/helpers/import-export/import/import-sources/FileSource"
import { GistSource } from "~/helpers/import-export/import/import-sources/GistSource"

import { addGlobalEnvVariable } from "~/newstore/environments"

import { GQLError } from "~/helpers/backend/GQLClient"
import { CreateTeamEnvironmentMutation } from "~/helpers/backend/graphql"
import { createTeamEnvironment } from "~/helpers/backend/mutations/TeamEnvironment"
import { insomniaEnvImporter } from "~/helpers/import-export/import/insomniaEnv"
import { postmanEnvImporter } from "~/helpers/import-export/import/postmanEnv"
import { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"

import { useReadonlyStream } from "~/composables/stream"
import { gistExporter } from "~/helpers/import-export/export/gist"
import { platform } from "~/platform"
import { NewWorkspaceService } from "~/services/new-workspace"
import IconInsomnia from "~icons/hopp/insomnia"
import IconPostman from "~icons/hopp/postman"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconUser from "~icons/lucide/user"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  teamEnvironments?: TeamEnvironment[]
  teamId?: string | undefined
  environmentType: "MY_ENV" | "TEAM_ENV"
}>()

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const workspaceService = useService(NewWorkspaceService)

const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle

const isEnvironmentGistExportInProgress = ref(false)

const isTeamEnvironment = computed(() => {
  return props.environmentType === "TEAM_ENV"
})

const getActiveWorkspaceEnvironment = async () => {
  // TODO: Remove once the team workspace changes are in place
  if (
    props.environmentType === "TEAM_ENV" &&
    props.teamEnvironments !== undefined
  ) {
    const teamEnvironments = props.teamEnvironments.map(
      (x) => x.environment as Environment
    )
    return teamEnvironments
  }

  const environmentsViewResult = await workspaceService.getRESTEnvironmentsView(
    activeWorkspaceHandle.value!
  )

  if (E.isLeft(environmentsViewResult)) {
    return []
  }

  const environmentsViewHandle = environmentsViewResult.right
  const environmentsViewHandleRef = environmentsViewHandle.get()

  if (environmentsViewHandleRef.value.type === "invalid") {
    return []
  }

  const { environments } = environmentsViewHandleRef.value.data
  return environments.value
}

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
        showImportFailedError()
        return
      }

      handleImportToStore(res.right)

      platform.analytics?.logEvent({
        type: "HOPP_IMPORT_ENVIRONMENT",
        platform: "rest",
        workspaceType: isTeamEnvironment.value ? "team" : "personal",
      })

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
        showImportFailedError()
        return
      }

      handleImportToStore(res.right)

      platform.analytics?.logEvent({
        type: "HOPP_IMPORT_ENVIRONMENT",
        platform: "rest",
        workspaceType: isTeamEnvironment.value ? "team" : "personal",
      })

      emit("hide-modal")
    },
  }),
}

const insomniaEnvironmentsImport: ImporterOrExporter = {
  metadata: {
    id: "import.from_insomnia",
    name: "import.from_insomnia",
    icon: IconInsomnia,
    title: "import.from_json",
    applicableTo: ["personal-workspace", "team-workspace"],
    disabled: false,
  },
  component: FileSource({
    acceptedFileTypes: "application/json",
    caption: "import.insomnia_environment_description",
    onImportFromFile: async (environments) => {
      const res = await insomniaEnvImporter(environments)()

      if (E.isLeft(res)) {
        showImportFailedError()
        return
      }

      const globalEnvs = res.right.filter(
        (env) => env.name === "Base Environment"
      )
      const otherEnvs = res.right.filter(
        (env) => env.name !== "Base Environment"
      )

      handleImportToStore(otherEnvs, globalEnvs)

      platform.analytics?.logEvent({
        type: "HOPP_IMPORT_ENVIRONMENT",
        platform: "rest",
        workspaceType: isTeamEnvironment.value ? "team" : "personal",
      })

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
      if (E.isLeft(environments)) {
        showImportFailedError()
        return
      }

      const res = await hoppEnvImporter(environments.right)()

      if (E.isLeft(res)) {
        showImportFailedError()
        return
      }

      handleImportToStore(res.right)
      platform.analytics?.logEvent({
        type: "HOPP_IMPORT_ENVIRONMENT",
        platform: "rest",
        workspaceType: isTeamEnvironment.value ? "team" : "personal",
      })
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
    if (!activeWorkspaceHandle.value) {
      return toast.error("error.something_went_wrong")
    }

    const result = await workspaceService.exportRESTEnvironments(
      activeWorkspaceHandle.value
    )

    // INVALID_COLLECTION_HANDLE | NO_ENVIRONMENTS_TO_EXPORT
    if (E.isLeft(result)) {
      if (result.left.error === "NO_ENVIRONMENTS_TO_EXPORT") {
        return toast.error(t("no_environments_to_export"))
      }

      return toast.error(t("export.failed"))
    }

    toast.success(t("state.download_started"))
  },
}

const HoppEnvironmentsGistExporter: ImporterOrExporter = {
  metadata: {
    id: "export.as_gist",
    name: "export.create_secret_gist",
    title:
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      currentUser?.value?.provider === "github.com"
        ? "export.create_secret_gist_tooltip_text"
        : "export.require_github",
    icon: IconUser,
    disabled: !currentUser.value
      ? true
      : currentUser.value?.provider !== "github.com",
    applicableTo: ["personal-workspace", "team-workspace"],
    isLoading: isEnvironmentGistExportInProgress,
  },
  action: async () => {
    const environments = await getActiveWorkspaceEnvironment()

    if (!environments.length) {
      return toast.error(t("error.no_environments_to_export"))
    }

    if (!currentUser.value) {
      toast.error(t("profile.no_permission"))
      return
    }

    isEnvironmentGistExportInProgress.value = true

    const accessToken = currentUser.value?.accessToken

    if (accessToken) {
      const res = await gistExporter(
        JSON.stringify(environments),
        accessToken,
        "hoppscotch-environment.json"
      )

      if (E.isLeft(res)) {
        toast.error(t("export.failed"))
        isEnvironmentGistExportInProgress.value = false
        return
      }

      toast.success(t("export.secret_gist_success"))

      platform.analytics?.logEvent({
        type: "HOPP_EXPORT_ENVIRONMENT",
        platform: "rest",
      })

      platform.io.openExternalLink(res.right)
    }

    isEnvironmentGistExportInProgress.value = false
  },
}

const importerModules = [
  HoppEnvironmentsImport,
  EnvironmentsImportFromGIST,
  PostmanEnvironmentsImport,
  insomniaEnvironmentsImport,
]

const exporterModules = computed(() => {
  const enabledExporters = [HoppEnvironmentsExport]

  if (platform.platformFeatureFlags.exportAsGIST) {
    enabledExporters.push(HoppEnvironmentsGistExporter)
  }

  return enabledExporters
})

const showImportFailedError = () => {
  toast.error(t("import.failed").toString())
}

const handleImportToStore = async (
  environments: Environment[],
  globalEnvs: NonSecretEnvironment[] = []
) => {
  // Add global envs to the store
  globalEnvs.forEach(({ variables }) => {
    variables.forEach(({ key, value, secret }) => {
      addGlobalEnvVariable({ key, value, secret })
    })
  })

  // TODO: Remove the check once the team workspace changes are in place
  if (props.environmentType === "MY_ENV") {
    if (!activeWorkspaceHandle.value) {
      return E.left("INVALID_WORKSPACE_HANDLE")
    }

    const collectionHandleResult =
      await workspaceService.importRESTEnvironments(
        activeWorkspaceHandle.value,
        environments
      )

    if (E.isLeft(collectionHandleResult)) {
      // INVALID_WORKSPACE_HANDLE
      return toast.error(t("import.failed"))
    }

    toast.success(t("state.file_imported"))
    return
  }

  // TODO: Remove once the team workspace changes are in place
  await importToTeams(environments)
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
