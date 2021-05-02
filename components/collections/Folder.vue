<template>
  <div>
    <div
      :class="['row-wrapper transition duration-150 ease-in-out', { 'bg-bgDarkColor': dragging }]"
      @dragover.prevent
      @drop.prevent="dropEvent"
      @dragover="dragging = true"
      @drop="dragging = false"
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
          <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
          <i class="material-icons">folder_open</i>
          <span>{{ folder.name ? folder.name : folder.title }}</span>
        </button>
      </div>
      <div v-if="collectionsType.type !== 'my-collections' && showChildren">
        <button
          class="icon"
          v-if="cursor !== ''"
          @click="
            cursor = prevCursor
            pageNo -= 1
          "
        >
          Prev
        </button>
        <span v-if="cursor !== '' || (requests && requests.length === 10)">{{ pageNo }}</span>
        <button
          class="icon"
          v-if="requests && requests.length === 10"
          @click="
            prevCursor = cursor
            cursor = requests[requests.length - 1].id
            pageNo += 1
          "
        >
          Next
        </button>
      </div>
      <v-popover v-if="!saveRequest">
        <button
          v-if="
            collectionsType.type == 'team-collections' &&
            collectionsType.selectedTeam.myRole !== 'VIEWER'
          "
          class="tooltip-target icon"
          v-tooltip.left="$t('more')"
        >
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              v-if="
                collectionsType.type == 'team-collections' &&
                collectionsType.selectedTeam.myRole !== 'VIEWER'
              "
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
              v-if="
                collectionsType.type == 'team-collections' &&
                collectionsType.selectedTeam.myRole !== 'VIEWER'
              "
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
              v-if="
                collectionsType.type == 'team-collections' &&
                collectionsType.selectedTeam.myRole !== 'VIEWER'
              "
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
      <ul v-if="folders && folders.length" class="flex-col">
        <li
          v-for="(subFolder, subFolderIndex) in folders"
          :key="subFolder.name"
          class="ml-8 border-l border-brdColor"
        >
          <CollectionsFolder
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
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in requests"
          :key="index"
          class="flex ml-8 border-l border-brdColor"
        >
          <CollectionsRequest
            :request="
              collectionsType.type == 'my-collections' ? request : JSON.parse(request.request)
            "
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :folder-name="folder.name"
            :request-index="collectionsType.type === 'my-collections' ? index : request.id"
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
      <ul v-if="folders && folders.length === 0 && requests && requests.length === 0">
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
import team_utils from "~/helpers/teams/utils"
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
      dragging: false,
      confirmRemove: false,
      prevCursor: "",
      cursor: "",
      pageNo: 0,
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  apollo: {
    folders: {
      query: gql`
        query getCollectionChildren($collectionID: String!) {
          collection(collectionID: $collectionID) {
            children {
              id
              title
            }
          }
        }
      `,
      subscribeToMore: [
        {
          document: gql`
            subscription teamCollectionAdded($teamID: String!) {
              teamCollectionAdded(teamID: $teamID) {
                id
                title
                parent {
                  id
                  title
                }
              }
            }
          `,
          variables() {
            return { teamID: this.$props.collectionsType.selectedTeam.id }
          },
          skip() {
            return this.$props.collectionsType.selectedTeam === undefined
          },
          updateQuery(previousResult, { subscriptionData }) {
            if (
              subscriptionData.data.teamCollectionAdded.parent &&
              subscriptionData.data.teamCollectionAdded.parent.id === this.$props.folder.id
            ) {
              previousResult.collection.children.push({
                id: subscriptionData.data.teamCollectionAdded.id,
                title: subscriptionData.data.teamCollectionAdded.title,
                __typename: subscriptionData.data.teamCollectionAdded.__typename,
              })
              return previousResult
            }
          },
        },
        {
          document: gql`
            subscription teamCollectionUpdated($teamID: String!) {
              teamCollectionUpdated(teamID: $teamID) {
                id
                title
                parent {
                  id
                  title
                }
              }
            }
          `,
          variables() {
            return { teamID: this.$props.collectionsType.selectedTeam.id }
          },
          skip() {
            return this.$props.collectionsType.selectedTeam === undefined
          },
          updateQuery(previousResult, { subscriptionData }) {
            if (
              subscriptionData.data.teamCollectionUpdated.parent &&
              subscriptionData.data.teamCollectionUpdated.parent.id === this.$props.folder.id
            ) {
              const index = previousResult.collection.children.findIndex(
                (x) => x.id === subscriptionData.data.teamCollectionUpdated.id
              )
              previousResult.collection.children[index].title =
                subscriptionData.data.teamCollectionUpdated.title
              return previousResult
            }
          },
        },
        {
          document: gql`
            subscription teamCollectionRemoved($teamID: String!) {
              teamCollectionRemoved(teamID: $teamID)
            }
          `,
          variables() {
            return { teamID: this.$props.collectionsType.selectedTeam.id }
          },
          skip() {
            return this.$props.collectionsType.selectedTeam === undefined
          },
          updateQuery(previousResult, { subscriptionData }) {
            const index = previousResult.collection.children.findIndex(
              (x) => x.id === subscriptionData.data.teamCollectionRemoved
            )
            if (index !== -1) previousResult.collection.children.splice(index, 1)
            return previousResult
          },
        },
      ],
      variables() {
        return {
          collectionID: this.$props.folder.id,
        }
      },
      update: (response) => response.collection.children,
      skip() {
        return this.$props.collectionsType.selectedTeam === undefined
      },
      fetchPolicy: "no-cache",
    },
    requests: {
      query: gql`
        query getCollectionRequests($collectionID: String!, $cursor: String) {
          requestsInCollection(collectionID: $collectionID, cursor: $cursor) {
            id
            title
            request
          }
        }
      `,
      subscribeToMore: [
        {
          document: gql`
            subscription teamRequestAdded($teamID: String!) {
              teamRequestAdded(teamID: $teamID) {
                id
                request
                title
                collection {
                  id
                  title
                }
              }
            }
          `,
          variables() {
            return { teamID: this.$props.collectionsType.selectedTeam.id }
          },
          skip() {
            return this.$props.collectionsType.selectedTeam === undefined
          },
          updateQuery(previousResult, { subscriptionData }) {
            if (subscriptionData.data.teamRequestAdded.collection.id === this.$props.folder.id) {
              previousResult.requestsInCollection.push({
                id: subscriptionData.data.teamRequestAdded.id,
                request: subscriptionData.data.teamRequestAdded.request,
                title: subscriptionData.data.teamRequestAdded.title,
                __typename: subscriptionData.data.teamRequestAdded.__typename,
              })
              return previousResult
            }
          },
        },
        {
          document: gql`
            subscription teamRequestUpdated($teamID: String!) {
              teamRequestUpdated(teamID: $teamID) {
                id
                request
                title
                collection {
                  id
                  title
                }
              }
            }
          `,
          variables() {
            return { teamID: this.$props.collectionsType.selectedTeam.id }
          },
          skip() {
            return this.$props.collectionsType.selectedTeam === undefined
          },
          updateQuery(previousResult, { subscriptionData }) {
            if (subscriptionData.data.teamRequestUpdated.collection.id === this.$props.folder.id) {
              const index = previousResult.requestsInCollection.findIndex(
                (x) => x.id === subscriptionData.data.teamRequestUpdated.id
              )
              previousResult.requestsInCollection[index].title =
                subscriptionData.data.teamRequestUpdated.title
              previousResult.requestsInCollection[index].request =
                subscriptionData.data.teamRequestUpdated.request
              return previousResult
            }
          },
        },
        {
          document: gql`
            subscription teamRequestDeleted($teamID: String!) {
              teamRequestDeleted(teamID: $teamID)
            }
          `,
          variables() {
            return { teamID: this.$props.collectionsType.selectedTeam.id }
          },
          skip() {
            return this.$props.collectionsType.selectedTeam === undefined
          },
          updateQuery(previousResult, { subscriptionData }) {
            const index = previousResult.requestsInCollection.findIndex(
              (x) => x.id === subscriptionData.data.teamRequestDeleted
            )
            if (index !== -1) previousResult.requestsInCollection.splice(index, 1)
            return previousResult
          },
        },
      ],
      variables() {
        return {
          collectionID: this.$props.folder.id,
          cursor: this.$data.cursor,
        }
      },
      update: (response) => response.requestsInCollection,
      skip() {
        return this.$props.collectionsType.selectedTeam === undefined
      },
      fetchPolicy: "no-cache",
    },
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
      this.showChildren = !this.showChildren
    },
    removeFolder() {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/removeFolder", {
          collectionIndex: this.$props.collectionIndex,
          folderName: this.$props.folder.name,
          folderIndex: this.$props.folderIndex,
          flag: "rest",
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
      const flag = "rest"

      this.$store.commit("postwoman/moveRequest", {
        oldCollectionIndex,
        newCollectionIndex: this.$props.collectionIndex,
        newFolderIndex: this.$props.folderIndex,
        newFolderName: this.$props.folder.name,
        oldFolderIndex,
        oldFolderName,
        requestIndex,
        flag,
      })
      this.syncCollections()
    },
  },
}
</script>
