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
      @contextmenu.prevent="options.tippy.show()"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <component
          :is="collectionIcon"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
        />
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        @click="toggleShowChildren()"
      >
        <span class="truncate" :class="{ 'text-accent': isSelected }">
          {{ collection.name }}
        </span>
      </span>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFilePlus"
          :title="t('request.new')"
          class="hidden group-hover:inline-flex"
          @click="
            emit('add-request', {
              path: `${collectionIndex}`,
            })
          "
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconFolderPlus"
          :title="t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click="
            emit('add-folder', {
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
            :on-shown="() => tippyActions.focus()"
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
                @keyup.r="requestAction.$el.click()"
                @keyup.n="folderAction.$el.click()"
                @keyup.e="edit.$el.click()"
                @keyup.delete="deleteAction.$el.click()"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  ref="requestAction"
                  :icon="IconFilePlus"
                  :label="`${t('request.new')}`"
                  :shortcut="['R']"
                  @click="
                    () => {
                      $emit('add-request', {
                        path: `${collectionIndex}`,
                      })
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="folderAction"
                  :icon="IconFolderPlus"
                  :label="`${t('folder.new')}`"
                  :shortcut="['N']"
                  @click="
                    () => {
                      emit('add-folder', {
                        path: `${collectionIndex}`,
                      })
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="`${t('action.edit')}`"
                  :shortcut="['E']"
                  @click="
                    () => {
                      emit('edit-collection')
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="deleteAction"
                  :icon="IconTrash2"
                  :label="`${t('action.delete')}`"
                  :shortcut="['⌫']"
                  @click="
                    () => {
                      confirmRemove = true
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
    <div v-if="showChildren || isFiltered" class="flex">
      <div
        class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-0.5 hover:bg-dividerDark hover:scale-x-125"
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsGraphqlFolder
          v-for="(folder, index) in collection.folders"
          :key="`folder-${String(index)}`"
          :picked="picked"
          :save-request="saveRequest"
          :folder="folder"
          :folder-index="index"
          :folder-path="`${collectionIndex}/${String(index)}`"
          :collection-index="collectionIndex"
          :is-filtered="isFiltered"
          @add-request="$emit('add-request', $event)"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
        />
        <CollectionsGraphqlRequest
          v-for="(request, index) in collection.requests"
          :key="`request-${String(index)}`"
          :picked="picked"
          :save-request="saveRequest"
          :request="request"
          :collection-index="collectionIndex"
          :folder-index="-1"
          :folder-name="collection.name"
          :folder-path="`${collectionIndex}`"
          :request-index="index"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
        />
        <div
          v-if="
            collection.folders.length === 0 && collection.requests.length === 0
          "
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            :alt="`${t('empty.collection')}`"
          />
          <span class="pb-4 text-center">
            {{ t("empty.collection") }}
          </span>
          <HoppButtonSecondary
            :label="t('add.new')"
            filled
            outline
            @click="
              emit('add-folder', {
                path: `${collectionIndex}`,
              })
            "
          />
        </div>
      </div>
    </div>
    <HoppSmartConfirmModal
      :show="confirmRemove"
      :title="`${t('confirm.remove_collection')}`"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import IconFilePlus from "~icons/lucide/file-plus"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import {
  removeGraphqlCollection,
  moveGraphqlRequest,
} from "~/newstore/collections"
import { Picked } from "~/helpers/types/HoppPicked"

const props = defineProps({
  picked: { type: Object, default: null },
  // Whether the viewing context is related to picking (activates 'select' events)
  saveRequest: { type: Boolean, default: false },
  collectionIndex: { type: Number, default: null },
  collection: { type: Object, default: () => ({}) },
  isFiltered: Boolean,
})

const colorMode = useColorMode()
const toast = useToast()
const t = useI18n()

// TODO: improve types plz
const emit = defineEmits<{
  (e: "select", i: Picked | null): void
  (e: "edit-request", i: any): void
  (e: "duplicate-request", i: any): void
  (e: "add-request", i: any): void
  (e: "add-folder", i: any): void
  (e: "edit-folder", i: any): void
  (e: "edit-collection"): void
}>()

// Template refs
const tippyActions = ref<any | null>(null)
const options = ref<any | null>(null)
const requestAction = ref<any | null>(null)
const folderAction = ref<any | null>(null)
const edit = ref<any | null>(null)
const deleteAction = ref<any | null>(null)

const showChildren = ref(false)
const dragging = ref(false)

const confirmRemove = ref(false)

const isSelected = computed(
  () =>
    props.picked?.pickedType === "gql-my-collection" &&
    props.picked?.collectionIndex === props.collectionIndex
)
const collectionIcon = computed(() => {
  if (isSelected.value) return IconCheckCircle
  else if (!showChildren.value && !props.isFiltered) return IconFolder
  else if (!showChildren.value || props.isFiltered) return IconFolderOpen
  else return IconFolder
})

const pick = () => {
  emit("select", {
    pickedType: "gql-my-collection",
    collectionIndex: props.collectionIndex,
  })
}

const toggleShowChildren = () => {
  if (props.saveRequest) {
    pick()
  }

  showChildren.value = !showChildren.value
}

const removeCollection = () => {
  // Cancel pick if picked collection is deleted
  if (
    props.picked?.pickedType === "gql-my-collection" &&
    props.picked?.collectionIndex === props.collectionIndex
  ) {
    emit("select", null)
  }
  removeGraphqlCollection(props.collectionIndex)
  toast.success(`${t("state.deleted")}`)
}

const dropEvent = ({ dataTransfer }: any) => {
  dragging.value = !dragging.value
  const folderPath = dataTransfer.getData("folderPath")
  const requestIndex = dataTransfer.getData("requestIndex")
  moveGraphqlRequest(folderPath, requestIndex, `${props.collectionIndex}`)
}
</script>
