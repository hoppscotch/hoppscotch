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

function massageStateForRestoring(state, configuration) {
  return {
    name: state.name,
    ...configuration,
  }
}

function createObjectToSave(store) {
  return {
    version: 1,
    configuration: {
      ...store.state,
      name: undefined,
    },
  }
}

export default {
  props: {},
  data: function () {
    return {}
  },

  methods: {
    async loadWorkspace(evt) {
      try {
        const loaded = await loadWorkspaceFile()
        const configuration = loaded.configuration
        const currentState = this.$store.state

        setTimeout(async () => {
          try {
            console.log("Current state", this.$store.state)
            console.log("loaded settings", loaded)

            let toApply = massageStateForRestoring(currentState, configuration)

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
    async saveWorkspace(evt) {
      try {
        const toSave = createObjectToSave(this.$store)
        const savedContent = await saveWorkspaceToFile(toSave)
        console.info("Saved Workspace", savedContent)
        this.$toast.info(`File saved successfully`)
      } catch (ex) {
        reportError.call(this, ex)
      }
      return true
    },
    async createWorkspace(evt) {
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
