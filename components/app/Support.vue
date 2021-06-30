<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("support_us") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
      <AppContributors />
    </template>
  </SmartModal>
</template>

<script>
export default {
  props: {
    show: Boolean,
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
