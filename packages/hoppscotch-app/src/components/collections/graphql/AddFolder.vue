<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('folder.new')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelGqlAddFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="addFolder"
        />
        <label for="selectLabelGqlAddFolder">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary :label="t('action.save')" @click="addFolder" />
        <ButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { defineComponent } from "vue"

export default defineComponent({
  props: {
    show: Boolean,
    folderPath: { type: String, default: null },
    collectionIndex: { type: Number, default: null },
  },
  emits: ["hide-modal", "add-folder"],
  setup() {
    return {
      toast: useToast(),
      t: useI18n(),
    }
  },
  data() {
    return {
      name: null,
    }
  },
  methods: {
    addFolder() {
      if (!this.name) {
        this.toast.error(`${this.t("folder.name_length_insufficient")}`)
        return
      }

      this.$emit("add-folder", {
        name: this.name,
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
