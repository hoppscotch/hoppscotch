<template>
  <div class="flex flex-col" :class="[{ 'bg-primaryLight': dragging }]">
    <div
      class="flex items-center group"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <span
        class="
          flex
          justify-center
          items-center
          text-xs
          w-10
          truncate
          cursor-pointer
        "
        @click="toggleShowChildren()"
      >
        <i class="material-icons" :class="{ 'text-green-400': isSelected }">
          {{ getCollectionIcon }}
        </i>
      </span>
      <span
        class="
          py-3
          cursor-pointer
          pr-2
          flex flex-1
          min-w-0
          text-xs
          group-hover:text-secondaryDark
          transition
          font-semibold
        "
        @click="toggleShowChildren()"
      >
        <span class="truncate"> {{ collection.name }} </span>
      </span>
      <ButtonSecondary
        v-if="doc && !selected"
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('import')"
        icon="check_box_outline_blank"
        @click.native="$emit('select-collection')"
      />
      <ButtonSecondary
        v-if="doc && selected"
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('delete')"
        icon="check_box"
        @click.native="$emit('unselect-collection')"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        icon="create_new_folder"
        :title="$t('new_folder')"
        class="group-hover:inline-flex hidden"
        @click.native="
          $emit('add-folder', {
            folder: collection,
            path: `${collectionIndex}`,
          })
        "
      />
      <tippy
        ref="options"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('more')"
            icon="more_vert"
          />
        </template>
        <SmartItem
          icon="create_new_folder"
          :label="$t('new_folder')"
          @click.native="
            $emit('add-folder', {
              folder: collection,
              path: `${collectionIndex}`,
            })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="create"
          :label="$t('edit')"
          @click.native="
            $emit('edit-collection')
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          icon="delete"
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <div v-show="showChildren || isFiltered">
      <CollectionsMyFolder
        v-for="(folder, index) in collection.folders"
        :key="`folder-${index}`"
        class="ml-5 border-l border-dividerLight"
        :folder="folder"
        :folder-index="index"
        :folder-path="`${collectionIndex}/${index}`"
        :collection-index="collectionIndex"
        :doc="doc"
        :save-request="saveRequest"
        :collections-type="collectionsType"
        :is-filtered="isFiltered"
        :picked="picked"
        @add-folder="$emit('add-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @edit-request="$emit('edit-request', $event)"
        @select="$emit('select', $event)"
        @remove-request="$emit('remove-request', $event)"
      />
      <CollectionsMyRequest
        v-for="(request, index) in collection.requests"
        :key="`request-${index}`"
        class="ml-5 border-l border-dividerLight"
        :request="request"
        :collection-index="collectionIndex"
        :folder-index="-1"
        :folder-name="collection.name"
        :folder-path="collectionIndex.toString()"
        :request-index="index"
        :doc="doc"
        :save-request="saveRequest"
        :collections-type="collectionsType"
        :picked="picked"
        @edit-request="editRequest($event)"
        @select="$emit('select', $event)"
        @remove-request="$emit('remove-request', $event)"
      />
      <div
        v-if="
          (collection.folders == undefined ||
            collection.folders.length === 0) &&
          (collection.requests == undefined || collection.requests.length === 0)
        "
        class="
          flex
          items-center
          text-secondaryLight
          flex-col
          p-4
          justify-center
          ml-5
          border-l border-dividerLight
        "
      >
        <i class="material-icons opacity-50 pb-2">folder_open</i>
        <span class="text-xs text-center">
          {{ $t("collection_empty") }}
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_collection')"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script>
import { moveRESTRequest } from "~/newstore/collections"

export default {
  props: {
    collectionIndex: { type: Number, default: null },
    collection: { type: Object, default: () => {} },
    doc: Boolean,
    isFiltered: Boolean,
    selected: Boolean,
    saveRequest: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
      pageNo: 0,
    }
  },
  computed: {
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
      )
    },
    getCollectionIcon() {
      if (this.isSelected) return "check_circle"
      else if (!this.showChildren && !this.isFiltered) return "arrow_right"
      else if (this.showChildren || this.isFiltered) return "arrow_drop_down"
      else return "folder"
    },
  },
  methods: {
    editRequest(event) {
      this.$emit("edit-request", event)
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "my-collection",
            collectionIndex: this.collectionIndex,
          },
        })

      this.$emit("expand-collection", this.collection.id)
      this.showChildren = !this.showChildren
    },
    removeCollection() {
      this.$emit("remove-collection", {
        collectionsType: this.collectionsType,
        collectionIndex: this.collectionIndex,
        collectionID: this.collection.id,
      })
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")
      moveRESTRequest(folderPath, requestIndex, this.collectionIndex.toString())
    },
  },
}
</script>
