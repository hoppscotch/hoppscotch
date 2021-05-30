<template>
  <div>
    <div
      :class="[
        'row-wrapper transition duration-150 ease-in-out',
        { 'bg-bgDarkColor': dragging },
      ]"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <button class="icon" @click="toggleShowChildren">
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
        <span>{{ collection.name }}</span>
      </button>
      <div>
        <button
          v-if="doc"
          v-tooltip.left="$t('import')"
          class="icon"
          @click="$emit('select-collection')"
        >
          <i class="material-icons">topic</i>
        </button>
        <v-popover v-if="!savingMode">
          <button v-tooltip.left="$t('more')" class="tooltip-target icon">
            <i class="material-icons">more_vert</i>
          </button>
          <template slot="popover">
            <div>
              <button
                v-close-popover
                class="icon"
                @click="
                  $emit('add-folder', {
                    path: `${collectionIndex}`,
                  })
                "
              >
                <i class="material-icons">create_new_folder</i>
                <span>{{ $t("new_folder") }}</span>
              </button>
            </div>
            <div>
              <button
                v-close-popover
                class="icon"
                @click="$emit('edit-collection')"
              >
                <i class="material-icons">create</i>
                <span>{{ $t("edit") }}</span>
              </button>
            </div>
            <div>
              <button
                v-close-popover
                class="icon"
                @click="confirmRemove = true"
              >
                <i class="material-icons">delete</i>
                <span>{{ $t("delete") }}</span>
              </button>
            </div>
          </template>
        </v-popover>
      </div>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(folder, index) in collection.folders"
          :key="folder.name"
          class="ml-8 border-l border-brdColor"
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
          class="ml-8 border-l border-brdColor"
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
          class="flex ml-8 border-l border-brdColor"
        >
          <p class="info">
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
import { removeGraphqlCollection } from "~/newstore/collections"

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
      return this.picked &&
        this.picked.pickedType === "gql-my-collection" &&
        this.picked.collectionIndex === this.collectionIndex
    }
  },
  methods: {
    pick() {
      this.$emit("select", {
        picked: {
          pickedType: "gql-my-collection",
          collectionIndex: this.collectionIndex
        }
      })
    },
    toggleShowChildren() {
      if (this.savingMode) {
        this.pick()
      }

      this.showChildren = !this.showChildren
    },
    removeCollection() {
      removeGraphqlCollection(this.collectionIndex)

      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
    dropEvent({ dataTransfer }: any) {
      this.dragging = !this.dragging

      // TODO: Fix this

      const oldCollectionIndex = dataTransfer.getData("oldCollectionIndex")
      const oldFolderIndex = dataTransfer.getData("oldFolderIndex")
      const oldFolderName = dataTransfer.getData("oldFolderName")
      const requestIndex = dataTransfer.getData("requestIndex")
      const flag = "graphql"

      this.$store.commit("postwoman/moveRequest", {
        oldCollectionIndex,
        newCollectionIndex: this.$props.collectionIndex,
        newFolderIndex: -1,
        newFolderName: this.$props.collection.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
        flag,
      })
      // this.syncCollections()
    },
  },
})
</script>
