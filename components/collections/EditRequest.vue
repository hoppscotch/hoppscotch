<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_request") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <label for="selectLabelEditReq">{{ $t("label") }}</label>
      <input
        id="selectLabelEditReq"
        v-model="requestUpdateData.name"
        class="input"
        type="text"
        :placeholder="placeholderReqName"
        @keyup.enter="saveRequest"
      />
    </template>
    <template #footer>
      <span></span>
      <span>
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
        <ButtonPrimary :label="$t('save')" @click.native="saveRequest" />
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
