<template>
  <SmartModal v-if="show" @close="$emit('hide-modal')">
    <template #header>
      <h3 class="heading">{{ $t("edit_folder") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelEditFolder" class="font-semibold px-4 pb-4">{{
          $t("label")
        }}</label>
        <input
          id="selectLabelEditFolder"
          v-model="name"
          class="input"
          type="text"
          @keyup.enter="editFolder"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="editFolder" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    editFolder() {
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
