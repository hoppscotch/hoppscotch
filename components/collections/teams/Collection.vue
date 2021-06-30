<template>
  <div>
    <div class="transition duration-150 ease-in-out row-wrapper">
      <button class="icon button" @click="toggleShowChildren">
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
        <span>{{ collection.title }}</span>
      </button>
      <div>
        <button
          v-if="doc && !selected"
          v-tooltip.left="$t('import')"
          class="icon button"
          @click="$emit('select-collection')"
        >
          <i class="material-icons">check_box_outline_blank</i>
        </button>
        <button
          v-if="doc && selected"
          v-tooltip.left="$t('delete')"
          class="icon button"
          @click="$emit('unselect-collection')"
        >
          <i class="material-icons">check_box</i>
        </button>
        <v-popover>
          <button
            v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
            v-tooltip.left="$t('more')"
            class="tooltip-target icon button"
          >
            <i class="material-icons">more_vert</i>
          </button>
          <template #popover>
            <div>
              <button
                v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
                v-close-popover
                class="icon button"
                @click="
                  $emit('add-folder', {
                    folder: collection,
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
                v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
                v-close-popover
                class="icon button"
                @click="$emit('edit-collection')"
              >
                <i class="material-icons">create</i>
                <span>{{ $t("edit") }}</span>
              </button>
            </div>
            <div>
              <button
                v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
                v-close-popover
                class="icon button"
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
          v-for="(folder, index) in collection.children"
          :key="folder.title"
          class="ml-8 border-l border-divider"
        >
          <CollectionsTeamsFolder
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
            @expand-collection="expandCollection"
            @remove-request="removeRequest"
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in collection.requests"
          :key="index"
          class="ml-8 border-l border-divider"
        >
          <CollectionsTeamsRequest
            :request="request.request"
            :collection-index="collectionIndex"
            :folder-index="-1"
            :folder-name="collection.name"
            :request-index="request.id"
            :doc="doc"
            :save-request="saveRequest"
            :collections-type="collectionsType"
            :picked="picked"
            @edit-request="editRequest($event)"
            @select="$emit('select', $event)"
            @remove-request="removeRequest"
          />
        </li>
      </ul>
      <ul>
        <li
          v-if="
            (collection.children == undefined ||
              collection.children.length === 0) &&
            (collection.requests == undefined ||
              collection.requests.length === 0)
          "
          class="flex ml-8 border-l border-divider"
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

<script>
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
        this.picked.pickedType === "teams-collection" &&
        this.picked.collectionID === this.collection.id
      )
    },
  },
  methods: {
    editRequest(event) {
      this.$emit("edit-request", event)
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-collection",
            collectionID: this.collection.id,
          },
        })
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-collection",
            collectionID: this.collection.id,
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
      this.confirmRemove = false
    },
    expandCollection(collectionID) {
      this.$emit("expand-collection", collectionID)
    },
    removeRequest({ collectionIndex, folderName, requestIndex }) {
      this.$emit("remove-request", {
        collectionIndex,
        folderName,
        requestIndex,
      })
    },
  },
}
</script>
