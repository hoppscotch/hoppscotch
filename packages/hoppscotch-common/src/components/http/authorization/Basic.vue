<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.username") }}
    </label>
    <SmartEnvInput
      v-model="auth.username"
      placeholder="john_doe"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.password") }}
    </label>
    <SmartEnvInput
      v-model="auth.password"
      placeholder="Enter password"
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
