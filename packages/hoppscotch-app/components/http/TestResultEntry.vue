<template>
  <div>
    <span
      v-if="testResults.description"
      class="flex font-bold text-secondaryDark py-2 px-4 items-center"
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
        class="flex py-2 px-4 items-center"
      >
        <i
          class="mr-4 material-icons"
          :class="result.status === 'pass' ? 'text-green-500' : 'text-red-500'"
        >
          {{ result.status === "pass" ? "check" : "close" }}
        </i>
        <span v-if="result.message" class="text-secondaryDark">
          {{ result.message }}
        </span>
        <span class="text-secondaryLight">
          {{
            ` \xA0 — \xA0 ${
              result.status === "pass" ? $t("test.passed") : $t("test.failed")
            }`
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType } from "@nuxtjs/composition-api"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"

defineProps({
  testResults: {
    type: Object as PropType<HoppTestResult>,
    required: true,
  },
})
</script>
