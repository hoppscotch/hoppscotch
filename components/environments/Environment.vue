<template>
  <div>
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
            <button class="icon" @click="confirmRemove = true" v-close-popover>
              <i class="material-icons">delete</i>
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_environment')"
      @hide-modal="confirmRemove = false"
      @resolve="removeEnvironment"
    />
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    environment: Object,
    environmentIndex: Number,
  },
  data() {
    return {
      confirmRemove: false,
    }
  },
  methods: {
    syncEnvironments() {
      if (fb.currentUser !== null && fb.currentSettings[1]) {
        if (fb.currentSettings[1].value) {
          fb.writeEnvironments(JSON.parse(JSON.stringify(this.$store.state.postwoman.environments)))
        }
      }
    },
    removeEnvironment() {
      this.$store.commit("postwoman/removeEnvironment", this.environmentIndex)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
      this.syncEnvironments()
    },
  },
}
</script>
