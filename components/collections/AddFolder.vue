<template>
  <SmartModal v-if="show" @close="$emit('hide-modal')">
    <template #header>
      <h3 class="heading">{{ $t("new_folder") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelAddFolder" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelAddFolder"
          v-model="name"
          class="input"
          type="text"
          :placeholder="$t('my_new_folder')"
          @keyup.enter="addFolder"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="addFolder" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
export default {
  props: {
    show: Boolean,
    folder: { type: Object, default: () => {} },
    folderPath: { type: String, default: null },
    collectionIndex: { type: Number, default: null },
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    addFolder() {
      this.$emit("add-folder", {
        name: this.name,
        folder: this.folder,
        path: this.folderPath || `${this.collectionIndex}`,
      })
      this.hideModal()
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
}
</script>
