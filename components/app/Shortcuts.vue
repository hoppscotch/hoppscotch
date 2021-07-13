<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("shortcuts") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="px-2">
        <div
          v-for="(shortcut, index) in shortcuts"
          :key="`shortcut-${index}`"
          class="flex items-center"
        >
          <kbd
            v-for="(key, keyIndex) in shortcut.keys"
            :key="`shortcut-${index}-key-${keyIndex}`"
            class="
              py-2
              px-4
              m-1
              text-xs
              border border-divider
              rounded-lg
              font-bold
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
  </SmartModal>
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
  methods: {
    getSpecialKey: getPlatformSpecialKey,
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
