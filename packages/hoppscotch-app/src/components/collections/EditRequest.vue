<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('modal.edit_request')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelEditReq"
          v-model="requestUpdateData.name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveRequest"
        />
        <label for="selectLabelEditReq">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="saveRequest"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
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
    editingRequestName: { type: String, default: null },
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
      requestUpdateData: {
        name: null,
      },
    }
  },
  watch: {
    editingRequestName(val) {
      this.requestUpdateData.name = val
    },
  },
  methods: {
    saveRequest() {
      if (!this.requestUpdateData.name) {
        this.toast.error(this.t("request.invalid_name"))
        return
      }
      this.$emit("submit", this.requestUpdateData)
    },
    hideModal() {
      this.requestUpdateData = { name: null }
      this.$emit("hide-modal")
    },
  },
})
</script>
