<template>
  <ImportexportImportExport
    ref="collections-import-export"
    modal-title="graphql_collections.title"
    :importer-modules="importerModules"
    :exporter-modules="exporterModules"
    @hide-modal="emit('hide-modal')"
  />
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"
import { ImporterOrExporter } from "~/components/importexport/types"
import { FileSource } from "~/helpers/import-export/import/import-sources/FileSource"
import { GistSource } from "~/helpers/import-export/import/import-sources/GistSource"

import * as E from "fp-ts/Either"

import IconFolderPlus from "~icons/lucide/folder-plus"
import IconUser from "~icons/lucide/user"
import { initializeDownloadCollection } from "~/helpers/import-export/export"
import { useReadonlyStream } from "~/composables/stream"

import { platform } from "~/platform"
import {
  graphqlCollections$,
  setGraphqlCollections,
} from "~/newstore/collections"
import { hoppGqlCollectionsImporter } from "~/helpers/import-export/import/hoppGql"
import { gqlCollectionsExporter } from "~/helpers/import-export/export/gqlCollections"
import { gqlCollectionsGistExporter } from "~/helpers/import-export/export/gqlCollectionsGistExporter"

const t = useI18n()
const toast = useToast()

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const GqlCollectionsHoppImporter: ImporterOrExporter = {
  metadata: {
    id: "import.from_json",
    name: "import.from_json",
    icon: IconFolderPlus,
    title: "import.from_json",
    applicableTo: ["personal-workspace"],
    disabled: false,
  },
  component: FileSource({
    acceptedFileTypes: "application/json",
    caption: "import.from_json_description",
    onImportFromFile: async (gqlCollections) => {
      const res = await hoppGqlCollectionsImporter(gqlCollections)

      if (E.isLeft(res)) {
        failedImport()
        return
      }

      importSuccessful(res.right)
      emit("hide-modal")
    },
  }),
}

const GqlCollectionsGistImporter: ImporterOrExporter = {
  metadata: {
    id: "import.from_gist",
    name: "import.from_gist",
    icon: IconFolderPlus,
    title: "import.from_gist",
    applicableTo: ["personal-workspace", "team-workspace"],
    disabled: false,
  },
  component: GistSource({
    caption: "import.gql_collections_from_gist_description",
    onImportFromGist: async (gqlCollections) => {
      const res = await hoppGqlCollectionsImporter(gqlCollections)

      if (E.isLeft(res)) {
        failedImport()
        return
      } else {
        importSuccessful(res.right)
      }

      emit("hide-modal")
    },
  }),
}

const gqlCollections = useReadonlyStream(graphqlCollections$, [])

const GqlCollectionsHoppExporter: ImporterOrExporter = {
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
      gqlCollectionsExporter(gqlCollections.value),
      "GQLCollections.json"
    )

    E.isRight(message)
      ? toast.success(message.right)
      : toast.error(t("export.failed"))
  },
}

const GqlCollectionsGistExporter: ImporterOrExporter = {
  metadata: {
    id: "export.as_gist",
    name: "export.create_secret_gist",
    title: !currentUser
      ? "export.require_github"
      : // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        currentUser.provider !== "github.com"
        ? `export.require_github`
        : "export.create_secret_gist",
    icon: IconUser,
    disabled: !currentUser.value
      ? true
      : currentUser.value.provider !== "github.com",
    applicableTo: ["personal-workspace"],
  },
  action: async () => {
    if (!currentUser.value) {
      toast.error(t("profile.no_permission"))
      return
    }

    const accessToken = currentUser.value?.accessToken

    if (accessToken) {
      const res = await gqlCollectionsGistExporter(
        JSON.stringify(gqlCollections.value),
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

const importerModules = [GqlCollectionsHoppImporter, GqlCollectionsGistImporter]

const exporterModules = [GqlCollectionsHoppExporter, GqlCollectionsGistExporter]

const failedImport = () => {
  toast.error(t("import.failed"))
}

const importSuccessful = async (
  gqlCollections: HoppCollection<HoppGQLRequest>[]
) => {
  setGraphqlCollections(gqlCollections)
  toast.success(t("import.success"))
}

const emit = defineEmits<{
  (e: "hide-modal"): () => void
}>()
</script>
