<template>
  <modal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("edit_collection") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        type="text"
        id="selectLabel"
        v-model="name"
        :placeholder="editingCollection.name"
        @keyup.enter="saveCollection"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveCollection">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </modal>
</template>

<script>
import { fb } from "~/helpers/fb"
import team_utils from "~/helpers/teams/utils"

export default {
  props: {
    show: Boolean,
    editingCollection: Object,
    editingCollectionIndex: Number,
    collectionsType: Object,
  },
  data() {
    return {
      name: undefined,
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
    saveCollection() {
      if (!this.$data.name) {
        this.$toast.info(this.$t("invalid_collection_name"))
        return
      }
      console.log(this.collectionsType.type)
      if (this.collectionsType.type == "my-collections") {
        const collectionUpdated = {
          ...this.$props.editingCollection,
          name: this.$data.name,
        }
        this.$store.commit("postwoman/editCollection", {
          collection: collectionUpdated,
          collectionIndex: this.$props.editingCollectionIndex,
        })
        this.syncCollections()
      } else if (this.collectionsType.type == "team-collections") {
        console.log(this.collectionsType)
        if (this.collectionsType.selectedTeam.myRole != "VIEWER") {
          team_utils
            .renameCollection(this.$apollo, this.$data.name, this.$props.editingCollection.id)
            .then((data) => {
              // Result
              this.$toast.success("Collection Renamed", {
                icon: "done",
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
      this.hideModal()
    },
    hideModal() {
      this.$emit("hide-modal")
      this.$data.name = undefined
    },
  },
}
</script>
