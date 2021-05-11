<template>
  <div>
    <div class="transition duration-150 ease-in-out row-wrapper">
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
          <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
          <i class="material-icons">folder_open</i>
          <span>{{ folder.name ? folder.name : folder.title }}</span>
        </button>
      </div>
      <v-popover v-if="!saveRequest">
        <button
          v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
          class="tooltip-target icon"
          v-tooltip.left="$t('more')"
        >
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
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
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
              class="icon"
              @click="$emit('edit-folder', { folder, folderIndex, collectionIndex })"
              v-close-popover
            >
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button
              v-if="collectionsType.selectedTeam.myRole !== 'VIEWER'"
              class="icon"
              @click="confirmRemove = true"
              v-close-popover
            >
              <i class="material-icons">delete</i>
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(subFolder, subFolderIndex) in folder.children"
          :key="subFolder.name"
          class="ml-8 border-l border-brdColor"
        >
          <CollectionsTeamsFolder
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
            @select-folder="
              $emit('select-folder', {
                name: subFolder.name + '/' + $event.name,
                id: subFolder.id,
                reqIdx: $event.reqIdx,
              })
            "
            @expand-collection="expandCollection"
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-brdColor"
        >
          <CollectionsRequest
            :request="JSON.parse(request.request)"
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :folder-name="folder.name"
            :request-index="request.id"
            :doc="doc"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            @edit-request="$emit('edit-request', $event)"
            @select-request="
              $emit('select-folder', {
                name: $event.name,
                id: folder.id,
                reqIdx: $event.idx,
              })
            "
          />
        </li>
      </ul>
      <ul
        v-if="
          (folder.children == undefined || folder.children.length === 0) &&
          (folder.requests == undefined || folder.requests.length === 0)
        "
      >
        <li class="flex ml-8 border-l border-brdColor">
          <p class="info"><i class="material-icons">not_interested</i> {{ $t("folder_empty") }}</p>
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
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import * as team_utils from "~/helpers/teams/utils"
import gql from "graphql-tag"

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
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
      }
    },
    toggleShowChildren() {
      if (this.$props.saveRequest)
        this.$emit("select-folder", { name: "", id: this.$props.folder.id, reqIdx: "" })

      this.$emit("expand-collection", this.$props.folder.id)
      this.showChildren = !this.showChildren
    },
    removeFolder() {
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
    },
    expandCollection(collectionID) {
      this.$emit("expand-collection", collectionID)
    },
  },
}
</script>
