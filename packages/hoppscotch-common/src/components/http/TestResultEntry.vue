<template>
  <div>
    <span
      v-if="testResults.description"
      class="flex items-center px-4 py-2 font-bold text-secondaryDark"
    >
      {{ testResults.description }}
    </span>
    <div v-if="testResults.expectResults" class="divide-y divide-dividerLight">
      <HttpTestResultReport
        v-if="testResults.expectResults.length"
        :test-results="testResults"
      />
      <div
        v-for="(result, index) in testResults.expectResults"
        :key="`result-${index}`"
        class="flex items-center px-4 py-2"
      >
        <div
          class="flex flex-shrink flex-shrink-0 items-center overflow-x-auto"
        >
          <component
            :is="result.status === 'pass' ? IconCheck : IconClose"
            class="svg-icons mr-4"
            :class="
              result.status === 'pass' ? 'text-green-500' : 'text-red-500'
            "
          />
          <div
            class="flex flex-shrink flex-shrink-0 items-center space-x-2 overflow-x-auto"
          >
            <span v-if="result.message" class="inline-flex text-secondaryDark">
              {{ result.message }}
            </span>
            <span class="inline-flex text-secondaryLight">
              <icon-lucide-minus class="svg-icons mr-2" />
              {{
                result.status === "pass" ? t("test.passed") : t("test.failed")
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "vue"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"
import { useI18n } from "@composables/i18n"

import IconCheck from "~icons/lucide/check"
import IconClose from "~icons/lucide/x"

const t = useI18n()

defineProps({
  testResults: {
    type: Object as PropType<HoppTestResult>,
    required: true,
  },
})
</script>
