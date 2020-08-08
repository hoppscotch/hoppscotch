<template>
  <div class="flex-wrap">
    <div>
      <button
        class="icon"
        @click="$emit('select-environment')"
        v-tooltip.bottom="$t('use_environment')"
      >
        <icon icon="insert_drive_file" />
        <span>{{ environment.name }}</span>
      </button>
    </div>
    <v-popover>
      <button class="tooltip-target icon" v-tooltip.left="$t('more')">
        <icon icon="more_vert" />
      </button>
      <template slot="popover">
        <div>
          <button class="icon" @click="$emit('edit-environment')" v-close-popover>
            <icon icon="create" />
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div>
          <button class="icon" @click="removeEnvironment" v-close-popover>
            <icon icon="delete" />
            <span>{{ $t("delete") }}</span>
          </button>
        </div>
      </template>
    </v-popover>
  </div>
</template>

<style scoped lang="scss">
ul {
  display: flex;
  flex-direction: column;
}

ul li {
  display: flex;
  padding-left: 16px;
  border-left: 1px solid var(--brd-color);
}
</style>

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
      if (!confirm("Are you sure you want to remove this environment?")) return
      this.$store.commit("postwoman/removeEnvironment", this.environmentIndex)
      this.syncEnvironments()
    },
  },
}
</script>
