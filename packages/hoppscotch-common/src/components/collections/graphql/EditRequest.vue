<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('modal.edit_request')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <input
          id="selectLabelGqlEditReq"
          v-model="requestUpdateData.name"
          v-focus
          class="input floating-input"
          placeholder=" "
          type="text"
          autocomplete="off"
          @keyup.enter="saveRequest"
        />
        <label for="selectLabelGqlEditReq">
          {{ t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="saveRequest"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppGQLRequest } from "@hoppscotch/data"
import { editGraphqlRequest } from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
    folderPath: { type: String, default: null },
    request: { type: Object as PropType<HoppGQLRequest>, default: () => ({}) },
    requestIndex: { type: Number, default: null },
    editingRequestName: { type: String, default: null },
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
      requestUpdateData: {
        name: null as any | null,
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
        this.toast.error(`${this.t("collection.invalid_name")}`)
        return
      }

      // TODO: Type safety goes brrrr. Proper typing plz
      const requestUpdated = {
        ...this.$props.request,
        name: this.$data.requestUpdateData.name || this.$props.request.name,
      }

      editGraphqlRequest(this.folderPath, this.requestIndex, requestUpdated)

      this.hideModal()
    },
    hideModal() {
      this.requestUpdateData = { name: null }
      this.$emit("hide-modal")
    },
  },
})
</script>
