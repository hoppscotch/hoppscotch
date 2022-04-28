<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('modal.edit_request')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <input
          id="selectLabelEditReq"
          v-model="name"
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
        <ButtonPrimary
          :label="$t('action.save')"
          :loading="loadingState"
          @click.native="saveRequest"
        />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  show: boolean
  editingRequestName: string
  loadingState: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "submit", v: string): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (show) name.value = props.editingRequestName
  }
)

const saveRequest = () => {
  if (!name.value) {
    toast.error(`${t("request.invalid_name")}`)
    return
  }

  emit("submit", name.value)
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
