<template>
  <div>
    <div>
      <button class="icon" @click="openWorkspace" v-close-popover>
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
  </div>
</template>

<script>
export default {
  // data() {
  //   return {}
  // },
  methods: {
    openWorkspace() {},
    saveWorkspace() {},
  },
}
</script>
