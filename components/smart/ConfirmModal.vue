<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("confirm") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
      <label>{{ title }}</label>
    </template>
    <template #footer>
      <span></span>
      <span>
        <button class="icon button" @click="hideModal">
          {{ no }}
        </button>
        <button class="icon button primary" @click="resolve">
          {{ yes }}
        </button>
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
    },
  },
}
</script>
