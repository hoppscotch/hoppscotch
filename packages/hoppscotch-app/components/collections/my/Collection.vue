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
      @contextmenu.prevent="options.tippy().show()"
    >
      <span
        class="flex items-center justify-center px-4 cursor-pointer"
        @click="toggleShowChildren()"
      >
        <SmartIcon
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
          :name="getCollectionIcon"
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
        <ButtonSecondary
          v-if="doc && !selected"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('import.title')"
          svg="circle"
          color="green"
          @click.native="$emit('select-collection')"
        />
        <ButtonSecondary
          v-if="doc && selected"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.remove')"
          svg="check-circle"
          color="green"
          @click.native="$emit('unselect-collection')"
        />
        <ButtonSecondary
          v-if="!doc"
          v-tippy="{ theme: 'tooltip' }"
          svg="file-plus"
          :title="$t('request.new')"
          class="hidden group-hover:inline-flex"
          @click.native="
            $emit('add-request', {
              path: `${collectionIndex}`,
            })
          "
        />
        <ButtonSecondary
          v-if="!doc"
          v-tippy="{ theme: 'tooltip' }"
          svg="folder-plus"
          :title="$t('folder.new')"
          class="hidden group-hover:inline-flex"
          @click.native="
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
            arrow
            :on-shown="() => tippyActions.focus()"
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.more')"
                svg="more-vertical"
              />
            </template>
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              role="menu"
              @keyup.r="requestAction.$el.click()"
              @keyup.n="folderAction.$el.click()"
              @keyup.e="edit.$el.click()"
              @keyup.delete="deleteAction.$el.click()"
              @keyup.x="exportAction.$el.click()"
              @keyup.escape="options.tippy().hide()"
            >
              <SmartItem
                ref="requestAction"
                svg="file-plus"
                :label="$t('request.new')"
                :shortcut="['R']"
                @click.native="
                  () => {
                    $emit('add-request', {
                      path: `${collectionIndex}`,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="folderAction"
                svg="folder-plus"
                :label="$t('folder.new')"
                :shortcut="['N']"
                @click.native="
                  () => {
                    $emit('add-folder', {
                      folder: collection,
                      path: `${collectionIndex}`,
                    })
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="edit"
                svg="edit"
                :label="$t('action.edit')"
                :shortcut="['E']"
                @click.native="
                  () => {
                    $emit('edit-collection')
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="exportAction"
                svg="download"
                :label="$t('export.title')"
                :shortcut="['X']"
                @click.native="
                  () => {
                    exportCollection()
                    options.tippy().hide()
                  }
                "
              />
              <SmartItem
                ref="deleteAction"
                svg="trash-2"
                :label="$t('action.delete')"
                :shortcut="['⌫']"
                @click.native="
                  () => {
                    removeCollection()
                    options.tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
        </span>
      </div>
    </div>
    <div v-if="showChildren || isFiltered" class="flex">
      <div
        class="bg-dividerLight cursor-nsResize flex ml-5.5 transform transition w-1 hover:bg-dividerDark hover:scale-x-125"
        @click="toggleShowChildren()"
      ></div>
      <div class="flex flex-col flex-1 truncate">
        <CollectionsMyFolder
          v-for="(folder, index) in collection.folders"
          :key="`folder-${index}`"
          :folder="folder"
          :folder-index="index"
          :folder-path="`${collectionIndex}/${index}`"
          :collection-index="collectionIndex"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :is-filtered="isFiltered"
          :picked="picked"
          @add-request="$emit('add-request', $event)"
          @add-folder="$emit('add-folder', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
          @remove-folder="$emit('remove-folder', $event)"
        />
        <CollectionsMyRequest
          v-for="(request, index) in collection.requests"
          :key="`request-${index}`"
          :request="request"
          :collection-index="collectionIndex"
          :folder-index="-1"
          :folder-name="collection.name"
          :folder-path="`${collectionIndex}`"
          :request-index="index"
          :doc="doc"
          :save-request="saveRequest"
          :collections-type="collectionsType"
          :picked="picked"
          @edit-request="$emit('edit-request', $event)"
          @duplicate-request="$emit('duplicate-request', $event)"
          @select="$emit('select', $event)"
          @remove-request="$emit('remove-request', $event)"
        />
        <div
          v-if="
            (collection.folders == undefined ||
              collection.folders.length === 0) &&
            (collection.requests == undefined ||
              collection.requests.length === 0)
          "
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${$colorMode.value}/pack.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
            :alt="`${$t('empty.collection')}`"
          />
          <span class="text-center">
            {{ $t("empty.collection") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { ref, computed } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { moveRESTRequest } from "~/newstore/collections"
import { Team } from "~/helpers/backend/graphql"

const toast = useToast()
const t = useI18n()

type PickedType = {
  pickedType: "my-collection"
  collectionIndex: number
}
type CollectionTypeType =
  | {
      collectionsType: "my-collections"
    }
  | {
      collectionsType: "team-collections"
      team: Team
    }

const props = defineProps<{
  collection: HoppCollection<HoppRESTRequest>
  collectionIndex: number
  collectionsType: CollectionTypeType
  picked: PickedType | null
  doc: boolean
  isFiltered: boolean
  selected: boolean
  saveRequest: boolean
}>()

const emit = defineEmits<{
  (e: "select", v: { picked: PickedType }): void
  (e: "expand-collection", v: typeof props.collection.id): void
  (
    e: "remove-collection",
    v: {
      collectionIndex: number
      collectionID: typeof props.collection.id
    }
  ): void
}>()

const tippyActions = ref<unknown | null>(null)
const options = ref<unknown | null>(null)
const requestAction = ref<unknown | null>(null)
const folderAction = ref<unknown | null>(null)
const edit = ref<unknown | null>(null)
const deleteAction = ref<unknown | null>(null)
const exportAction = ref<unknown | null>(null)

const showChildren = ref(false)
const dragging = ref(false)

const isSelected = computed(
  () =>
    !!props.picked &&
    props.picked.pickedType === "my-collection" &&
    props.picked.collectionIndex === props.collectionIndex
)

const getCollectionIcon = computed(() => {
  if (isSelected.value) return "check-circle"
  else if (!showChildren.value && !props.isFiltered) return "folder"
  else if (showChildren.value || props.isFiltered) return "folder-open"
  else return "folder"
})

const exportCollection = () => {
  const collectionJSON = JSON.stringify(props.collection)
  const file = new Blob([collectionJSON], { type: "application/json" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  a.download = `${props.collection.name}.json`
  document.body.appendChild(a)
  a.click()
  toast.success(t("state.download_started").toString())
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

const toggleShowChildren = () => {
  if (props.saveRequest)
    emit("select", {
      picked: {
        pickedType: "my-collection",
        collectionIndex: props.collectionIndex,
      },
    })

  emit("expand-collection", props.collection.id)
  showChildren.value = !showChildren.value
}

const removeCollection = () => {
  emit("remove-collection", {
    collectionIndex: props.collectionIndex,
    collectionID: props.collection.id,
  })
}

const dropEvent = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    dragging.value = !dragging.value
    const folderPath = dataTransfer.getData("folderPath")
    const requestIndex = dataTransfer.getData("requestIndex")
    moveRESTRequest(
      folderPath,
      Number(requestIndex),
      `${props.collectionIndex}`
    )
  }
}
</script>
