<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('modal.confirm')"
    role="dialog"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <label>
          {{ title }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          v-focus
          :label="yes"
          :loading="!!loadingState"
          @click.native="resolve"
        />
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
    loadingState: { type: Boolean, default: null },
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    resolve() {
      this.$emit("resolve", this.title)
      if (this.loadingState === null) this.$emit("hide-modal")
    },
  },
})
</script>
