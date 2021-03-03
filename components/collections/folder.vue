<template>
  <div>
    <div
      :class="['row-wrapper', dragging ? 'drop-zone' : '']"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
      @click="$emit('select-folder', '')"
    >
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
          <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
          <i class="material-icons">folder_open</i>
          <span>{{ folder.name ? folder.name : folder.title }}</span>
        </button>
      </div>
      <v-popover v-if="!saveRequest">
        <button class="tooltip-target icon" v-tooltip.left="$t('more')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              class="icon"
              @click="$emit('add-folder', { folder, path: folderPath })"
              v-close-popover
            >
              <i class="material-icons">create_new_folder</i>
              <span>{{ $t("new_folder") }}</span>
            </button>
          </div>
          <div>
            <button
              class="icon"
              @click="$emit('edit-folder', { folder, folderIndex, collectionIndex })"
              v-close-popover
            >
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button class="icon" @click="confirmRemove = true" v-close-popover>
              <i class="material-icons">delete</i>
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col" v-if="!saveRequest">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-brdColor"
        >
          <request
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :folder-name="folder.name"
            :request-index="index"
            :doc="doc"
            @edit-request="$emit('edit-request', $event)"
          />
        </li>
      </ul>
      <ul v-if="folder.folders && folder.folders.length" class="flex-col">
        <li
          v-for="(subFolder, subFolderIndex) in folder.folders"
          :key="subFolder.name"
          class="ml-8 border-l border-brdColor"
        >
          <folder
            :folder="subFolder"
            :folder-index="subFolderIndex"
            :collection-index="collectionIndex"
            :doc="doc"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            :folder-path="`${folderPath}/${subFolderIndex}`"
            @add-folder="$emit('add-folder', $event)"
            @edit-folder="$emit('edit-folder', $event)"
            @edit-request="$emit('edit-request', $event)"
            @update-team-collections="$emit('update-team-collections')"
            @select-folder="$emit('select-folder', subFolder.name + '/' + $event)"
          />
        </li>
      </ul>
      <ul
        v-if="
          folder.folders &&
          folder.folders.length === 0 &&
          folder.requests &&
          folder.requests.length === 0
        "
      >
        <li class="flex ml-8 border-l border-brdColor">
          <p class="info"><i class="material-icons">not_interested</i> {{ $t("folder_empty") }}</p>
        </li>
      </ul>
    </div>
    <confirm-modal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_folder')"
      @hide-modal="confirmRemove = false"
      @resolve="removeFolder"
    />
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import gql from "graphql-tag"
import team_utils from "~/helpers/teams/utils"

export default {
  name: "folder",
  props: {
    folder: Object,
    folderIndex: Number,
    collectionIndex: Number,
    folderPath: String,
    doc: Boolean,
    saveRequest: Boolean,
    isFiltered: Boolean,
    collectionsType: Object,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      confirmRemove: false,
    }
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    toggleShowChildren() {
      this.showChildren = !this.showChildren
      if (
        this.showChildren &&
        this.collectionsType.type == "team-collections" &&
        this.folder.folders == undefined
      ) {
        team_utils
          .getCollectionChildren(this.$apollo, this.folder.id)
          .then((children) => {
            this.$set(this.folder, "folders", children)
          })
          .catch((error) => {
            console.log(error)
          })
      }
      if (
        this.showChildren &&
        this.collectionsType.type == "team-collections" &&
        this.folder.requests == undefined
      ) {
        team_utils
          .getCollectionRequests(this.$apollo, this.folder.id)
          .then((requests) => {
            console.log(requests)
            this.$set(this.folder, "requests", requests)
          })
          .catch((error) => {
            console.log(error)
          })
      }
    },
    removeFolder() {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/removeFolder", {
          collectionIndex: this.$props.collectionIndex,
          folderName: this.$props.folder.name,
          folderIndex: this.$props.folderIndex,
        })
        this.syncCollections()
        this.$toast.error(this.$t("deleted"), {
          icon: "delete",
        })
      } else if (this.collectionsType.type == "team-collections") {
        if (this.collectionsType.selectedTeam.myRole != "VIEWER") {
          team_utils
            .deleteCollection(this.$apollo, this.folder.id)
            .then((data) => {
              // Result
              this.$toast.success(this.$t("deleted"), {
                icon: "delete",
              })
              console.log(data)
              this.$emit("update-team-collections")
              this.confirmRemove = false
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
      }
    },
    dropEvent({ dataTransfer }) {
      this.dragging = !this.dragging
      const oldCollectionIndex = dataTransfer.getData("oldCollectionIndex")
      const oldFolderIndex = dataTransfer.getData("oldFolderIndex")
      const oldFolderName = dataTransfer.getData("oldFolderName")
      const requestIndex = dataTransfer.getData("requestIndex")

      this.$store.commit("postwoman/moveRequest", {
        oldCollectionIndex,
        newCollectionIndex: this.$props.collectionIndex,
        newFolderIndex: this.$props.folderIndex,
        newFolderName: this.$props.folder.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
      })
      this.syncCollections()
    },
  },
}
</script>
