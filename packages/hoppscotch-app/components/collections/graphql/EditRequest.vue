<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${$t('modal.edit_request')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelGqlEditReq"
          v-model="name"
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

<script setup lang="ts">
import { HoppGQLRequest } from "@hoppscotch/data"
import { ref, watch } from "@nuxtjs/composition-api"
import { editGraphqlRequest } from "~/newstore/collections"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  request: HoppGQLRequest
  requestIndex?: number
  editingRequestName?: string
  folderPath?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref("")
watch(
  () => props.show,
  (show) => {
    if (show && props.editingRequestName) {
      name.value = props.editingRequestName
    }
  }
)

const hideModal = () => {
  emit("hide-modal")
}

const saveRequest = () => {
  if (!name.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }
  if (!props.folderPath) {
    console.error("No folder path")
    toast.error(`${t("error.something_went_wrong")}`)
    return
  }
  if (props.requestIndex === undefined) {
    console.error("No request index")
    toast.error(`${t("error.something_went_wrong")}`)
    return
  }

  const requestUpdated = {
    ...props.request,
    name: name.value,
  }
  editGraphqlRequest(props.folderPath, props.requestIndex, requestUpdated)

  hideModal()
}
</script>
