<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("edit_request") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="requestUpdateData.name"
        class="input"
        type="text"
        :placeholder="request.name"
        @keyup.enter="saveRequest"
      />
    </template>
    <template #footer>
      <span></span>
      <span>
        <button class="icon button" @click="hideModal">
          {{ $t("cancel") }}
        </button>
        <button class="icon button primary" @click="saveRequest">
          {{ $t("save") }}
        </button>
      </span>
    </template>
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
