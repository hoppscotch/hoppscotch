<template>
  <div>
    <div class="row-wrapper">
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren && !isFiltered">arrow_right</i>
          <i class="material-icons" v-show="showChildren || isFiltered">arrow_drop_down</i>
          <i class="material-icons">folder_open</i>
          <span>{{ folder.name }}</span>
        </button>
      </div>
      <v-popover>
        <button class="tooltip-target icon" v-tooltip.left="$t('more')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button class="icon" @click="editFolder" v-close-popover>
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button class="icon" @click="removeFolder" v-close-popover>
              <deleteIcon class="material-icons" />
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>

    <div v-show="showChildren || isFiltered">
      <ul class="flex-col">
        <li
          v-for="(request, index) in folder.requests"
          :key="index"
          class="flex ml-8 border-l border-brdColor"
        >
          <request
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :request-index="index"
            :doc="doc"
            @edit-request="
              $emit('edit-request', {
                request,
                collectionIndex,
                folderIndex,
                requestIndex: index,
              })
            "
          />
        </li>
        <li v-if="folder.requests.length === 0" class="flex ml-8 border-l border-brdColor">
          <label>{{ $t("folder_empty") }}</label>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import deleteIcon from "~/static/icons/delete-24px.svg?inline"

export default {
  components: { deleteIcon },
  props: {
    folder: Object,
    collectionIndex: Number,
    folderIndex: Number,
    doc: Boolean,
    isFiltered: Boolean,
  },
  data() {
    return {
      showChildren: false,
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
    },
    selectRequest(request) {
      this.$store.commit("postwoman/selectRequest", { request })
    },
    removeFolder() {
      if (!confirm(this.$t("are_you_sure_remove_folder"))) return
      this.$store.commit("postwoman/removeFolder", {
        collectionIndex: this.collectionIndex,
        folderIndex: this.folderIndex,
      })
      this.syncCollections()
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
    },
    editFolder() {
      this.$emit("edit-folder")
    },
  },
}
</script>
