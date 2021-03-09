<template>
  <div>
    <div>
      <button class="icon" @click="loadWorkspace" v-close-popover>
        <i class="material-icons">open_in_browser</i>
        <span>Open Workspace</span>
      </button>
    </div>
    <div>
      <button class="icon" @click="saveWorkspace" v-close-popover>
        <i class="material-icons">save_alt</i>
        <span>Save Workspace</span>
      </button>
    </div>
    <div>
      <button class="icon" @click="createWorkspace" v-close-popover>
        <i class="material-icons">save_alt</i>
        <span>Save Workspace As ...</span>
      </button>
    </div>
  </div>
</template>

<script>
import {
  saveWorkspaceToFile,
  saveWorkspaceToNewFile,
  loadWorkspaceFromFile,
} from "../store/postwoman"

function reportError(ex) {
  console && console.log("Error", ex)
  this.$toast.error(ex.message)
}

export default {
  // data() {
  //   return {}
  // },

  methods: {
    async loadWorkspace() {
      try {
        await loadWorkspaceFromFile()
        this.$toast.info("Workspace loaded")
      } catch (ex) {
        reportError.call(this, ex)
      }
    },
    async saveWorkspace() {
      try {
        const savedContent = await saveWorkspaceToFile()
        this.$toast.info(`File saved successfully`)
      } catch (ex) {
        reportError.call(this, ex)
      }
    },
    async createWorkspace() {
      try {
        await saveWorkspaceToNewFile()
        this.$toast.info("File saved successfully")
      } catch (ex) {
        reportError.call(this, ex)
      }
    },
  },
}
</script>
