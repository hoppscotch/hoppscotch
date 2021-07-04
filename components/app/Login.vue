<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("login") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <FirebaseLogin />
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
