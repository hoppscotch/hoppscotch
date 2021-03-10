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
import { saveWorkspaceToFile, saveWorkspaceToNewFile, loadWorkspaceFile } from "../store/postwoman"

function reportError(ex) {
  console && console.log("Error", ex)
  this.$toast.error(ex.message)
}

export default {
  props: {},
  data: function () {
    return {}
  },

  methods: {
    async loadWorkspace() {
      // const me = this
      // const my = this
      try {
        const loaded = await loadWorkspaceFile()
        setTimeout(async () => {
          try {
            await this.$store.replaceState(loaded)
            await this.$toast.info("Workspace loaded")
          } catch (ex) {
            reportError.call(me, ex)
          }
        })
      } catch (ex) {
        reportError.call(me, ex)
      }
      return true
    },
    async saveWorkspace() {
      try {
        const savedContent = await saveWorkspaceToFile(this.$store.state)
        this.$toast.info(`File saved successfully`)
      } catch (ex) {
        reportError.call(this, ex)
      }
      return true
    },
    async createWorkspace() {
      try {
        await saveWorkspaceToNewFile(this.$store.state)
        this.$toast.info("File saved successfully")
      } catch (ex) {
        reportError.call(this, ex)
      }
      return true
    },
  },
}
</script>
