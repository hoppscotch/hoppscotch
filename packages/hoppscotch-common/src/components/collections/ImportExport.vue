<template>
  <ImportExportBase
    ref="collections-import-export"
    modal-title="modal.collections"
    :importer-modules="importerModules"
    :exporter-modules="exporterModules"
    @hide-modal="emit('hide-modal')"
  />
</template>

<script setup lang="ts">
import * as E from "fp-ts/Either"
import { FileSource } from "~/helpers/import-export/import/import-sources/FileSource"
import { UrlSource } from "~/helpers/import-export/import/import-sources/UrlSource"

import IconFile from "~icons/lucide/file"

import {
  hoppRESTImporter,
  hoppInsomniaImporter,
  hoppPostmanImporter,
  toTeamsImporter,
  hoppOpenAPIImporter,
} from "~/helpers/import-export/import/importers"

import { defineStep } from "~/composables/step-components"
import { PropType, computed, ref } from "vue"

import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { HoppCollection } from "@hoppscotch/data"
import { HoppRESTRequest } from "@hoppscotch/data"
import { appendRESTCollections, restCollections$ } from "~/newstore/collections"
import MyCollectionImport from "~/components/importexport/ImportExportSteps/MyCollectionImport.vue"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"

import IconFolderPlus from "~icons/lucide/folder-plus"
import IconOpenAPI from "~icons/lucide/file"
import IconPostman from "~icons/hopp/postman"
import IconInsomnia from "~icons/hopp/insomnia"
import IconGithub from "~icons/lucide/github"

import IconUser from "~icons/lucide/user"
import { useReadonlyStream } from "~/composables/stream"

import { getTeamCollectionJSON } from "~/helpers/backend/helpers"

import { platform } from "~/platform"

import { initializeDownloadCollection } from "~/helpers/import-export/export"
import { collectionsGistExporter } from "~/helpers/import-export/export/gistExport"
import { myCollectionsExporter } from "~/helpers/import-export/export/myCollections"
import { teamCollectionsExporter } from "~/helpers/import-export/export/teamCollections"

import { GistSource } from "~/helpers/import-export/import/import-sources/GistSource"
import { ImporterOrExporter } from "~/components/importexport/types"

const t = useI18n()
const toast = useToast()

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: SelectedTeam
    }
  | { type: "my-collections" }

const props = defineProps({
  collectionsType: {
    type: Object as PropType<CollectionType>,
    default: () => ({
      type: "my-collections",
      selectedTeam: undefined,
    }),
    required: true,
  },
})

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const showImportFailedError = () => {
  toast.error(t("import.failed"))
}

const onSuccessfulImport = (collections: HoppCollection<HoppRESTRequest>[]) => {
  appendRESTCollections(collections)
  toast.success(t("import.success"))
}

const emit = defineEmits<{
  (e: "hide-modal"): () => void
}>()

const isHoppMyCollectionExporterInProgress = ref(false)
const isHoppTeamCollectionExporterInProgress = ref(false)
const isHoppGistCollectionExporterInProgress = ref(false)

const HoppRESTImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_rest",
    name: "import.from_json",
    title: "import.from_json_description",
    icon: IconFolderPlus,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace", "url-import"],
  },
  component: FileSource({
    caption: "import.from_file",
    acceptedFileTypes: ".json",
    onImportFromFile: async (content) => {
      const res = await hoppRESTImporter(content)()

      if (E.isRight(res)) {
        onSuccessfulImport(res.right)
      } else {
        showImportFailedError()
      }
    },
  }),
}

const HoppMyCollectionImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_my_collection",
    name: "import.from_my_collections",
    title: "import.from_my_collections_description",
    icon: IconUser,
    disabled: false,
    applicableTo: ["team-workspace"],
  },
  component: defineStep("my_collection_import", MyCollectionImport, () => ({
    async onImportFromMyCollection(content) {
      const { collectionsType } = props

      const isTeamCollection = collectionsType.type === "team-collections"

      const hasTeamWriteAccess = isTeamCollection
        ? collectionsType.selectedTeam?.myRole == "EDITOR" ||
          collectionsType.selectedTeam?.myRole == "OWNER"
        : false

      if (!hasTeamWriteAccess) {
        showImportFailedError()
        return
      }

      isTeamCollection &&
        collectionsType.selectedTeam?.id &&
        toTeamsImporter(content, collectionsType.selectedTeam?.id)()
    },
  })),
}

const HoppOpenAPIImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_openapi",
    name: "import.from_openapi",
    title: "import.from_openapi_description",
    icon: IconOpenAPI,
    disabled: false,
    applicableTo: ["personal-workspace", "url-import"],
  },
  supported_sources: [
    {
      id: "file_import",
      name: "import.from_file",
      icon: IconFile,
      step: FileSource({
        caption: "import.from_file",
        acceptedFileTypes: ".json",
        onImportFromFile: async (content) => {
          const res = await hoppOpenAPIImporter(content)()

          if (E.isRight(res)) {
            onSuccessfulImport(res.right)
          } else {
            showImportFailedError()
          }
        },
      }),
    },
    {
      id: "url_import",
      name: "import.from_url",
      icon: IconFile,
      step: UrlSource({
        caption: "import.from_url",
        onImportFromURL: async (content) => {
          const res = await hoppOpenAPIImporter(content)()

          if (E.isRight(res)) {
            onSuccessfulImport(res.right)
          } else {
            showImportFailedError()
          }
        },
      }),
    },
  ],
}

const HoppPostmanImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_postman",
    name: "import.from_postman",
    title: "import.from_postman_description",
    icon: IconPostman,
    disabled: false,
    applicableTo: ["personal-workspace", "url-import"],
  },
  component: FileSource({
    caption: "import.from_file",
    acceptedFileTypes: ".json",
    onImportFromFile: async (content) => {
      const res = await hoppPostmanImporter(content)()

      if (E.isRight(res)) {
        onSuccessfulImport(res.right)
      } else {
        showImportFailedError()
      }
    },
  }),
}

const HoppInsomniaImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_insomnia",
    name: "import.from_insomnia",
    title: "import.from_insomnia_description",
    icon: IconInsomnia,
    disabled: true,
    applicableTo: ["personal-workspace", "url-import"],
  },
  component: FileSource({
    caption: "import.from_file",
    acceptedFileTypes: ".json",
    onImportFromFile: async (content) => {
      const res = await hoppInsomniaImporter(content)()

      if (E.isRight(res)) {
        onSuccessfulImport(res.right)
      } else {
        showImportFailedError()
      }
    },
  }),
}

const HoppGistImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_gist",
    name: "import.from_gist",
    title: "import.from_gist_description",
    icon: IconGithub,
    disabled: true,
    applicableTo: ["personal-workspace", "url-import"],
  },
  component: GistSource({
    caption: "import.from_url",
    onImportFromGist: async (content) => {
      const res = await hoppRESTImporter(content)()

      if (E.isRight(res)) {
        onSuccessfulImport(res.right)
      } else {
        showImportFailedError()
      }
    },
  }),
}

const HoppMyCollectionsExporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_my_collections",
    name: "export.as_json",
    title: "export.as_json_description",
    icon: IconUser,
    disabled: false,
    applicableTo: ["personal-workspace"],
    isLoading: isHoppMyCollectionExporterInProgress,
  },
  action: async () => {
    isHoppMyCollectionExporterInProgress.value = true

    const message = initializeDownloadCollection(
      myCollectionsExporter(myCollections.value),
      "Collections.json"
    )

    if (E.isRight(message)) {
      toast.success(message.right)
    }

    isHoppMyCollectionExporterInProgress.value = false
  },
}

const HoppTeamCollectionsExporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_team_collections",
    name: "export.as_json",
    title: "export.as_json_description",
    icon: IconUser,
    disabled: false,
    applicableTo: ["team-workspace"],
    isLoading: isHoppTeamCollectionExporterInProgress,
  },
  action: async () => {
    isHoppTeamCollectionExporterInProgress.value = true

    if (
      props.collectionsType.type == "team-collections" &&
      props.collectionsType.selectedTeam
    ) {
      const res = await teamCollectionsExporter(
        props.collectionsType.selectedTeam.id
      )

      if (E.isRight(res)) {
        initializeDownloadCollection(
          res.right.exportCollectionsToJSON,
          "team-collections.json"
        )
      } else {
        toast.error(res.left.error.toString())
      }
    }

    isHoppTeamCollectionExporterInProgress.value = false
  },
}

const HoppGistCollectionsExporter: ImporterOrExporter = {
  metadata: {
    id: "create_secret_gist",
    name: "export.create_secret_gist",
    icon: IconGithub,
    disabled: !currentUser.value
      ? true
      : currentUser.value.provider !== "github.com",
    title: t("export.create_secret_gist"),
    applicableTo: ["personal-workspace"],
    isLoading: isHoppGistCollectionExporterInProgress,
  },
  action: async () => {
    isHoppGistCollectionExporterInProgress.value = true

    const collectionJSON = await getCollectionJSON()
    const accessToken = currentUser.value?.accessToken

    if (!accessToken) {
      toast.error(t("error.something_went_wrong"))
      isHoppGistCollectionExporterInProgress.value = false
      return
    }

    if (E.isRight(collectionJSON))
      collectionsGistExporter(collectionJSON.right, accessToken)

    isHoppGistCollectionExporterInProgress.value = false
  },
}

const importerModules = computed(() => {
  const enabledImporters = [
    HoppRESTImporter,
    HoppMyCollectionImporter,
    HoppOpenAPIImporter,
    HoppPostmanImporter,
    HoppInsomniaImporter,
    HoppGistImporter,
  ]

  const isTeams = props.collectionsType.type === "team-collections"

  return enabledImporters.filter((importer) => {
    return isTeams
      ? importer.metadata.applicableTo.includes("team-workspace")
      : importer.metadata.applicableTo.includes("personal-workspace")
  })
})

const exporterModules = computed(() => {
  const enabledExporters = [
    HoppMyCollectionsExporter,
    HoppTeamCollectionsExporter,
  ]

  if (platform.platformFeatureFlags.exportAsGIST) {
    enabledExporters.push(HoppGistCollectionsExporter)
  }

  return enabledExporters.filter((exporter) => {
    return exporter.metadata.applicableTo.includes(
      props.collectionsType.type == "my-collections"
        ? "personal-workspace"
        : "team-workspace"
    )
  })
})

const myCollections = useReadonlyStream(restCollections$, [])

const getCollectionJSON = async () => {
  let collections

  if (
    props.collectionsType.type == "team-collections" &&
    props.collectionsType.selectedTeam?.id
  ) {
    const res = await getTeamCollectionJSON(
      props.collectionsType.selectedTeam?.id
    )

    return E.isRight(res)
      ? E.right(res.right.exportCollectionsToJSON)
      : E.left(res.left)
  } else {
    collections = JSON.stringify(myCollections.value, null, 2)

    return E.right(collections)
  }
}
</script>
