<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("collection.edit") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelEdit"
          v-model="name"
          class="input floating-input"
          placeholder=" "
          type="text"
          @keyup.enter="saveCollection"
        />
        <label for="selectLabelEdit">
          {{ $t("label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="saveCollection" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
export default {
  props: {
    show: Boolean,
    placeholderCollName: { type: String, default: null },
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    saveCollection() {
      if (!this.name) {
        this.$toast.info(this.$t("collection.invalid_name"))
        return
      }
      this.$emit("submit", this.name)
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
}
</script>
