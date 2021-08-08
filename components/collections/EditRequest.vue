<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_request") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelEditReq"
          v-model="requestUpdateData.name"
          class="input floating-input"
          placeholder=" "
          type="text"
          @keyup.enter="saveRequest"
        />
        <label for="selectLabelEditReq">
          {{ $t("label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="saveRequest" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
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
        this.$toast.info(this.$t("collection.invalid_name"))
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
