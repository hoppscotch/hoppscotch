<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.username"
      :placeholder="t('authorization.username')"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.password"
      :placeholder="t('authorization.password')"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthBasic } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthBasic
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthBasic): void
}>()

const auth = useVModel(props, "modelValue", emit)
</script>
