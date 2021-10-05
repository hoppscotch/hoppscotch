<template>
  <SmartModal
    v-if="show"
    :title="$t('team.title')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <Teams :modal="true" />
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    show: Boolean,
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
  },
})
</script>
