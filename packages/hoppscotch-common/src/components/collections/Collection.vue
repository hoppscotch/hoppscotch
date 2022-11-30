<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-stretch group"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @contextmenu.prevent="options?.tippy.show()"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <component
          :is="getCollectionIcon"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
        />
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ getCollectionName }}
        </span>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFilePlus"
          :title="t('request.new')"
          class="hidden group-hover:inline-flex"
          @click="
            $emit('add-request', {
              path: `${collectionIndex}`,
            })
          "
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFolderPlus"
          :title="t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click="
            $emit('add-folder', {
              folder: collection,
              path: `${collectionIndex}`,
            })
          "
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => tippyActions!.focus()"
          >
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.more')"
              :icon="IconMoreVertical"
            />
            <template #content="{ hide }">
              <div
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.r="requestAction?.click()"
                @keyup.n="folderAction?.click()"
                @keyup.e="edit?.click()"
                @keyup.delete="deleteAction?.click()"
                @keyup.x="exportAction?.click()"
                @keyup.escape="hide()"
              >
                <SmartItem
                  ref="requestAction"
                  :icon="IconFilePlus"
                  :label="t('request.new')"
                  :shortcut="['R']"
                  @click="
                    () => {
                      $emit('add-request')
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="folderAction"
                  :icon="IconFolderPlus"
                  :label="t('folder.new')"
                  :shortcut="['N']"
                  @click="
                    () => {
                      $emit('add-folder')
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="t('action.edit')"
                  :shortcut="['E']"
                  @click="
                    () => {
                      $emit('edit-collection')
                      hide()
                    }
                  "
                />
                <SmartItem
                  ref="exportAction"
                  :icon="IconDownload"
                  :label="t('export.title')"
                  :shortcut="['X']"
                  :loading="exportLoading"
                  @click="
                    () => {
                      exportCollection()
                      collectionsType.type === 'my-collections' ? hide() : null
                    }
                  "
                />
                <SmartItem
                  ref="deleteAction"
                  :icon="IconTrash2"
                  :label="t('action.delete')"
                  :shortcut="['⌫']"
                  @click="
                    () => {
                      removeCollection()
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
</template>

<script setup lang="ts">
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFilePlus from "~icons/lucide/file-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import { useI18n } from "@composables/i18n"
import { ref, computed, watch, PropType } from "vue"
import { moveRESTRequest } from "~/newstore/collections"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import SmartItem from "@components/smart/Item.vue"
import { TippyComponent } from "vue-tippy"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { Team } from "~/helpers/backend/graphql"

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: Team
    }
  | { type: "my-collections"; selectedTeam: undefined }

type Picked =
  | {
      pickedType: "my-request"
      folderPath: string
      requestIndex: number
    }
  | {
      pickedType: "my-folder"
      folderPath: string
    }
  | {
      pickedType: "my-collection"
      collectionIndex: number
    }
  | {
      pickedType: "teams-request"
      requestID: string
    }
  | {
      pickedType: "teams-folder"
      folderID: string
    }
  | {
      pickedType: "teams-collection"
      collectionID: string
    }

const t = useI18n()

const props = defineProps({
  collection: {
    type: Object as PropType<HoppCollection<HoppRESTRequest> | TeamCollection>,
    required: true,
  },
  collectionIndex: {
    type: Number,
    required: true,
  },
  isFiltered: {
    type: Boolean,
    required: true,
  },
  saveRequest: {
    type: Boolean,
    required: true,
  },
  collectionsType: {
    type: Object as PropType<CollectionType>,
    required: true,
  },
  picked: {
    type: Object as PropType<Picked>,
    required: true,
  },
  isOpen: {
    type: Boolean,
    required: true,
  },
  toggleChildren: {
    type: Function as PropType<() => void>,
    required: true,
  },
  exportLoading: {
    type: Boolean,
    required: true,
  },
})

const emit = defineEmits<{
  (event: "select-collection"): void
  (event: "unselect-collection"): void
  (event: "select", payload: any): void
  (event: "add-request"): void
  (event: "add-folder"): void
  (event: "remove-collection"): void
  (event: "edit-collection"): void
  (event: "toggle-children"): void
  (event: "export-data"): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const requestAction = ref<typeof SmartItem | null>(null)
const folderAction = ref<typeof SmartItem | null>(null)
const edit = ref<typeof SmartItem | null>(null)
const deleteAction = ref<typeof SmartItem | null>(null)
const exportAction = ref<typeof SmartItem | null>(null)
const options = ref<TippyComponent | null>(null)

const dragging = ref(false)

const isSelected = computed(() => {
  if (props.collectionsType.type === "my-collections") {
    return (
      props.picked &&
      props.picked.pickedType === "my-collection" &&
      props.picked.collectionIndex === props.collectionIndex
    )
  } else {
    return (
      props.picked &&
      props.picked.pickedType === "teams-collection" &&
      props.picked.collectionID === props.collection.id
    )
  }
})

const getCollectionIcon = computed(() => {
  if (isSelected.value) return IconCheckCircle
  else if (!props.isOpen && !props.isFiltered) return IconFolder
  else if (props.isOpen || props.isFiltered) return IconFolderOpen
  else return IconFolder
})

const getCollectionName = computed(() => {
  if (props.collection.name) {
    return props.collection.name
  } else {
    return props.collection.title
  }
})

watch(
  () => props.exportLoading,
  (val) => {
    if (!val) {
      options.value!.tippy.hide()
    }
  }
)

const exportCollection = () => {
  emit("export-data")
}

const toggleShowChildren = () => {
  if (props.saveRequest) {
    if (props.collectionsType.type === "my-collections") {
      emit("select", {
        picked: {
          pickedType: "my-collection",
          collectionIndex: props.collectionIndex,
        },
      })
    } else {
      emit("select", {
        picked: {
          pickedType: "teams-collection",
          collectionID: props.collection.id,
        },
      })
    }
  }
  emit("toggle-children")
}

const removeCollection = () => {
  emit("remove-collection")
}

const dropEvent = ({ dataTransfer }: any) => {
  dragging.value = !dragging.value
  const folderPath = dataTransfer.getData("folderPath")
  const requestIndex = dataTransfer.getData("requestIndex")
  moveRESTRequest(folderPath, requestIndex, `${props.collectionIndex}`)
}
</script>
