<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("confirm") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label class="font-semibold text-xs">
          {{ title }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="yes" @click.native="resolve" />
        <ButtonSecondary :label="no" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
export default {
  props: {
    show: Boolean,
    title: { type: String, default: null },
    yes: {
      type: String,
      default() {
        return this.$t("yes")
      },
    },
    no: {
      type: String,
      default() {
        return this.$t("no")
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
}
</script>
