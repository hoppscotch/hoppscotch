<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('folder.new')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        input-styles="floating-input"
        :label="t('action.label')"
        @submit="addFolder"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="addFolder"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
  }>(),
  {
    show: false,
    loadingState: false,
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "add-folder", name: string): void
}>()

const name = ref("")

watch(
  () => props.show,
  (show) => {
    if (!show) {
      name.value = ""
    }
  }
)

const addFolder = () => {
  if (name.value.trim() === "") {
    toast.error(t("folder.invalid_name"))
    return
  }
  emit("add-folder", name.value)
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
