<template>
  <SmartModal v-if="show" @close="show = false">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("edit_folder") }}</h3>
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
        :placeholder="folder.name"
        @keyup.enter="editFolder"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="editFolder">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import * as team_utils from "~/helpers/teams/utils"

export default {
  props: {
    show: Boolean,
    collectionIndex: Number,
    folder: Object,
    folderIndex: Number,
    collectionsType: Object,
  },
  data() {
    return {
      name: undefined,
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
    editFolder() {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/editFolder", {
          collectionIndex: this.$props.collectionIndex,
          folder: { ...this.$props.folder, name: this.$data.name },
          folderIndex: this.$props.folderIndex,
          folderName: this.$props.folder.name,
          flag: "rest",
        })
        this.syncCollections()
      } else if (this.collectionsType.type == "team-collections") {
        if (this.collectionsType.selectedTeam.myRole != "VIEWER") {
          team_utils
            .renameCollection(this.$apollo, this.$data.name, this.folder.id)
            .then((data) => {
              // Result
              this.$toast.success(this.$t("folder_renamed"), {
                icon: "done",
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
        }
      }

      this.hideModal()
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
