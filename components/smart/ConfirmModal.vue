<template>
  <SmartModal v-if="show" :title="$t('modal.confirm')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <label>
          {{ title }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary v-focus :label="yes" @click.native="resolve" />
        <ButtonSecondary :label="no" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    show: Boolean,
    title: { type: String, default: null },
    yes: {
      type: String,
      default() {
        return this.$t("action.yes")
      },
    },
    no: {
      type: String,
      default() {
        return this.$t("action.no")
      },
    },
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    resolve() {
      this.$emit("resolve")
      this.$emit("hide-modal")
    },
  },
})
</script>
