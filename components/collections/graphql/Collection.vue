<template>
  <div>
    <div
      :class="[{ 'bg-primaryDark': dragging }]"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <ButtonSecondary
        :label="collection.name"
        @click.native="toggleShowChildren"
      />
      <i v-show="!showChildren && !isFiltered" class="material-icons"
        >arrow_right</i
      >
      <i v-show="showChildren || isFiltered" class="material-icons"
        >arrow_drop_down</i
      >
      <i v-if="isSelected" class="mx-3 text-green-400 material-icons"
        >check_circle</i
      >
      <i v-else class="material-icons">folder</i>
      <div>
        <ButtonSecondary
          v-if="doc"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('import')"
          icon="topic"
          @click.native="$emit('select-collection')"
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
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(folder, index) in collection.folders"
          :key="folder.name"
          class="ml-5 border-l border-dividerLight"
        >
          <CollectionsGraphqlFolder
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
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in collection.requests"
          :key="index"
          class="ml-5 border-l border-dividerLight"
        >
          <CollectionsGraphqlRequest
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
        </li>
      </ul>
      <ul>
        <li
          v-if="
            collection.folders.length === 0 && collection.requests.length === 0
          "
          class="
            ml-5
            border-l border-dividerLight
            ml-5
            border-l border-dividerLight
          "
        >
          <p>
            <i class="material-icons">not_interested</i>
            {{ $t("collection_empty") }}
          </p>
        </li>
      </ul>
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
