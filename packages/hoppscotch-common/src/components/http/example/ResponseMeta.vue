<template>
  <div
    class="sticky top-0 z-50 flex-none flex-shrink-0 items-center justify-center whitespace-nowrap bg-primary p-4"
  >
    <div v-if="response" class="flex flex-1 flex-col">
      <div class="flex items-center text-tiny font-semibold">
        <div class="inline-flex flex-1 space-x-4">
          <div v-if="response.code" class="flex-1 flex items-center space-x-2">
            <span class="text-secondary"> {{ t("response.status") }}: </span>
            <div class="flex-1 flex whitespace-nowrap max-w-xs">
              <SmartEnvInput
                v-model="status"
                :auto-complete-source="getStatusCodeOptions"
                class="flex-1 border border-divider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "@composables/i18n"
import {
  getFullStatusCodePhrase,
  getStatusCodePhrase,
} from "~/helpers/utils/statusCodes"
import { HoppRESTRequestResponse } from "@hoppscotch/data"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTRequestResponse | null | undefined
  isEmbed?: boolean
}>()

const status = ref(getStatusCodePhrase(props.response?.code || 200))

const getStatusCodeOptions = computed(() => {
  return getFullStatusCodePhrase()
})
</script>
