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
        <button v-tooltip.left="$t('more')" class="tooltip-target icon">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              v-close-popover
              class="icon"
              @click="$emit('edit-environment')"
            >
              <i class="material-icons">create</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button v-close-popover class="icon" @click="confirmRemove = true">
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

<script lang="ts">
import Vue from "vue"
import { deleteEnvironment } from "~/newstore/environments"

export default Vue.extend({
  props: {
    environment: { type: Object, default: () => {} },
    environmentIndex: { type: Number, default: null },
  },
  data() {
    return {
      confirmRemove: false,
    }
  },
  methods: {
    removeEnvironment() {
      deleteEnvironment(this.environmentIndex)
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
    },
  },
})
</script>
