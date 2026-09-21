<template>
  <ImportExportBase
    ref="collections-update"
    modal-title="collection.update"
    :importer-modules="importerModules"
    :exporter-modules="[]"
    :has-team-write-access="true"
    :default-importer-id="savedSource?.importerId"
    :default-source-id="savedSource?.sourceId"
    @hide-modal="emit('hide-modal')"
  />
</template>

<script setup lang="ts">
import { HoppCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { PropType, Ref, computed, ref } from "vue"
import { useService } from "dioc/vue"

import { FileSource } from "~/helpers/import-export/import/import-sources/FileSource"
import { UrlSource } from "~/helpers/import-export/import/import-sources/UrlSource"
import { GistSource } from "~/helpers/import-export/import/import-sources/GistSource"

import {
  hoppInsomniaImporter,
  hoppOpenAPIImporter,
  hoppPostmanImporter,
  hoppRESTImporter,
} from "~/helpers/import-export/import/importers"

import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { editRESTCollection } from "~/newstore/collections"
import { runDispatchWithOutSyncing } from "~/lib/sync"
import { syncPersonalRESTCollectionUpdate } from "~/lib/sync/collections/updateSync"
import {
  ensureRefIds,
  populateLocalStoresFromCollectionTree,
  stripCollectionTreeForStore,
} from "~/helpers/clientLocalVariables"

import IconInsomnia from "~icons/hopp/insomnia"
import IconPostman from "~icons/hopp/postman"
import IconOpenAPI from "~icons/lucide/file"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconGithub from "~icons/lucide/github"
import IconFile from "~icons/lucide/file"
import IconLink from "~icons/lucide/link"

import { platform } from "~/platform"
import { ImporterOrExporter } from "~/components/importExport/types"
import { TeamWorkspace } from "~/services/workspace.service"
import { sanitizeCollection } from "~/helpers/import-export/import"
import {
  mergeCollectionTree,
  UpdateOptions,
  UpdateSummaryData,
} from "~/helpers/collection/update"
import {
  CollectionUpdateSource,
  CollectionUpdateSourceService,
} from "~/services/collection-update-source.service"
import UpdateSummary from "./UpdateSummary.vue"

const isInsomniaImporterInProgress = ref(false)
const isOpenAPIImporterInProgress = ref(false)
const isRESTImporterInProgress = ref(false)
const isPostmanImporterInProgress = ref(false)
const isGistImporterInProgress = ref(false)

const t = useI18n()
const toast = useToast()
const collectionUpdateSourceService = useService(CollectionUpdateSourceService)

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: TeamWorkspace
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
  collection: {
    type: Object as PropType<HoppCollection>,
    required: true,
  },
  collectionIndex: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const isTeamWorkspace = computed(() => {
  return props.collectionsType.type === "team-collections"
})

const collectionKey = computed(() => {
  return props.collection._ref_id ?? props.collection.id ?? ""
})

const savedSource = computed<CollectionUpdateSource | undefined>(() => {
  if (!collectionKey.value) return undefined
  return collectionUpdateSourceService.getUpdateSource(collectionKey.value)
})

const currentImportSummary: Ref<{
  showImportSummary: boolean
  importedCollections: HoppCollection[] | null
  updateSummaryData?: UpdateSummaryData
}> = ref({
  showImportSummary: false,
  importedCollections: null,
  updateSummaryData: undefined,
})

const setCurrentImportSummary = (
  collections: HoppCollection[],
  stats: UpdateSummaryData
) => {
  currentImportSummary.value.importedCollections = collections
  currentImportSummary.value.updateSummaryData = stats
  currentImportSummary.value.showImportSummary = true
}

const unsetCurrentImportSummary = () => {
  currentImportSummary.value.importedCollections = null
  currentImportSummary.value.updateSummaryData = undefined
  currentImportSummary.value.showImportSummary = false
}

const showImportFailedError = () => {
  toast.error(t("import.failed"))
}

const handleUpdateToStore = async (
  collections: HoppCollection[],
  options: UpdateOptions = { preserveScripts: true, keepMissingRequests: true },
  sourceMeta?: {
    importerId: string
    sourceId?: string
    sourceType: "url" | "file"
    url?: string
    fileName?: string
  }
) => {
  if (!collections || collections.length === 0) {
    showImportFailedError()
    unsetCurrentImportSummary()
    return
  }

  try {
    const sanitizedCollections = collections
      .map(sanitizeCollection)
      .map(ensureRefIds)

    // Execute intelligent merge with conflict options
    const { updatedCollection, stats } = mergeCollectionTree(
      props.collection,
      sanitizedCollections,
      options
    )

    const finalCollection = ensureRefIds(updatedCollection)
    populateLocalStoresFromCollectionTree(finalCollection)

    if (props.collectionsType.type === "my-collections") {
      const syncResult = await syncPersonalRESTCollectionUpdate(
        props.collection,
        finalCollection
      )
      if (E.isLeft(syncResult)) {
        showImportFailedError()
        unsetCurrentImportSummary()
        return
      }

      runDispatchWithOutSyncing(() => {
        editRESTCollection(
          props.collectionIndex,
          stripCollectionTreeForStore(finalCollection)
        )
      })

      toast.success(t("collection.updated"))
      setCurrentImportSummary([finalCollection], stats)

      // Save the update source configuration for this collection
      if (sourceMeta && collectionKey.value) {
        collectionUpdateSourceService.setUpdateSource(collectionKey.value, {
          importerId: sourceMeta.importerId,
          sourceId: sourceMeta.sourceId,
          sourceType: sourceMeta.sourceType,
          url: sourceMeta.url,
          fileName: sourceMeta.fileName,
          updatedAt: Date.now(),
        })
      }
    }
  } catch (_e) {
    showImportFailedError()
    unsetCurrentImportSummary()
  }
}

const HoppRESTImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_rest",
    name: "collection.update_from_json",
    title: "import.from_json_description",
    icon: IconFolderPlus,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace", "url-import"],
    format: "hoppscotch",
  },
  importSummary: currentImportSummary,
  summaryComponent: UpdateSummary,
  component: FileSource({
    caption: "import.from_file",
    actionLabel: "action.update",
    acceptedFileTypes: ".json",
    showUpdateOptions: true,
    onImportFromFile: async (
      content,
      options?: UpdateOptions & { fileName?: string }
    ) => {
      isRESTImporterInProgress.value = true
      const res = await hoppRESTImporter(content)()

      if (E.isRight(res)) {
        await handleUpdateToStore(res.right, options, {
          importerId: "hopp_rest",
          sourceType: "file",
          fileName: options?.fileName,
        })

        platform.analytics?.logEvent({
          type: "HOPP_IMPORT_COLLECTION",
          importer: "collection.update_from_json",
          platform: "rest",
          workspaceType: isTeamWorkspace.value ? "team" : "personal",
        })
      } else {
        showImportFailedError()
        unsetCurrentImportSummary()
      }

      isRESTImporterInProgress.value = false
    },
    description: "import.from_hoppscotch_importer_summary",
    isLoading: isRESTImporterInProgress,
  }),
}

const HoppOpenAPIImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_openapi",
    name: "collection.update_from_openapi",
    title: "import.from_openapi_description",
    icon: IconOpenAPI,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace", "url-import"],
    format: "openapi",
  },
  importSummary: currentImportSummary,
  summaryComponent: UpdateSummary,
  supported_sources: [
    {
      id: "file_import",
      name: "import.from_file",
      icon: IconFile,
      step: FileSource({
        caption: "import.from_file",
        actionLabel: "action.update",
        acceptedFileTypes: ".json, .yaml, .yml",
        description: "import.from_openapi_import_summary",
        showUpdateOptions: true,
        onImportFromFile: async (
          content,
          options?: UpdateOptions & { fileName?: string }
        ) => {
          isOpenAPIImporterInProgress.value = true

          const res = await hoppOpenAPIImporter(content)()

          if (E.isRight(res)) {
            await handleUpdateToStore(res.right, options, {
              importerId: "hopp_openapi",
              sourceId: "file_import",
              sourceType: "file",
              fileName: options?.fileName,
            })

            platform.analytics?.logEvent({
              platform: "rest",
              type: "HOPP_IMPORT_COLLECTION",
              importer: "collection.update_from_openapi",
              workspaceType: isTeamWorkspace.value ? "team" : "personal",
            })
          } else {
            showImportFailedError()
            unsetCurrentImportSummary()
          }

          isOpenAPIImporterInProgress.value = false
        },
        isLoading: isOpenAPIImporterInProgress,
      }),
    },
    {
      id: "url_import",
      name: "import.from_url",
      icon: IconLink,
      step: UrlSource({
        caption: "import.from_url",
        actionLabel: "action.update",
        description: "import.from_openapi_import_summary",
        showUpdateOptions: true,
        initialUrl: computed(() =>
          savedSource.value?.importerId === "hopp_openapi"
            ? savedSource.value.url
            : undefined
        ),
        onImportFromURL: async (
          content,
          options?: UpdateOptions & { url?: string }
        ) => {
          isOpenAPIImporterInProgress.value = true

          const res = await hoppOpenAPIImporter([content])()

          if (E.isRight(res)) {
            await handleUpdateToStore(res.right, options, {
              importerId: "hopp_openapi",
              sourceId: "url_import",
              sourceType: "url",
              url: options?.url,
            })

            platform.analytics?.logEvent({
              platform: "rest",
              type: "HOPP_IMPORT_COLLECTION",
              importer: "collection.update_from_openapi",
              workspaceType: isTeamWorkspace.value ? "team" : "personal",
            })
          } else {
            showImportFailedError()
            unsetCurrentImportSummary()
          }

          isOpenAPIImporterInProgress.value = false
        },
        isLoading: isOpenAPIImporterInProgress,
      }),
    },
  ],
}

const HoppPostmanImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_postman",
    name: "collection.update_from_postman",
    title: "import.from_postman_description",
    icon: IconPostman,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace", "url-import"],
    format: "postman",
  },
  importSummary: currentImportSummary,
  summaryComponent: UpdateSummary,
  component: FileSource({
    caption: "import.from_file",
    actionLabel: "action.update",
    acceptedFileTypes: ".json",
    description: "import.from_postman_import_summary",
    showPostmanScriptOption: true,
    showUpdateOptions: true,
    onImportFromFile: async (
      content: string[],
      optionsOrScripts?: UpdateOptions & {
        importScripts?: boolean
        fileName?: string
      }
    ) => {
      isPostmanImporterInProgress.value = true

      const importScripts =
        typeof optionsOrScripts === "object"
          ? optionsOrScripts.importScripts
          : undefined

      const res = await hoppPostmanImporter(content, importScripts ?? false)()

      if (E.isRight(res)) {
        await handleUpdateToStore(
          res.right,
          typeof optionsOrScripts === "object" ? optionsOrScripts : undefined,
          {
            importerId: "hopp_postman",
            sourceType: "file",
            fileName: optionsOrScripts?.fileName,
          }
        )

        platform.analytics?.logEvent({
          platform: "rest",
          type: "HOPP_IMPORT_COLLECTION",
          importer: "collection.update_from_postman",
          workspaceType: isTeamWorkspace.value ? "team" : "personal",
        })
      } else {
        showImportFailedError()
        unsetCurrentImportSummary()
      }

      isPostmanImporterInProgress.value = false
    },
    isLoading: isPostmanImporterInProgress,
  }),
}

const HoppInsomniaImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_insomnia",
    name: "collection.update_from_insomnia",
    title: "import.from_insomnia_description",
    icon: IconInsomnia,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace", "url-import"],
    format: "insomnia",
  },
  importSummary: currentImportSummary,
  summaryComponent: UpdateSummary,
  component: FileSource({
    caption: "import.from_file",
    actionLabel: "action.update",
    acceptedFileTypes: ".json, .yaml, .yml, .har",
    description: "import.from_insomnia_import_summary",
    showUpdateOptions: true,
    onImportFromFile: async (
      content,
      options?: UpdateOptions & { fileName?: string }
    ) => {
      isInsomniaImporterInProgress.value = true

      const res = await hoppInsomniaImporter(content)()

      if (E.isRight(res)) {
        await handleUpdateToStore(res.right, options, {
          importerId: "hopp_insomnia",
          sourceType: "file",
          fileName: options?.fileName,
        })

        platform.analytics?.logEvent({
          platform: "rest",
          type: "HOPP_IMPORT_COLLECTION",
          importer: "collection.update_from_insomnia",
          workspaceType: isTeamWorkspace.value ? "team" : "personal",
        })
      } else {
        showImportFailedError()
        unsetCurrentImportSummary()
      }

      isInsomniaImporterInProgress.value = false
    },
    isLoading: isInsomniaImporterInProgress,
  }),
}

const HoppGistImporter: ImporterOrExporter = {
  metadata: {
    id: "hopp_gist",
    name: "collection.update_from_gist",
    title: "import.from_gist_description",
    icon: IconGithub,
    disabled: false,
    applicableTo: ["personal-workspace", "team-workspace", "url-import"],
    format: "hoppscotch",
  },
  importSummary: currentImportSummary,
  summaryComponent: UpdateSummary,
  component: GistSource({
    caption: "import.from_url",
    actionLabel: "action.update",
    description: "import.from_gist_import_summary",
    showUpdateOptions: true,
    initialUrl: computed(() =>
      savedSource.value?.importerId === "hopp_gist"
        ? savedSource.value.url
        : undefined
    ),
    onImportFromGist: async (
      content,
      options?: UpdateOptions & { url?: string }
    ) => {
      if (E.isLeft(content)) {
        showImportFailedError()
        return
      }

      isGistImporterInProgress.value = true

      const res = await hoppRESTImporter(content.right)()

      if (E.isRight(res)) {
        await handleUpdateToStore(res.right, options, {
          importerId: "hopp_gist",
          sourceType: "url",
          url: options?.url,
        })

        platform.analytics?.logEvent({
          platform: "rest",
          type: "HOPP_IMPORT_COLLECTION",
          importer: "collection.update_from_gist",
          workspaceType: isTeamWorkspace.value ? "team" : "personal",
        })
      } else {
        showImportFailedError()
        unsetCurrentImportSummary()
      }

      isGistImporterInProgress.value = false
    },
    isLoading: isGistImporterInProgress,
  }),
}

const importerModules: ImporterOrExporter[] = [
  HoppRESTImporter,
  HoppOpenAPIImporter,
  HoppPostmanImporter,
  HoppInsomniaImporter,
  HoppGistImporter,
]
</script>
