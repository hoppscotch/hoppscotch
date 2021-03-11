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

function createObjectToSave(store) {
  return { version: 1, configuration: store.state }
}

export default {
  props: {},
  data: function () {
    return {}
  },

  methods: {
    async loadWorkspace() {
      try {
        const loaded = await loadWorkspaceFile()
        const configuration = loaded.configuration
        setTimeout(async () => {
          try {
            console.log("Current state", this.$store.state)
            console.log("loaded settings", loaded)

            let toApply = {
              ...this.$store.state,
              ...configuration,
            }
            console.log("settings to apply", toApply)

            this.$store.replaceState(toApply)

            await this.$toast.info("Workspace loaded")
          } catch (ex) {
            reportError.call(this, ex)
          }
        })
      } catch (ex) {
        reportError.call(this, ex)
      }
      return true
    },
    async saveWorkspace() {
      try {
        const toSave = createObjectToSave(this.$store)
        const savedContent = await saveWorkspaceToFile(toSave)
        this.$toast.info(`File saved successfully`)
      } catch (ex) {
        reportError.call(this, ex)
      }
      return true
    },
    async createWorkspace() {
      try {
        const toSave = createObjectToSave(this.$store)
        await saveWorkspaceToNewFile(toSave)
        this.$toast.info("File saved successfully")
      } catch (ex) {
        reportError.call(this, ex)
      }
      return true
    },
  },
}
</script>
