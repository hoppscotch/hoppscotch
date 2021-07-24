<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
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
        <span class="truncate"> {{ collection.title }} </span>
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
        v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
        v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          icon="create"
          :label="$t('edit')"
          @click.native="
            $emit('edit-collection')
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
      <CollectionsTeamsFolder
        v-for="(folder, index) in collection.children"
        :key="`folder-${folder}`"
        class="border-l border-dividerLight ml-5"
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
      <CollectionsTeamsRequest
        v-for="(request, index) in collection.requests"
        :key="`request-${index}`"
        class="border-l border-dividerLight ml-5"
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
      <div
        v-if="
          (collection.children == undefined ||
            collection.children.length === 0) &&
          (collection.requests == undefined || collection.requests.length === 0)
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
        <i class="opacity-75 pb-2 material-icons">folder_open</i>
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
