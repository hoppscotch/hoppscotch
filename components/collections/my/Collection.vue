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
      <i v-if="isSelected" class="text-green-400 material-icons"
        >check_circle</i
      >
      <i v-else class="material-icons">folder</i>
      <div>
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
        <tippy
          ref="options"
          tabindex="-1"
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <TabPrimary
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
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(folder, index) in collection.folders"
          :key="index"
          class="ml-8 border-l border-divider"
        >
          <CollectionsMyFolder
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
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in collection.requests"
          :key="index"
          class="ml-8 border-l border-divider"
        >
          <CollectionsMyRequest
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
        </li>
      </ul>
      <ul>
        <li
          v-if="
            (collection.folders == undefined ||
              collection.folders.length === 0) &&
            (collection.requests == undefined ||
              collection.requests.length === 0)
          "
          class="flex ml-8 border-l border-divider"
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
