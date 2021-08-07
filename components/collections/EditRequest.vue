<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_request") }}</h3>
      <ButtonSecondary icon="close" @click.native="hideModal" />
    </template>
    <template #body>
      <div class="flex flex-col px-2">
        <label for="selectLabelEditReq" class="font-semibold px-4 pb-4">
          {{ $t("label") }}
        </label>
        <input
          id="selectLabelEditReq"
          v-model="requestUpdateData.name"
          class="input"
          type="text"
          :placeholder="placeholderReqName"
          @keyup.enter="saveRequest"
        />
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
