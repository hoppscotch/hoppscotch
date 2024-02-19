<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.username"
      :placeholder="t('authorization.username')"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.password"
      :placeholder="t('authorization.password')"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthBasic } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { AggregateEnvironment } from "~/newstore/environments"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthBasic
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthBasic): void
}>()

const auth = useVModel(props, "modelValue", emit)
</script>
