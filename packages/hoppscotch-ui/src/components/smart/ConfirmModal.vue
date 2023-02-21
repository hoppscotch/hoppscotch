<template>
  <HoppSmartModal v-if="show" dialog :title="confirm ?? t?.('modal.confirm') ?? 'Confirm'" role="dialog" aria-modal="true"
    @close="hideModal">
    <template #body>
      <div class="flex flex-col items-center justify-center">
        {{ title }}
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary v-focus :label="yes ?? t?.('action.yes') ?? 'Yes'" :loading="!!loadingState" outline
          @click="resolve" />
        <HoppButtonSecondary :label="no ?? t?.('action.no') ?? 'No'" filled outline @click="hideModal" />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { inject } from "vue"
import { HoppButtonPrimary, HoppButtonSecondary } from "../button"
import { HoppSmartModal } from "."
import { HoppUIPluginOptions, HOPP_UI_OPTIONS } from "./../../plugin"

const { t } = inject<HoppUIPluginOptions>(HOPP_UI_OPTIONS) ?? {}

const props = withDefaults(
  defineProps<{
    show: boolean
    title?: string | null
    confirm?: string | null
    yes?: string | null
    no?: string | null
    loadingState?: boolean | null
  }>(),
  {
    title: null,
    confirm: null,
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
