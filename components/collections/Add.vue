<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("collection.new") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelAdd" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelAdd"
          v-model="name"
          class="input"
          type="text"
          :placeholder="$t('collection.name')"
          @keyup.enter="addNewCollection"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="addNewCollection" />
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
    addNewCollection() {
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
