<template>
  <SmartModal
    v-if="show"
    :title="`${$t('modal.edit_request')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
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
          {{ $t("action.label") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${$t('action.save')}`"
          @click.native="saveRequest"
        />
        <ButtonSecondary
          :label="`${$t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@nuxtjs/composition-api"
import { HoppGQLRequest } from "@hoppscotch/data"
import { editGraphqlRequest } from "~/newstore/collections"

export default defineComponent({
  props: {
    show: Boolean,
    folderPath: { type: String, default: null },
    request: { type: Object as PropType<HoppGQLRequest>, default: () => {} },
    requestIndex: { type: Number, default: null },
    editingRequestName: { type: String, default: null },
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
        this.$toast.error(`${this.$t("collection.invalid_name")}`)
        return
      }
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
