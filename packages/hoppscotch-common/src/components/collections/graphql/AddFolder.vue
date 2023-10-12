<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('folder.new')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="addFolder"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          outline
          @click="addFolder"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
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
