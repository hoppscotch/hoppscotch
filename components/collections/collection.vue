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
      <button class="icon" @click="toggleShowChildren">
        <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
        <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
        <i class="material-icons">folder</i>
        <span>{{ collection.name ? collection.name : collection.title }}</span>
      </button>
      <div>
        <button
          v-if="doc"
          class="icon"
          @click="$emit('select-collection')"
          v-tooltip.left="$t('import')"
        >
          <i class="material-icons">topic</i>
        </button>
        <v-popover v-if="!saveRequest">
          <button class="tooltip-target icon" v-tooltip.left="$t('more')">
            <i class="material-icons">more_vert</i>
          </button>
          <template slot="popover">
            <div>
              <button
                class="icon"
                @click="$emit('add-folder', { folder: collection, path: `${collectionIndex}` })"
                v-close-popover
              >
                <i class="material-icons">create_new_folder</i>
                <span>{{ $t("new_folder") }}</span>
              </button>
            </div>
            <div>
              <button
                v-if="
                  collectionsType.type == 'team-collections' &&
                  collectionsType.selectedTeam.myRole == 'VIEWER'
                "
                class="icon"
                @click="$emit('edit-collection')"
                v-close-popover
                disabled
              >
                <i class="material-icons">create</i>
                <div v-tooltip.left="$t('disable_new_collection')">
                  <span>{{ $t("edit") }}</span>
                </div>
              </button>
              <button v-else class="icon" @click="$emit('edit-collection')" v-close-popover>
                <i class="material-icons">create</i>
                <span>{{ $t("edit") }}</span>
              </button>
            </div>
            <div>
              <button
                v-if="
                  collectionsType.type == 'team-collections' &&
                  collectionsType.selectedTeam.myRole == 'VIEWER'
                "
                class="icon"
                @click="confirmRemove = true"
                v-close-popover
                disabled
              >
                <i class="material-icons">add</i>
                <div v-tooltip.left="$t('disable_new_collection')">
                  <span>{{ $t("delete") }}</span>
                </div>
              </button>
              <button v-else class="icon" @click="confirmRemove = true" v-close-popover>
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
          :key="folder.name ? folder.name : folder.title"
          class="ml-8 border-l border-brdColor"
        >
          <folder
            :folder="folder"
            :folder-index="index"
            :folder-path="`${collectionIndex}/${index}`"
            :collection-index="collectionIndex"
            :doc="doc"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            :isFiltered="isFiltered"
            @add-folder="$emit('add-folder', $event)"
            @edit-folder="$emit('edit-folder', $event)"
            @edit-request="$emit('edit-request', $event)"
            @update-team-collections="$emit('update-team-collections')"
            @select-folder="$emit('select-folder', folder.name + '/' + $event)"
          />
        </li>
      </ul>
      <ul class="flex-col" v-if="!saveRequest">
        <li
          v-for="(request, index) in collection.requests"
          :key="index"
          class="ml-8 border-l border-brdColor"
        >
          <request
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="-1"
            :folder-name="collection.name"
            :request-index="index"
            :doc="doc"
            @edit-request="$emit('edit-request', $event)"
          />
        </li>
      </ul>
      <ul>
        <li
          v-if="
            (collection.folders == undefined || collection.folders.length === 0) &&
            (collection.requests == undefined || collection.requests.length === 0)
          "
          class="flex ml-8 border-l border-brdColor"
        >
          <p class="info">
            <i class="material-icons">not_interested</i> {{ $t("collection_empty") }}
          </p>
        </li>
      </ul>
    </div>
    <confirm-modal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_collection')"
      @hide-modal="confirmRemove = false"
      @resolve="removeCollection"
    />
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import team_utils from "~/helpers/teams/utils"

export default {
  props: {
    collectionIndex: Number,
    collection: Object,
    doc: Boolean,
    saveRequest: Boolean,
    isFiltered: Boolean,
    collectionsType: Object,
  },
  data() {
    return {
      showChildren: false,
      dragging: false,
      selectedFolder: {},
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
        this.collection.folders == undefined
      ) {
        team_utils
          .getCollectionChildren(this.$apollo, this.collection.id)
          .then((children) => {
            this.$set(this.collection, "folders", children)
          })
          .catch((error) => {
            console.log(error)
          })
      }
      if (
        this.showChildren &&
        this.collectionsType.type == "team-collections" &&
        this.collection.requests == undefined
      ) {
        team_utils
          .getCollectionRequests(this.$apollo, this.collection.id)
          .then((requests) => {
            console.log(requests)
            this.$set(this.collection, "requests", requests)
          })
          .catch((error) => {
            console.log(error)
          })
      }
    },
    removeCollection() {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/removeCollection", {
          collectionIndex: this.collectionIndex,
        })
        this.$toast.error(this.$t("deleted"), {
          icon: "delete",
        })
        this.syncCollections()
      } else if (this.collectionsType.type == "team-collections") {
        if (this.collectionsType.selectedTeam.myRole != "VIEWER") {
          this.$apollo
            .mutate({
              // Query
              mutation: gql`
                mutation($collectionID: String!) {
                  deleteCollection(collectionID: $collectionID)
                }
              `,
              // Parameters
              variables: {
                collectionID: this.collection.id,
              },
            })
            .then((data) => {
              // Result
              this.$toast.success(this.$t("deleted"), {
                icon: "delete",
              })
              console.log(data)
              this.$emit("update-team-collections")
            })
            .catch((error) => {
              // Error
              this.$toast.error(this.$t("error_occurred"), {
                icon: "done",
              })
              console.error(error)
            })
        }
      }
      this.confirmRemove = false
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
        newFolderIndex: -1,
        newFolderName: this.$props.collection.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
      })
      this.syncCollections()
    },
  },
}
</script>
