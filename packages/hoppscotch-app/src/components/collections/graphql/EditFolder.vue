<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${t('folder.edit')}`"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelGqlEditFolder"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="editFolder"
        />
        <label for="selectLabelGqlEditFolder">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary :label="`${t('action.save')}`" @click="editFolder" />
        <ButtonSecondary :label="`${t('action.cancel')}`" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { editGraphqlFolder } from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
    folder: { type: Object, default: () => ({}) },
    folderPath: { type: String, default: null },
    editingFolderName: { type: String, default: null },
  },
  emits: ["hide-modal"],
  setup() {
    return {
      toast: useToast(),
      t: useI18n(),
    }
  },
  data() {
    return {
      name: "",
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
        this.toast.error(`${this.t("collection.invalid_name")}`)
        return
      }
      editGraphqlFolder(this.folderPath, {
        ...(this.folder as any),
        name: this.name,
      })
      this.hideModal()
    },
    hideModal() {
      this.name = ""
      this.$emit("hide-modal")
    },
  },
})
</script>
