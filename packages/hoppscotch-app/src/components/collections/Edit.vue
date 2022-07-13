<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('collection.edit')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
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
      <span>
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          @click.native="saveCollection"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"

export default defineComponent({
  props: {
    show: Boolean,
    editingCollectionName: { type: String, default: null },
    loadingState: Boolean,
  },
  data() {
    return {
      name: null,
    }
  },
  setup() {
    return {
      toast: useToast(),
      i18n: useI18n()
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
