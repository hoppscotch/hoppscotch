<template>
  <div class="divide-y divide-dividerLight">
    <div v-if="results.tests">
      <HttpTestResult
        v-for="(result, index) in results.tests"
        :key="`result-${index}`"
        :results="result"
      />
    </div>
    <span
      v-if="results.description"
      class="
        border-b border-dividerLight
        flex
        font-semibold
        text-secondaryDark
        py-2
        px-4
        items-center
      "
    >
      {{ results.description }}
    </span>
    <div v-if="results.expectResults" class="divide-y divide-dividerLight">
      <div
        v-for="(result, index) in results.expectResults"
        :key="`result-${index}`"
        class="flex py-2 px-4 items-center"
      >
        <i
          class="mr-4 material-icons"
          :class="result.status === 'pass' ? 'text-green-500' : 'text-red-500'"
        >
          {{ result.status === "pass" ? "check" : "close" }}
        </i>
        <span v-if="result.message" class="font-semibold text-secondaryDark">
          {{ result.message }}
        </span>
        <span class="text-secondaryLight">
          {{
            ` \xA0 — \xA0test ${
              result.status === "pass" ? $t("passed") : $t("failed")
            }`
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@nuxtjs/composition-api"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"

export default defineComponent({
  props: {
    results: {
      type: Object as PropType<HoppTestResult>,
      default: null,
    },
  },
})
</script>
