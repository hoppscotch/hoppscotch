<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput v-model="auth.key" placeholder="Key" />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput v-model="auth.value" placeholder="Value" />
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
        <span class="select-wrapper">
          <HoppButtonSecondary
            :label="auth.addTo || t('state.none')"
            class="pr-8 ml-2 rounded-none"
          />
        </span>
        <template #content="{ hide }">
          <div
            ref="authTippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              :icon="auth.addTo === 'Headers' ? IconCircleDot : IconCircle"
              :active="auth.addTo === 'Headers'"
              :label="'Headers'"
              @click="
                () => {
                  auth.addTo = 'Headers'
                  hide()
                }
              "
            />
            <HoppSmartItem
              :icon="auth.addTo === 'Query params' ? IconCircleDot : IconCircle"
              :active="auth.addTo === 'Query params'"
              :label="'Query params'"
              @click="
                () => {
                  auth.addTo = 'Query params'
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

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthAPIKey
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthAPIKey): void
}>()

const auth = useVModel(props, "modelValue", emit)

const authTippyActions = ref<any | null>(null)
</script>
