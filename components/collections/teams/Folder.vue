<template>
  <div>
    <div>
      <div>
        <ButtonSecondary
          :label="folder.name ? folder.name : folder.title"
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
        <i v-else class="material-icons">folder_open</i>
      </div>
      <tippy ref="options" tabindex="-1" trigger="click" theme="popover" arrow>
        <template #trigger>
          <TabPrimary
            v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
          :label="$t('delete')"
          @click.native="
            confirmRemove = true
            $refs.options.tippy().hide()
          "
        />
      </tippy>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(subFolder, subFolderIndex) in folder.children"
          :key="subFolder.name"
          class="ml-8 border-l border-divider"
        >
          <CollectionsTeamsFolder
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
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-divider"
        >
          <CollectionsTeamsRequest
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
        </li>
      </ul>
      <ul
        v-if="
          (folder.children == undefined || folder.children.length === 0) &&
          (folder.requests == undefined || folder.requests.length === 0)
        "
      >
        <li class="flex ml-8 border-l border-divider">
          <p>
            <i class="material-icons">not_interested</i>
            {{ $t("folder_empty") }}
          </p>
        </li>
      </ul>
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
