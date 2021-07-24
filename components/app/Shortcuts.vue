<template>
  <AppSlideOver :show="show" @close="close()">
    <template #content>
      <div
        class="
          bg-primary
          border-b border-dividerLight
          flex
          p-2
          top-0
          items-center
          sticky
          justify-between
        "
      >
        <h3 class="ml-2 heading">{{ $t("shortcuts") }}</h3>
        <div>
          <ButtonSecondary to="/settings" icon="tune" />
          <ButtonSecondary icon="close" @click.native="close()" />
        </div>
      </div>
      <div class="p-4">
        <div
          v-for="(shortcut, index) in shortcuts"
          :key="`shortcut-${index}`"
          class="flex items-center"
        >
          <kbd
            v-for="(key, keyIndex) in shortcut.keys"
            :key="`shortcut-${index}-key-${keyIndex}`"
            class="
              border border-divider
              rounded
              font-bold
              m-1
              text-xs
              py-1
              px-2
            "
          >
            {{ key }}
          </kbd>
          <span class="flex text-xs ml-4">
            {{ shortcut.label }}
          </span>
        </div>
      </div>
    </template>
  </AppSlideOver>
</template>

<script>
import { getPlatformSpecialKey } from "~/helpers/platformutils"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      shortcuts: [
        {
          keys: [this.getSpecialKey(), "G"],
          label: this.$t("send_request"),
        },
        {
          keys: [this.getSpecialKey(), "S"],
          label: this.$t("save_to_collections"),
        },
        {
          keys: [this.getSpecialKey(), "K"],
          label: this.$t("copy_request_link"),
        },
        {
          keys: [this.getSpecialKey(), "I"],
          label: this.$t("reset_request"),
        },
        {
          keys: ["Alt", "▲"],
          label: this.$t("select_next_method"),
        },
        {
          keys: ["Alt", "▼"],
          label: this.$t("select_previous_method"),
        },
        {
          keys: ["Alt", "G"],
          label: this.$t("select_get_method"),
        },
        {
          keys: ["Alt", "H"],
          label: this.$t("select_head_method"),
        },
        {
          keys: ["Alt", "P"],
          label: this.$t("select_post_method"),
        },
        {
          keys: ["Alt", "U"],
          label: this.$t("select_put_method"),
        },
        {
          keys: ["Alt", "X"],
          label: this.$t("select_delete_method"),
        },
      ],
    }
  },
  watch: {
    $route() {
      this.$emit("close")
    },
  },
  methods: {
    getSpecialKey: getPlatformSpecialKey,
    close() {
      this.$emit("close")
    },
  },
}
</script>
