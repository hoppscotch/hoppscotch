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
      <button class="icon" @click="toggleShowChildren">
        <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
        <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
        <i class="material-icons">folder</i>
        <span>{{ collection.name ? collection.name : collection.title }}</span>
      </button>
      <div>
        <button
          v-if="doc && !selected"
          class="icon"
          @click="$emit('select-collection')"
          v-tooltip.left="$t('import')"
        >
          <i class="material-icons">check_box_outline_blank</i>
        </button>
        <button
          v-if="doc && selected"
          class="icon"
          @click="$emit('unselect-collection')"
          v-tooltip.left="$t('delete')"
        >
          <i class="material-icons">check_box</i>
        </button>
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
          v-for="(folder, index) in collectionsType.type === 'my-collections'
            ? collection.folders
            : folders"
          :key="folder.name ? folder.name : folder.title"
          class="ml-8 border-l border-brdColor"
        >
          <CollectionsFolder
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
            @select-folder="
              $emit('select-folder', {
                name:
                  (collectionsType.type == 'my-collections' ? folder.name : folder.title) +
                  '/' +
                  $event.name,
                id: $event.id,
                reqIdx: $event.reqIdx,
              })
            "
          />
        </li>
      </ul>
      <ul class="flex-col">
        <li
          v-for="(request, index) in collectionsType.type === 'my-collections'
            ? collection.requests
            : requests"
          :key="index"
          class="ml-8 border-l border-brdColor"
        >
          <CollectionsRequest
            :request="
              collectionsType.type === 'my-collections' ? request : JSON.parse(request.request)
            "
            :collection-index="collectionIndex"
            :folder-index="-1"
            :folder-name="collection.name"
            :request-index="collectionsType.type === 'my-collections' ? index : request.id"
            :doc="doc"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            @edit-request="editRequest($event)"
            @select-request="
              $emit('select-folder', {
                name: $event.name,
                id: collection.id,
                reqIdx: $event.idx,
              })
            "
          />
        </li>
      </ul>
      <ul>
        <li
          v-if="
            (folders == undefined || folders.length === 0) &&
            (requests == undefined || requests.length === 0)
          "
          class="flex ml-8 border-l border-brdColor"
        >
          <p class="info">
            <i class="material-icons">not_interested</i> {{ $t("collection_empty") }}
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
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import gql from "graphql-tag"

export default {
  props: {
    collectionIndex: Number,
    collection: Object,
    doc: Boolean,
    isFiltered: Boolean,
    selected: Boolean,
    saveRequest: Boolean,
    collectionsType: Object,
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
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  apollo: {
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
            if (
              subscriptionData.data.teamRequestAdded.collection.id === this.$props.collection.id
            ) {
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
            if (
              subscriptionData.data.teamRequestUpdated.collection.id === this.$props.collection.id
            ) {
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
          collectionID: this.$props.collection.id,
          cursor: this.$data.cursor,
        }
      },
      update: (response) => response.requestsInCollection,
      skip() {
        return this.$props.collection.id === undefined
      },
      fetchPolicy: "no-cache",
    },
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
            if (subscriptionData.data.teamCollectionAdded.parent.id === this.$props.collection.id) {
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
              subscriptionData.data.teamCollectionUpdated.parent.id === this.$props.collection.id
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
          collectionID: this.$props.collection.id,
        }
      },
      update: (response) => response.collection.children,
      skip() {
        return this.$props.collection.id === undefined
      },
      fetchPolicy: "no-cache",
    },
  },
  methods: {
    editRequest(event) {
      this.$emit("edit-request", event)
      if (this.$props.saveRequest)
        this.$emit("select-folder", {
          name: this.$data.collection.name,
          id: this.$data.collection.id,
          reqIdx: event.requestIndex,
        })
    },
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
        this.$emit("select-folder", { name: "", id: this.$props.collection.id, reqIdx: "" })

      this.showChildren = !this.showChildren
    },
    removeCollection() {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/removeCollection", {
          collectionIndex: this.collectionIndex,
          flag: "rest",
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
      const flag = "rest"
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
      this.syncCollections()
    },
  },
}
</script>
