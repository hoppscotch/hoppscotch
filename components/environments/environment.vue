<template>
  <div class="row-wrapper">
    <div>
      <button class="icon" @click="$emit('edit-environment')">
        <i class="material-icons">layers</i>
        <span>{{ environment.name }}</span>
      </button>
    </div>
    <v-popover>
      <button class="tooltip-target icon" v-tooltip.left="$t('more')">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <div>
          <button class="icon" @click="$emit('edit-environment')" v-close-popover>
            <i class="material-icons">create</i>
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div>
          <button class="icon" @click="removeEnvironment" v-close-popover>
            <i class="material-icons">delete</i>
            <span>{{ $t("delete") }}</span>
          </button>
        </div>
      </template>
    </v-popover>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    environment: Object,
    environmentIndex: Number,
  },
  methods: {
    syncEnvironments() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
    removeEnvironment() {
      if (!confirm(this.$t("are_you_sure_remove_environment"))) return
      this.$store.commit("postwoman/removeEnvironment", this.environmentIndex)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
      this.syncEnvironments()
    },
  },
}
</script>
