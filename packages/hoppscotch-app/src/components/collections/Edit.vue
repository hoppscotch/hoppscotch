<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('collection.edit')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelEdit"
          v-model="name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveCollection"
        />
        <label for="selectLabelEdit">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          @click="saveCollection"
        />
        <ButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

export default defineComponent({
  props: {
    show: Boolean,
    editingCollectionName: { type: String, default: null },
    loadingState: Boolean,
  },
  emits: ["submit", "hide-modal"],
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
  watch: {
    editingCollectionName(val) {
      this.name = val
    },
  },
  methods: {
    saveCollection() {
      if (!this.name) {
        this.toast.error(this.t("collection.invalid_name"))
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
