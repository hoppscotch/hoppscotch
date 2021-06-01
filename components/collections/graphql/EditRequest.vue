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
        :placeholder="request.name"
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

<script lang="ts">
import Vue from "vue"
import { editGraphqlRequest } from "~/newstore/collections"

export default Vue.extend({
  props: {
    show: Boolean,
    folderPath: { type: String, default: null },
    request: { type: Object, default: () => {} },
    requestIndex: { type: Number, default: null },
  },
  data() {
    return {
      requestUpdateData: {
        name: null as any | null,
      },
    }
  },
  methods: {
    saveRequest() {
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
