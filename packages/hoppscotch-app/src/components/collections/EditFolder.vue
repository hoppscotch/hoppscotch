<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('folder.edit')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelEditFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="editFolder"
        />
        <label for="selectLabelEditFolder">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          @click="editFolder"
        />
        <ButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

export default defineComponent({
  props: {
    show: Boolean,
    editingFolderName: { type: String, default: null },
    loadingState: Boolean,
  },
  emits: ["submit", "hide-modal"],
  setup() {
    return {
      t: useI18n(),
      toast: useToast(),
    }
  },
  data() {
    return {
      name: null,
    }
  },
  watch: {
    editingFolderName(val) {
      this.name = val
    },
  },
  methods: {
    editFolder() {
      if (!this.name) {
        this.toast.error(this.t("folder.invalid_name"))
        return
      }
      this.$emit("submit", this.name)
    },
    hideModal() {
      this.name = null
      this.$emit("hide-modal")
    },
  },
})
</script>
