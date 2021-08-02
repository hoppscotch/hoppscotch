<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("collection.edit") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelEdit" class="font-semibold px-4 pb-4">{{
          $t("label")
        }}</label>
        <input
          id="selectLabelEdit"
          v-model="name"
          class="input"
          type="text"
          :placeholder="placeholderCollName"
          @keyup.enter="saveCollection"
        />
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
