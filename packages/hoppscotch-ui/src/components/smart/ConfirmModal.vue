<template>
  <SmartModal
    v-if="show"
    dialog
    :title="confirm ?? 'Confirm'"
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
      <span class="flex space-x-2">
        <ButtonPrimary
          v-focus
          :label="yes ?? 'Yes'"
          :loading="!!loadingState"
          outline
          @click="resolve"
        />
        <ButtonSecondary
          :label="no ?? 'No'"
          filled
          outline
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
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
