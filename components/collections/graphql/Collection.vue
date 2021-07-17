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
          cursor-pointer
          flex
          text-xs
          w-10
          justify-center
          items-center
          truncate
        "
        @click="toggleShowChildren()"
      >
        <i class="material-icons" :class="{ 'text-green-400': isSelected }">
          {{ getCollectionIcon }}
        </i>
      </span>
      <span
        class="
          cursor-pointer
          flex
          font-semibold
          flex-1
          text-xs
          min-w-0
          py-3
          pr-2
          transition
          group-hover:text-secondaryDark
        "
        @click="toggleShowChildren()"
      >
        <span class="truncate"> {{ collection.name }} </span>
      </span>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        icon="create_new_folder"
        :title="$t('new_folder')"
        class="group-hover:inline-flex hidden"
        @click.native="
          $emit('add-folder', {
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
      <CollectionsGraphqlFolder
        v-for="(folder, index) in collection.folders"
        :key="`folder-${index}`"
        class="border-l border-dividerLight ml-5"
        :picked="picked"
        :saving-mode="savingMode"
        :folder="folder"
        :folder-index="index"
        :folder-path="`${collectionIndex}/${index}`"
        :collection-index="collectionIndex"
        :doc="doc"
        :is-filtered="isFiltered"
        @add-folder="$emit('add-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @edit-request="$emit('edit-request', $event)"
        @select="$emit('select', $event)"
      />
      <CollectionsGraphqlRequest
        v-for="(request, index) in collection.requests"
        :key="`request-${index}`"
        class="border-l border-dividerLight ml-5"
        :picked="picked"
        :saving-mode="savingMode"
        :request="request"
        :collection-index="collectionIndex"
        :folder-index="-1"
        :folder-name="collection.name"
        :folder-path="`${collectionIndex}`"
        :request-index="index"
        :doc="doc"
        @edit-request="$emit('edit-request', $event)"
        @select="$emit('select', $event)"
      />
      <div
        v-if="
          collection.folders.length === 0 && collection.requests.length === 0
        "
        class="
          border-l border-dividerLight
          flex flex-col
          text-secondaryLight
          ml-5
          p-4
          items-center
          justify-center
        "
      >
        <i class="opacity-50 pb-2 material-icons">folder_open</i>
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

<script lang="ts">
import Vue from "vue"
import {
  removeGraphqlCollection,
  moveGraphqlRequest,
} from "~/newstore/collections"

export default Vue.extend({
  props: {
    picked: { type: Object, default: null },
    // Whether the viewing context is related to picking (activates 'select' events)
    savingMode: { type: Boolean, default: false },
    collectionIndex: { type: Number, default: null },
    collection: { type: Object, default: () => {} },
    doc: Boolean,
    isFiltered: Boolean,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
      confirmRemove: false,
    }
  },
  computed: {
    isSelected(): boolean {
      return (
        this.picked &&
        this.picked.pickedType === "gql-my-collection" &&
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
    pick() {
      this.$emit("select", {
        picked: {
          pickedType: "gql-my-collection",
          collectionIndex: this.collectionIndex,
        },
      })
    },
    toggleShowChildren() {
      if (this.savingMode) {
        this.pick()
      }

      this.showChildren = !this.showChildren
    },
    removeCollection() {
      // Cancel pick if picked collection is deleted
      if (
        this.picked &&
        this.picked.pickedType === "gql-my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
      ) {
        this.$emit("select", { picked: null })
      }
      removeGraphqlCollection(this.collectionIndex)

      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
    dropEvent({ dataTransfer }: any) {
      this.dragging = !this.dragging

      const folderPath = dataTransfer.getData("folderPath")
      const requestIndex = dataTransfer.getData("requestIndex")

      moveGraphqlRequest(folderPath, requestIndex, `${this.collectionIndex}`)
    },
  },
})
</script>
