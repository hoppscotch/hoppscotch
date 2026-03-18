<template>
  <div class="flex flex-col">
    <div
      class="h-1 w-full transition"
      :class="[
        {
          'bg-accentDark': isReorderable,
        },
      ]"
      @drop="orderUpdateCollectionEvent"
      @dragover.prevent="ordering = true"
      @dragleave="ordering = false"
      @dragend="resetDragState"
    ></div>
    <div class="relative flex flex-col">
      <div
        class="z-[1] pointer-events-none absolute inset-0 bg-accent opacity-0 transition"
        :class="{
          'opacity-25':
            dragging && notSameDestination && notSameParentDestination,
        }"
      ></div>
      <div
        class="z-[3] group pointer-events-auto relative flex cursor-pointer items-stretch"
        :draggable="!hasNoTeamAccess"
        @dragstart="dragStart"
        @drop="handelDrop($event)"
        @dragover="handleDragOver($event)"
        @dragleave="resetDragState"
        @dragend="
          () => {
            resetDragState()
            dropItemID = ''
          }
        "
        @contextmenu.prevent="options?.tippy?.show()"
      >
        <div
          class="flex min-w-0 flex-1 items-center justify-center"
          @click="emit('toggle-children')"
        >
          <span
            class="pointer-events-none flex items-center justify-center px-4"
          >
            <HoppSmartSpinner v-if="isCollLoading" />
            <component
              :is="collectionIcon"
              v-else
              class="svg-icons"
              :class="{ 'text-accent': isSelected }"
            />
          </span>
          <span
            class="pointer-events-none flex min-w-0 flex-1 py-2 pr-2 transition group-hover:text-secondaryDark"
          >
            <span class="truncate" :class="{ 'text-accent': isSelected }">
              {{ collectionName }}
            </span>
            <!-- Mock Server Status Indicator -->
            <span
              v-if="mockServerStatus.exists"
              v-tippy="{ theme: 'tooltip' }"
              :title="
                mockServerStatus.isActive
                  ? t('mock_server.active')
                  : t('mock_server.inactive')
              "
              class="ml-2 flex items-center"
            >
              <component
                :is="IconServer"
                class="svg-icons"
                :class="{
                  'text-green-500': mockServerStatus.isActive,
                  'text-secondaryLight': !mockServerStatus.isActive,
                }"
              />
            </span>
            <!-- Published Doc Status Indicator -->
            <span
              v-if="publishedDocStatus"
              v-tippy="{ theme: 'tooltip' }"
              :title="t('documentation.publish.published')"
              class="ml-2 flex items-center"
            >
              <component :is="IconGlobe" class="svg-icons text-green-500" />
            </span>
          </span>
        </div>

        <div
          v-if="isCollectionLoading && !isOpen"
          class="flex items-center px-2"
        >
          <HoppSmartSpinner />
        </div>
        <div v-else class="flex">
          <HoppButtonSecondary
            v-if="!hasNoTeamAccess"
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFilePlus"
            :title="t('request.add')"
            class="hidden group-hover:inline-flex"
            @click="emit('add-request')"
          />
          <HoppButtonSecondary
            v-if="!hasNoTeamAccess"
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFolderPlus"
            :title="t('folder.new')"
            class="hidden group-hover:inline-flex"
            @click="emit('add-folder')"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconPlaySquare"
            :title="t('collection_runner.run_collection')"
            class="hidden group-hover:inline-flex"
            @click="emit('run-collection', props.id)"
          />
          <span>
            <tippy
              ref="options"
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
                  @keyup.r="requestAction?.$el.click()"
                  @keyup.n="folderAction?.$el.click()"
                  @keyup.e="edit?.$el.click()"
                  @keyup.d="duplicateAction?.$el.click()"
                  @keyup.delete="deleteAction?.$el.click()"
                  @keyup.x="exportAction?.$el.click()"
                  @keyup.p="propertiesAction?.$el.click()"
                  @keyup.t="runCollectionAction?.$el.click()"
                  @keyup.s="sortAction?.$el.click()"
                  @keyup.m="
                    isMockServerVisible && mockServerAction?.$el.click()
                  "
                  @keyup.i="documentationAction?.$el.click()"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    v-if="!hasNoTeamAccess"
                    ref="requestAction"
                    :icon="IconFilePlus"
                    :label="t('request.new')"
                    :shortcut="['R']"
                    @click="
                      () => {
                        emit('add-request')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="!hasNoTeamAccess"
                    ref="folderAction"
                    :icon="IconFolderPlus"
                    :label="t('folder.new')"
                    :shortcut="['N']"
                    @click="
                      () => {
                        emit('add-folder')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="runCollectionAction"
                    :icon="IconPlaySquare"
                    :label="t('collection_runner.run_collection')"
                    :shortcut="['T']"
                    @click="
                      () => {
                        emit('run-collection', props.id)
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="isDocumentationVisible"
                    ref="documentationAction"
                    :icon="IconBook"
                    :label="t('documentation.title')"
                    :shortcut="['I']"
                    @click="
                      () => {
                        handleDocumentationAction()
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="
                      !hasNoTeamAccess &&
                      isRootCollection &&
                      isMockServerVisible
                    "
                    ref="mockServerAction"
                    :icon="IconServer"
                    :label="t('mock_server.create_mock_server')"
                    :shortcut="['M']"
                    @click="
                      () => {
                        handleMockServerAction()
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="!hasNoTeamAccess"
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        emit('edit-collection')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="!hasNoTeamAccess && isChildrenSortable"
                    ref="sortAction"
                    :icon="IconArrowUpDown"
                    :label="t('action.sort')"
                    :shortcut="['S']"
                    @click="
                      () => {
                        sortCollection()
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="!hasNoTeamAccess"
                    ref="duplicateAction"
                    :icon="IconCopy"
                    :label="t('action.duplicate')"
                    :loading="duplicateCollectionLoading"
                    :shortcut="['D']"
                    @click="
                      () => {
                        ;(emit('duplicate-collection'),
                          collectionsType === 'my-collections' ? hide() : null)
                      }
                    "
                  />
                  <HoppSmartItem
                    v-if="!hasNoTeamAccess"
                    ref="exportAction"
                    :icon="IconDownload"
                    :label="t('export.title')"
                    :shortcut="['X']"
                    :loading="exportLoading"
                    @click="
                      () => {
                        ;(emit('export-data'),
                          collectionsType === 'my-collections' ? hide() : null)
                      }
                    "
                  />

                  <HoppSmartItem
                    ref="propertiesAction"
                    :icon="IconSettings2"
                    :label="t('action.properties')"
                    :shortcut="['P']"
                    @click="
                      () => {
                        emit('edit-properties')
                        hide()
                      }
                    "
                  />

                  <HoppSmartItem
                    v-if="!hasNoTeamAccess"
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        emit('remove-collection')
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </span>
        </div>
      </div>
    </div>
    <div
      v-if="isLastItem"
      class="w-full transition"
      :class="[
        {
          'bg-accentDark': isLastItemReorderable,
          'h-1 ': isLastItem,
        },
      ]"
      @drop="updateLastItemOrder"
      @dragover.prevent="orderingLastItem = true"
      @dragleave="orderingLastItem = false"
      @dragend="resetDragState"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useDocumentationVisibility } from "~/composables/documentationVisibility"
import { HoppCollection } from "@hoppscotch/data"
import { computed, ref, watch } from "vue"
import { TippyComponent } from "vue-tippy"
import { useReadonlyStream } from "~/composables/stream"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import {
  changeCurrentReorderStatus,
  currentReorderingStatus$,
} from "~/newstore/reordering"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCopy from "~icons/lucide/copy"
import IconDownload from "~icons/lucide/download"
import IconEdit from "~icons/lucide/edit"
import IconFilePlus from "~icons/lucide/file-plus"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconPlaySquare from "~icons/lucide/play-square"
import IconServer from "~icons/lucide/server"
import IconSettings2 from "~icons/lucide/settings-2"
import IconTrash2 from "~icons/lucide/trash-2"
import IconArrowUpDown from "~icons/lucide/arrow-up-down"
import IconBook from "~icons/lucide/book"
import { CurrentSortValuesService } from "~/services/current-sort.service"
import { useService } from "dioc/vue"
import { useMockServerStatus } from "~/composables/mockServer"
import { useMockServerVisibility } from "~/composables/mockServerVisibility"
import { platform } from "~/platform"
import { invokeAction } from "~/helpers/actions"
import { DocumentationService } from "~/services/documentation.service"
import IconGlobe from "~icons/lucide/globe"

type CollectionType = "my-collections" | "team-collections"
type FolderType = "collection" | "folder"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    id: string
    parentID?: string | null
    data: HoppCollection | TeamCollection
    /**
     * Collection component can be used for both collections and folders.
     * folderType is used to determine which one it is.
     */
    collectionsType: CollectionType
    folderType: FolderType
    isOpen: boolean
    isSelected?: boolean | null
    exportLoading?: boolean
    hasNoTeamAccess?: boolean
    collectionMoveLoading?: string[]
    isLastItem?: boolean
    duplicateCollectionLoading?: boolean
    teamLoadingCollections?: string[]
  }>(),
  {
    id: "",
    parentID: null,
    collectionsType: "my-collections",
    folderType: "collection",
    isOpen: false,
    isSelected: false,
    exportLoading: false,
    hasNoTeamAccess: false,
    isLastItem: false,
    duplicateCollectionLoading: false,
    collectionMoveLoading: () => [],
    teamLoadingCollections: () => [],
  }
)

const emit = defineEmits<{
  (event: "toggle-children"): void
  (event: "add-request"): void
  (event: "add-folder"): void
  (event: "run-collection"): void
  (event: "edit-collection"): void
  (event: "edit-properties"): void
  (event: "duplicate-collection"): void
  (event: "open-documentation"): void
  (event: "export-data"): void
  (event: "remove-collection"): void
  (event: "create-mock-server"): void
  (event: "drop-event", payload: DataTransfer): void
  (event: "drag-event", payload: DataTransfer): void
  (event: "dragging", payload: boolean): void
  (event: "update-collection-order", payload: DataTransfer): void
  (event: "update-last-collection-order", payload: DataTransfer): void
  (event: "run-collection", collectionID: string): void
  (
    event: "sort-collections",
    payload: {
      collectionID: string
      sortOrder: "asc" | "desc"
      collectionRefID: string
    }
  ): void
}>()

const tippyActions = ref<HTMLDivElement | null>(null)
const requestAction = ref<HTMLButtonElement | null>(null)
const folderAction = ref<HTMLButtonElement | null>(null)
const edit = ref<HTMLButtonElement | null>(null)
const duplicateAction = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const exportAction = ref<HTMLButtonElement | null>(null)
const mockServerAction = ref<HTMLButtonElement | null>(null)
const options = ref<TippyComponent | null>(null)
const propertiesAction = ref<HTMLButtonElement | null>(null)
const runCollectionAction = ref<HTMLButtonElement | null>(null)
const sortAction = ref<HTMLButtonElement | null>(null)
const documentationAction = ref<HTMLButtonElement | null>(null)

const { isDocumentationVisible } = useDocumentationVisibility()

const dragging = ref(false)
const ordering = ref(false)
const orderingLastItem = ref(false)
const dropItemID = ref("")

/**
 * Determines if the collection/folder is sortable.
 * A collection/folder is sortable if it has more than one request or more than one child folder.
 * or one request and one child folder.
 */
const isChildrenSortable = computed(() => {
  if (!props.data) return false

  if (props.collectionsType === "my-collections") {
    const collection = props.data as HoppCollection
    const req = collection.requests.length
    const fol = collection.folders.length

    return req > 1 || fol > 1 || (req === 1 && fol === 1)
  }

  const teamCollection = props.data as TeamCollection
  const req = teamCollection.requests?.length ?? 0
  const child = teamCollection.children?.length ?? 0

  return req > 1 || child > 1 || (req === 1 && child === 1)
})

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

const currentSortValuesService = useService(CurrentSortValuesService)

const collectionRefID = computed(() => {
  return props.collectionsType === "my-collections"
    ? (props.data as HoppCollection)._ref_id
    : props.id
})

const currentSortOrder = ref<"asc" | "desc">(
  currentSortValuesService.getSortOption(collectionRefID.value ?? "personal")
    ?.sortOrder ?? "asc"
)
const isCollectionLoading = computed(() => {
  return props.teamLoadingCollections!.includes(props.id)
})

// Mock Server Status
const { isMockServerVisible } = useMockServerVisibility()
const { getMockServerStatus } = useMockServerStatus()

const mockServerStatus = computed(() => {
  if (!isMockServerVisible.value) {
    return { exists: false, isActive: false }
  }

  const collectionId =
    props.collectionsType === "my-collections"
      ? ((props.data as HoppCollection).id ??
        (props.data as HoppCollection)._ref_id)
      : (props.data as TeamCollection).id

  return getMockServerStatus(collectionId || "")
})

// Published Doc Status
const documentationService = useService(DocumentationService)

const publishedDocStatus = computed(() => {
  const collectionId =
    props.collectionsType === "my-collections"
      ? ((props.data as HoppCollection).id ??
        (props.data as HoppCollection)._ref_id)
      : (props.data as TeamCollection).id

  return documentationService.getPublishedDocStatus(collectionId || "")
})

// Determine if this is a root collection (not a child folder)
const isRootCollection = computed(() => {
  return props.folderType === "collection"
})

// Used to determine if the collection is being dragged to a different destination
// This is used to make the highlight effect work
watch(
  () => dragging.value,
  (val) => {
    if (val && notSameDestination.value && notSameParentDestination.value) {
      emit("dragging", true)
    } else {
      emit("dragging", false)
    }
  }
)

const collectionIcon = computed(() => {
  if (props.isSelected) return IconCheckCircle
  else if (!props.isOpen) return IconFolder
  else if (props.isOpen) return IconFolderOpen
  return IconFolder
})

const collectionName = computed(() => {
  if ((props.data as HoppCollection).name)
    return (props.data as HoppCollection).name
  return (props.data as TeamCollection).title
})

watch(
  () => [props.exportLoading, props.duplicateCollectionLoading],
  ([newExportLoadingVal, newDuplicateCollectionLoadingVal]) => {
    if (!newExportLoadingVal && !newDuplicateCollectionLoadingVal) {
      options.value!.tippy?.hide()
    }
  }
)

const notSameParentDestination = computed(() => {
  return currentReorderingStatus.value.parentID !== props.id
})

const isRequestDragging = computed(() => {
  return currentReorderingStatus.value.type === "request"
})

const isSameParent = computed(() => {
  return currentReorderingStatus.value.parentID === props.parentID
})

const isReorderable = computed(() => {
  return (
    ordering.value &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  )
})
const isLastItemReorderable = computed(() => {
  return (
    orderingLastItem.value &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  )
})

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    emit("drag-event", dataTransfer)
    dropItemID.value = dataTransfer.getData("collectionIndex")
    dragging.value = !dragging.value
    changeCurrentReorderStatus({
      type: "collection",
      id: props.id,
      parentID: props.parentID,
    })
  }
}

// Trigger the re-ordering event when a collection is dragged over another collection's top section
const handleDragOver = (e: DragEvent) => {
  dragging.value = true
  if (
    e.offsetY < 10 &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  ) {
    ordering.value = true
    dragging.value = false
    orderingLastItem.value = false
  } else if (
    e.offsetY > 18 &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value &&
    props.isLastItem
  ) {
    orderingLastItem.value = true
    dragging.value = false
    ordering.value = false
  } else {
    ordering.value = false
    orderingLastItem.value = false
  }
}

const handelDrop = (e: DragEvent) => {
  if (ordering.value) {
    orderUpdateCollectionEvent(e)
  } else if (orderingLastItem.value) {
    updateLastItemOrder(e)
  } else {
    notSameParentDestination.value ? dropEvent(e) : e.stopPropagation()
  }
}

const dropEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("drop-event", e.dataTransfer)
    resetDragState()
  }
}

const orderUpdateCollectionEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("update-collection-order", e.dataTransfer)
    resetDragState()
  }
}

const updateLastItemOrder = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("update-last-collection-order", e.dataTransfer)
    resetDragState()
  }
}

const notSameDestination = computed(() => {
  return dropItemID.value !== props.id
})

const isCollLoading = computed(() => {
  const { collectionMoveLoading } = props
  if (
    collectionMoveLoading &&
    collectionMoveLoading.length > 0 &&
    props.data.id
  ) {
    return collectionMoveLoading.includes(props.data.id)
  }
  return false
})

const sortCollection = () => {
  currentSortOrder.value = currentSortOrder.value === "asc" ? "desc" : "asc"

  emit("sort-collections", {
    collectionID: props.id,
    sortOrder: currentSortOrder.value,
    collectionRefID: collectionRefID.value ?? "personal",
  })
}

const handleMockServerAction = () => {
  const currentUser = platform.auth.getCurrentUser()

  if (!currentUser) {
    // Show login modal if user is not authenticated
    invokeAction("modals.login.toggle")
    return
  }

  // User is authenticated, proceed with mock server creation
  emit("create-mock-server")
}

const handleDocumentationAction = () => {
  const currentUser = platform.auth.getCurrentUser()

  if (!currentUser) {
    // Show login modal if user is not authenticated
    invokeAction("modals.login.toggle")
    return
  }

  // User is authenticated, proceed with opening documentation
  emit("open-documentation")
}

const resetDragState = () => {
  dragging.value = false
  ordering.value = false
  orderingLastItem.value = false
}
</script>
