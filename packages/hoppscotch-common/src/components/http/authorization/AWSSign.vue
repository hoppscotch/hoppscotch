<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.accessKey"
      :auto-complete-env="true"
      :placeholder="t('authorization.aws_signature.access_key')"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.secretKey"
      :auto-complete-env="true"
      :placeholder="t('authorization.aws_signature.secret_key')"
      :envs="envs"
    />
  </div>

  <!-- advanced config -->

  <div class="flex flex-col divide-y divide-dividerLight">
    <!-- label as advanced config here -->
    <div class="p-4 flex flex-col space-y-1">
      <label class="">
        {{ t("authorization.aws_signature.advance_config") }}
      </label>
      <p class="text-secondaryLight">
        {{ t("authorization.aws_signature.advance_config_description") }}
      </p>
    </div>
    <div class="flex flex-1">
      <SmartEnvInput
        v-model="auth.region"
        :auto-complete-env="true"
        :placeholder="t('authorization.aws_signature.aws_region')"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1">
      <SmartEnvInput
        v-model="auth.serviceName"
        :auto-complete-env="true"
        :placeholder="t('authorization.aws_signature.service_name')"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1">
      <SmartEnvInput
        v-model="auth.serviceToken"
        :auto-complete-env="true"
        :placeholder="t('authorization.aws_signature.service_token')"
        :envs="envs"
      />
    </div>
    <div class="flex items-center !border-b border-dividerLight">
      <span class="flex items-center">
        <label class="ml-4 text-secondaryLight">
          {{ t("authorization.pass_key_by") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => authTippyActions.focus()"
        >
          <HoppSmartSelectWrapper>
            <HoppButtonSecondary
              :label="
                auth.addTo
                  ? auth.addTo === 'HEADERS'
                    ? t('authorization.pass_by_headers_label')
                    : t('authorization.pass_by_query_params_label')
                  : t('state.none')
              "
              class="ml-2 rounded-none pr-8"
            />
          </HoppSmartSelectWrapper>
          <template #content="{ hide }">
            <div
              ref="authTippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                :icon="auth.addTo === 'HEADERS' ? IconCircleDot : IconCircle"
                :active="auth.addTo === 'HEADERS'"
                :label="t('authorization.pass_by_headers_label')"
                @click="
                  () => {
                    auth.addTo = 'HEADERS'
                    hide()
                  }
                "
              />
              <HoppSmartItem
                :icon="
                  auth.addTo === 'QUERY_PARAMS' ? IconCircleDot : IconCircle
                "
                :active="auth.addTo === 'QUERY_PARAMS'"
                :label="t('authorization.pass_by_query_params_label')"
                @click="
                  () => {
                    auth.addTo = 'QUERY_PARAMS'
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthAWSSignature } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { AggregateEnvironment } from "~/newstore/environments"
import { ref } from "vue"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthAWSSignature
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthAWSSignature): void
}>()

const auth = useVModel(props, "modelValue", emit)

const authTippyActions = ref<any | null>(null)
</script>
