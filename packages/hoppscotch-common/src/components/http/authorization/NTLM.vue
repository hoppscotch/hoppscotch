<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.username") }}
    </label>
    <SmartEnvInput
      v-model="auth.username"
      :auto-complete-env="true"
      placeholder="DOMAIN\\username"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.password") }}
    </label>
    <input
      v-model="auth.password"
      name="password"
      placeholder="Enter password"
      class="flex flex-1 bg-transparent px-4 py-2"
      type="password"
    />
  </div>

  <!-- advanced config -->

  <div>
    <!-- label as advanced config here -->
    <div class="p-4">
      <label class="text-secondaryLight">{{
        t("authorization.advance_config")
      }}</label>
      <p>
        {{ t("authorization.advance_config_description") }}
      </p>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.ntlm.domain") }}
      </label>
      <SmartEnvInput
        v-model="auth.domain"
        :auto-complete-env="true"
        placeholder="CORPORATE"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.ntlm.workstation") }}
      </label>
      <SmartEnvInput
        v-model="auth.workstation"
        :auto-complete-env="true"
        placeholder="MY-COMPUTER"
        :envs="envs"
      />
    </div>

    <div class="px-4 mt-6">
      <HoppSmartCheckbox
        :on="auth.retryingRequest"
        @change="auth.retryingRequest = !auth.retryingRequest"
      >
        {{ t("authorization.ntlm.disable_retrying_request") }}
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
