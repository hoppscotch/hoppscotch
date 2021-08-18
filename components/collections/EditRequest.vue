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
export default {
  props: {
    show: Boolean,
    placeholderReqName: { type: String, default: null },
  },
  data() {
    return {
      requestUpdateData: {
        name: null,
      },
    }
  },
  methods: {
    saveRequest() {
      if (!this.requestUpdateData.name) {
        this.$toast.info(this.$t("collection.invalid_name"), {
          icon: "info",
        })
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
}
</script>
