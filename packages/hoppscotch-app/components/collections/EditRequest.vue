<template>
  <SmartModal v-if="show" :title="$t('modal.edit_request')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
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
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('action.save')" @click.native="saveRequest" />
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
    editingRequestName: { type: String, default: null },
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
        this.$toast.error(this.$t("request.invalid_name"))
        return
      }
      this.$emit("submit", this.requestUpdateData)
      this.hideModal()
    },
    hideModal() {
      this.requestUpdateData = { name: null }
      this.$emit("hide-modal")
    },
  },
})
</script>
