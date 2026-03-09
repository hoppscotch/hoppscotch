<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.token") }}
    </label>
    <SmartEnvInput
      v-model="auth.accessToken"
      :auto-complete-env="true"
      placeholder="akzb-a1b2c3d4e5f6..."
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.client_token") }}
    </label>
    <SmartEnvInput
      v-model="auth.clientToken"
      :auto-complete-env="true"
      placeholder="akab-c1i2e3n4t5t6..."
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.client_secret") }}
    </label>
    <SmartEnvInput
      v-model="auth.clientSecret"
      :auto-complete-env="true"
      placeholder="s3cr3tk3yh3r3..."
      :envs="envs"
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
        {{ t("authorization.digest.nonce") }}
      </label>
      <SmartEnvInput
        v-model="auth.nonce"
        :auto-complete-env="true"
        placeholder="e.g. 12345678-abcd-1234-abcd-123456789abc"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.timestamp") }}
      </label>
      <SmartEnvInput
        v-model="auth.timestamp"
        :auto-complete-env="true"
        placeholder="e.g. 20230101T12:00:00+0000"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.host") }}
      </label>
      <SmartEnvInput
        v-model="auth.host"
        :auto-complete-env="true"
        placeholder="api.example.com"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.akamai.headers_to_sign") }}
      </label>
      <SmartEnvInput
        v-model="auth.headersToSign"
        :auto-complete-env="true"
        placeholder="x-timestamp;content-type"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.akamai.max_body_size") }}
      </label>
      <SmartEnvInput
        v-model="auth.maxBodySize"
        :auto-complete-env="true"
        placeholder="131072"
        :envs="envs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthAkamaiEdgeGrid } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { AggregateEnvironment } from "~/newstore/environments"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthAkamaiEdgeGrid
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthAkamaiEdgeGrid): void
}>()

const auth = useVModel(props, "modelValue", emit)
</script>
