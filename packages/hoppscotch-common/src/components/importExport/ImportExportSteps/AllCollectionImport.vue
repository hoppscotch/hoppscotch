<template>
  <div class="select-wrapper flex flex-col gap-2">
    <div>
      <p class="flex items-center">
        <span
          class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
        >
          <icon-lucide-check-circle class="svg-icons" />
        </span>
        <span>
          {{ t(`action.choose_workspace`) }}
        </span>
      </p>
      <div class="pl-10">
        <div v-if="isLoadingTeams" class="flex gap-1 mt-2">
          <HoppSmartSpinner />

          {{ t("state.loading_workspaces") }}
        </div>
        <select
          v-else
          v-model="selectedWorkspaceID"
          autocomplete="off"
          class="select mt-2"
          autofocus
        >
          <option :key="undefined" :value="undefined" disabled selected>
            {{ t("action.select_workspace") }}
          </option>
          <option
            v-for="workspace in workspaces"
            :key="`workspace-${workspace.id}`"
            :value="workspace.id"
            class="bg-primary"
          >
            {{ workspace.name }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="showSelectCollections">
      <p class="flex items-center">
        <span
          class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
        >
          <icon-lucide-check-circle class="svg-icons" />
        </span>
        <span>
          {{ t(`action.choose_collection`) }}
        </span>
      </p>
      <div class="pl-10">
        <div v-if="isGettingWorkspaceRootCollections" class="flex gap-1 mt-2">
          <HoppSmartSpinner />

          {{ t("state.loading_collections_in_workspace") }}
        </div>
        <select
          v-else
          v-model="selectedCollectionID"
          autocomplete="off"
          class="select mt-2"
          autofocus
        >
          <option :key="undefined" :value="undefined" disabled selected>
            {{ t("collection.select") }}
          </option>
          <option
            v-for="collection in selectableCollections"
            :key="collection.id"
            :value="collection.id"
            class="bg-primary"
          >
            {{ collection.title }}
          </option>
        </select>
      </div>
    </div>
  </div>

  <div class="my-4">
    <HoppButtonPrimary
      class="w-full"
      :label="t('import.title')"
      :loading="loading"
      :disabled="!hasSelectedCollectionID || loading"
      @click="getCollectionDetailsAndImport"
    />
  </div>
</template>

<script setup lang="ts">
import {
  GQLHeader,
  HoppCollection,
  HoppCollectionVariable,
  HoppGQLAuth,
  HoppGQLRequest,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { computed, onMounted, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { runGQLQuery } from "~/helpers/backend/GQLClient"
import {
  RootCollectionsOfTeamDocument,
  GetCollectionRequestsDocument,
  GetCollectionChildrenDocument,
} from "~/helpers/backend/graphql"
import { TEAMS_BACKEND_PAGE_SIZE } from "~/helpers/teams/TeamCollectionAdapter"
import { getRESTCollection, restCollections$ } from "~/newstore/collections"
import { WorkspaceService } from "~/services/workspace.service"
import * as E from "fp-ts/Either"
import { getSingleCollection } from "~/helpers/teams/TeamCollection"
import { useToast } from "~/composables/toast"

const workspaceService = useService(WorkspaceService)
const teamListAdapter = workspaceService.acquireTeamListAdapter(null)
const myTeams = useReadonlyStream(teamListAdapter.teamList$, null)
const isLoadingTeams = useReadonlyStream(teamListAdapter.loading$, false)

const t = useI18n()

defineProps<{
  loading: boolean
}>()

onMounted(() => {
  teamListAdapter.fetchList()
})

const selectedCollectionID = ref<string | undefined>(undefined)

const hasSelectedCollectionID = computed(() => {
  return selectedCollectionID.value !== undefined
})

const personalCollections = useReadonlyStream(restCollections$, [])

const selectedWorkspaceID = ref<string | undefined>(undefined)

const isGettingWorkspaceRootCollections = ref(false)

const selectableCollections = ref<
  {
    id: string
    title: string
    data?: string | null
  }[]
>([])

const toast = useToast()

watch(
  selectedWorkspaceID,
  async () => {
    // reset the selected collection when the workspace changes
    selectedCollectionID.value = undefined

    if (!selectedWorkspaceID.value) {
      // do some cleanup on the previous workspace selection
      selectableCollections.value = []

      return
    }

    if (selectedWorkspaceID.value === "personal") {
      selectableCollections.value = personalCollections.value.map(
        (collection, collectionIndex) => ({
          id: `${collectionIndex}`, // because we don't have an ID for personal collections
          title: collection.name,
        })
      )
      return
    }

    isGettingWorkspaceRootCollections.value = true

    const res = await getWorkspaceRootCollections(selectedWorkspaceID.value)

    if (E.isLeft(res)) {
      console.error(res.left)
      isGettingWorkspaceRootCollections.value = false
      return
    }

    selectableCollections.value = res.right

    isGettingWorkspaceRootCollections.value = false
  },
  {
    immediate: true,
  }
)

const emit = defineEmits<{
  (e: "importCollection", content: HoppCollection): void
}>()

const showSelectCollections = computed(() => {
  return !!selectedWorkspaceID.value
})

const workspaces = computed(() => {
  const allWorkspaces = [
    {
      id: "personal",
      name: t("workspace.personal"),
    },
  ]

  myTeams.value?.forEach((team) => {
    allWorkspaces.push({
      id: team.id,
      name: team.name,
    })
  })

  return allWorkspaces
})

const getWorkspaceRootCollections = async (workspaceID: string) => {
  const totalCollections: {
    id: string
    title: string
    data?: string | null
  }[] = []

  while (true) {
    const result = await runGQLQuery({
      query: RootCollectionsOfTeamDocument,
      variables: {
        teamID: workspaceID,
        cursor:
          totalCollections.length > 0
            ? totalCollections[totalCollections.length - 1].id
            : undefined,
      },
    })

    if (E.isLeft(result)) {
      return E.left(result.left)
    }

    totalCollections.push(...result.right.rootCollectionsOfTeam)

    if (result.right.rootCollectionsOfTeam.length < TEAMS_BACKEND_PAGE_SIZE) {
      break
    }
  }

  return E.right(totalCollections)
}

const convertToInheritedProperties = (
  data?: string | null
): {
  auth: HoppRESTAuth | HoppGQLAuth
  headers: Array<HoppRESTHeader | GQLHeader>
  variables: HoppCollectionVariable[]
} => {
  const collectionLevelAuthAndHeaders = data
    ? (JSON.parse(data) as {
        auth: HoppRESTAuth | HoppGQLAuth
        headers: Array<HoppRESTHeader | GQLHeader>
        variables: HoppCollectionVariable[]
      })
    : null

  const headers = collectionLevelAuthAndHeaders?.headers ?? []

  const auth = collectionLevelAuthAndHeaders?.auth ?? {
    authType: "none",
    authActive: true,
  }

  const variables = collectionLevelAuthAndHeaders?.variables ?? []

  return {
    auth,
    headers,
    variables,
  }
}

const getTeamCollection = async (
  collectionID: string
): Promise<E.Either<any, HoppCollection>> => {
  const rootCollectionRes = await getSingleCollection(collectionID)

  if (E.isLeft(rootCollectionRes)) {
    return E.left(rootCollectionRes.left)
  }

  const rootCollection = rootCollectionRes.right.collection

  if (!rootCollection) {
    return E.left("ROOT_COLLECTION_NOT_FOUND")
  }

  // Fetch ALL requests with pagination
  const allRequests: any[] = []
  let requestsCursor: string | undefined = undefined

  while (true) {
    const requestsRes: E.Either<any, any> = await runGQLQuery({
      query: GetCollectionRequestsDocument,
      variables: {
        collectionID,
        cursor: requestsCursor,
      },
    })

    if (E.isLeft(requestsRes)) {
      const pageNum =
        Math.floor(allRequests.length / TEAMS_BACKEND_PAGE_SIZE) + 1
      return E.left(
        `Failed to fetch requests (page ${pageNum}): ${requestsRes.left}`
      )
    }

    const requestsPage: any[] = requestsRes.right.requestsInCollection
    allRequests.push(...requestsPage)

    // If we got fewer than page size, we're done
    if (requestsPage.length < TEAMS_BACKEND_PAGE_SIZE) break

    // Update cursor for next page
    requestsCursor = requestsPage[requestsPage.length - 1].id
  }

  // Fetch ALL child collections with pagination
  const allChildCollections: any[] = []
  let childrenCursor: string | undefined = undefined

  while (true) {
    const childrenRes: E.Either<any, any> = await runGQLQuery({
      query: GetCollectionChildrenDocument,
      variables: {
        collectionID,
        cursor: childrenCursor,
      },
    })

    if (E.isLeft(childrenRes)) {
      const pageNum =
        Math.floor(allChildCollections.length / TEAMS_BACKEND_PAGE_SIZE) + 1
      return E.left(
        `Failed to fetch child collections (page ${pageNum}): ${childrenRes.left}`
      )
    }

    if (!childrenRes.right.collection) {
      return E.left("CHILD_COLLECTIONS_NOT_FOUND")
    }

    const childrenPage: any[] = childrenRes.right.collection.children
    allChildCollections.push(...childrenPage)

    // If we got fewer than page size, we're done
    if (childrenPage.length < TEAMS_BACKEND_PAGE_SIZE) break

    // Update cursor for next page
    childrenCursor = childrenPage[childrenPage.length - 1].id
  }

  // Recursively fetch all nested collections
  const childCollectionExpandedPromises = allChildCollections.map((col) =>
    getTeamCollection(col.id)
  )

  const childCollectionPromiseRes = await Promise.all(
    childCollectionExpandedPromises
  )

  const hasAnyError = childCollectionPromiseRes.some((res) => E.isLeft(res))

  if (hasAnyError) {
    return E.left("CHILD_COLLECTIONS_NOT_FOUND")
  }

  const unwrappedChildCollections = childCollectionPromiseRes.map(
    (res) => (res as E.Right<HoppCollection>).right
  )

  const collectionInHoppFormat: HoppCollection = makeCollection({
    name: rootCollection.title,
    ...convertToInheritedProperties(rootCollection.data),
    folders: unwrappedChildCollections,
    requests: allRequests.map((req) => {
      return JSON.parse(req.request) as HoppRESTRequest | HoppGQLRequest
    }),
  })

  return E.right(collectionInHoppFormat)
}

const getCollectionDetailsAndImport = async () => {
  if (!selectedCollectionID.value) {
    return
  }

  let collectionToImport: HoppCollection

  if (selectedWorkspaceID.value === "personal") {
    collectionToImport = getRESTCollection(parseInt(selectedCollectionID.value))
  } else {
    const res = await getTeamCollection(selectedCollectionID.value)

    if (E.isLeft(res)) {
      toast.error(t("import.failed"))

      return
    }

    collectionToImport = res.right
  }

  emit("importCollection", collectionToImport)
}
</script>
