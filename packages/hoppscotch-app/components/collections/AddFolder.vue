<template>
  <SmartModal
    v-if="show"
    :title="$t('folder.new')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelAddFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addFolder"
        />
        <label for="selectLabelAddFolder">
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('action.save')" @click.native="addFolder" />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
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
      if (!this.name) {
        this.$toast.error(this.$t("folder.invalid_name"), {
          icon: "error_outline",
        })
        return
      }
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
})
</script>
