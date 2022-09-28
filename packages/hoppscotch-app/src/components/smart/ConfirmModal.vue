<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('modal.confirm')"
    role="dialog"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col items-center justify-center">
        {{ title }}
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          v-focus
          :label="yes ?? t('action.yes')"
          :loading="!!loadingState"
          @click="resolve"
        />
        <ButtonSecondary :label="no ?? t('action.no')" @click="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string | null
    yes?: string | null
    no?: string | null
    loadingState?: boolean | null
  }>(),
  {
    title: null,
    yes: null,
    no: null,
    loadingState: null,
  }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "resolve", title: string | null): void
}>()

const hideModal = () => {
  emit("hide-modal")
}

const resolve = () => {
  emit("resolve", props.title)
  if (props.loadingState === null) emit("hide-modal")
}
</script>
