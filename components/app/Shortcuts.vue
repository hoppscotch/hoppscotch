<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="heading">{{ $t("shortcuts") }}</h3>
        <div>
          <button class="icon button" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <div class="p-2">
        <div>
          <kbd>{{ getSpecialKey() }}</kbd>
          +
          <kbd>G</kbd>
          <label>{{ $t("send_request") }}</label>
        </div>
        <div>
          <kbd>{{ getSpecialKey() }}</kbd
          >+<kbd>S</kbd>
          <label>{{ $t("save_to_collections") }}</label>
        </div>
        <div>
          <kbd>{{ getSpecialKey() }}</kbd
          >+<kbd>K</kbd>
          <label>{{ $t("copy_request_link") }}</label>
        </div>
        <div>
          <kbd>{{ getSpecialKey() }}</kbd
          >+<kbd>I</kbd>
          <label>{{ $t("reset_request") }}</label>
        </div>
      </div>
      <hr />
      <div class="p-2">
        <div>
          <kbd>Alt</kbd>+<kbd>▲</kbd>
          <label>{{ $t("select_next_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>▼</kbd>
          <label>{{ $t("select_previous_method") }}</label>
        </div>
      </div>
      <hr />
      <div class="p-2">
        <div>
          <kbd>Alt</kbd>+<kbd>G</kbd>
          <label>{{ $t("select_get_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>H</kbd>
          <label>{{ $t("select_head_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>P</kbd>
          <label>{{ $t("select_post_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>U</kbd>
          <label>{{ $t("select_put_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>X</kbd>
          <label>{{ $t("select_delete_method") }}</label>
        </div>
      </div>
    </div>
    <div slot="footer"></div>
  </SmartModal>
</template>

<script>
import { getPlatformSpecialKey } from "~/helpers/platformutils"

export default {
  props: {
    show: Boolean,
  },
  methods: {
    getSpecialKey: getPlatformSpecialKey,
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>

<style scoped lang="scss">
kbd {
  @apply inline-flex;
  @apply resize-none;
  @apply m-2;
  @apply py-2 px-4;
  @apply rounded-lg;
  @apply text-sm;
}
</style>
