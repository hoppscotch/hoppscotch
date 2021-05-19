<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("edit_request") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="requestUpdateData.name"
        type="text"
        :placeholder="placeholderReqName"
        @keyup.enter="saveRequest"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveRequest">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
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
        name: undefined,
      },
    }
  },
  methods: {
    saveRequest() {
      this.$emit("submit", this.requestUpdateData)
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
