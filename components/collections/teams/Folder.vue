<template>
  <div class="flex flex-col">
    <div class="flex items-center group">
      <span
        class="cursor-pointer flex w-10 justify-center items-center truncate"
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
          min-w-0
          py-2
          pr-2
          transition
          group-hover:text-secondaryDark
        "
        @click="toggleShowChildren()"
      >
        <span class="truncate">
          {{ folder.name ? folder.name : folder.title }}
        </span>
      </span>
      <ButtonSecondary
        v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
        v-tippy="{ theme: 'tooltip' }"
        icon="create_new_folder"
        :title="$t('new_folder')"
        class="group-hover:inline-flex hidden"
        @click.native="$emit('add-folder', { folder, path: folderPath })"
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
            $emit('add-folder', { folder, path: folderPath })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          icon="edit"
          :label="$t('edit')"
          @click.native="
            $emit('edit-folder', {
              folder,
              folderIndex,
              collectionIndex,
              folderPath: '',
            })
            $refs.options.tippy().hide()
          "
        />
        <SmartItem
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          icon="delete"
          color="red"
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <div v-if="showChildren || isFiltered">
      <CollectionsTeamsFolder
        v-for="(subFolder, subFolderIndex) in folder.children"
        :key="`subFolder-${subFolderIndex}`"
        class="border-l border-dividerLight ml-5"
        :folder="subFolder"
        :folder-index="subFolderIndex"
        :collection-index="collectionIndex"
        :doc="doc"
        :save-request="saveRequest"
        :collections-type="collectionsType"
        :folder-path="`${folderPath}/${subFolderIndex}`"
        :picked="picked"
        @add-folder="$emit('add-folder', $event)"
        @edit-folder="$emit('edit-folder', $event)"
        @edit-request="$emit('edit-request', $event)"
        @update-team-collections="$emit('update-team-collections')"
        @select="$emit('select', $event)"
        @expand-collection="expandCollection"
        @remove-request="removeRequest"
      />
      <CollectionsTeamsRequest
        v-for="(request, index) in folder.requests"
        :key="`request-${index}`"
        class="border-l border-dividerLight ml-5"
        :request="request.request"
        :collection-index="collectionIndex"
        :folder-index="folderIndex"
        :folder-name="folder.name"
        :request-index="request.id"
        :doc="doc"
        :save-request="saveRequest"
        :collections-type="collectionsType"
        :picked="picked"
        @edit-request="$emit('edit-request', $event)"
        @select="$emit('select', $event)"
        @remove-request="removeRequest"
      />
      <div
        v-if="
          (folder.children == undefined || folder.children.length === 0) &&
          (folder.requests == undefined || folder.requests.length === 0)
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
        <span class="text-center">
          {{ $t("folder_empty") }}
        </span>
      </div>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_folder')"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script>
import * as teamUtils from "~/helpers/teams/utils"

export default {
  name: "Folder",
  props: {
    folder: { type: Object, default: () => {} },
    folderIndex: { type: Number, default: null },
    collectionIndex: { type: Number, default: null },
    folderPath: { type: String, default: null },
    doc: Boolean,
    saveRequest: Boolean,
    isFiltered: Boolean,
    collectionsType: { type: Object, default: () => {} },
    picked: { type: Object, default: () => {} },
  },
  data() {
    return {
      showChildren: false,
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
    }
  },
  computed: {
    isSelected() {
      return (
        this.picked &&
        this.picked.pickedType === "teams-folder" &&
        this.picked.folderID === this.folder.id
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
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select", {
          picked: {
            pickedType: "teams-folder",
            folderID: this.folder.id,
          },
        })

      this.$emit("expand-collection", this.$props.folder.id)
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      if (this.collectionsType.selectedTeam.myRole !== "VIEWER") {
        // Cancel pick if picked collection folder was deleted
        if (
          this.picked &&
          this.picked.pickedType === "teams-folder" &&
          this.picked.folderID === this.folder.id
        ) {
          this.$emit("select", { picked: null })
        }

        teamUtils
          .deleteCollection(this.$apollo, this.folder.id)
          .then(() => {
            // Result
            this.$toast.success(this.$t("deleted"), {
              icon: "delete",
            })
            this.$emit("update-team-collections")
          })
          .catch((error) => {
            // Error
            this.$toast.error(this.$t("error_occurred"), {
              icon: "done",
            })
            console.error(error)
          })
        this.$emit("update-team-collections")
      }
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
