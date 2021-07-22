<template>
  <div>
    <div v-if="results">
      <div
        v-for="(result, index) in results"
        :key="`result-${index}`"
        class="flex py-2 px-4 items-center"
      >
        <i
          class="mr-4 material-icons"
          :class="result.status === 'pass' ? 'text-green-500' : 'text-red-500'"
        >
          {{ result.status === "pass" ? "check_circle" : "cancel" }}
        </i>
        <span
          v-if="result.message"
          class="font-semibold text-secondaryDark text-xs"
        >
          {{ result.message }}
        </span>
        <span class="text-secondaryLight text-xs">
          {{
            ` \xA0 — \xA0test ${
              result.status === "pass" ? $t("passed") : $t("failed")
            }`
          }}
        </span>
      </div>
    </div>
    <div v-if="results.tests">
      <HttpTestResult
        v-for="(result, index) in results.expectResults"
        :key="`result-${index}`"
        class="divide-y divide-dividerLight"
        :results="results.expectResults"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@vue/composition-api"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"

export default defineComponent({
  props: {
    results: {
      type: Array as PropType<HoppTestResult>,
      default: null,
    },
  },
})
</script>
