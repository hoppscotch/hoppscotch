<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("agent.key") }}
    </label>
    <SmartEnvInput
      v-model="auth.key"
      :auto-complete-env="true"
      placeholder="X-API-Key"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("environment.value") }}
    </label>
    <SmartEnvInput
      v-model="auth.value"
      :auto-complete-env="true"
      placeholder="sk_live_abc123xyz789"
      :envs="envs"
    />
  </div>
  <div class="flex items-center border-b border-dividerLight">
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
              :icon="auth.addTo === 'QUERY_PARAMS' ? IconCircleDot : IconCircle"
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
</template>

<script setup lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthAPIKey } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { ref } from "vue"
import { AggregateEnvironment } from "~/newstore/environments"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthAPIKey
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthAPIKey): void
}>()

const auth = useVModel(props, "modelValue", emit)

const authTippyActions = ref<any | null>(null)
</script>
