<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.username"
      :auto-complete-env="true"
      :placeholder="t('authorization.username')"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <input
      v-model="auth.password"
      name="password"
      :placeholder="t('authorization.password')"
      class="flex flex-1 bg-transparent px-4 py-2"
      type="password"
    />
  </div>

  <!-- advanced config -->

  <div>
    <!-- label as advanced config here -->
    <div class="p-4">
      <label class="text-secondaryLight"> Advanced Configuration </label>
      <p>
        Hoppscotch automatically assigns default values to certain fields if no
        explicit value is provided.
      </p>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.domain"
        :auto-complete-env="true"
        placeholder="Domain"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.workstation"
        :auto-complete-env="true"
        placeholder="Workstation"
        :envs="envs"
      />
    </div>

    <div class="px-4 mt-6">
      <HoppSmartCheckbox
        :on="auth.retryingRequest"
        @change="auth.retryingRequest = !auth.retryingRequest"
      >
        Disable Retrying Requset
      </HoppSmartCheckbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthNTLM } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { AggregateEnvironment } from "~/newstore/environments"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthNTLM
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthNTLM): void
}>()

const auth = useVModel(props, "modelValue", emit)
</script>
