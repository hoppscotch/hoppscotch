<template>
  <div class="flex p-2 items-center">
    <SmartProgressRing
      class="text-red-500"
      :radius="16"
      :stroke="4"
      :progress="(failedTests / totalTests) * 100"
    />
    <div class="ml-2">
      <span v-if="failedTests" class="text-red-500">
        {{ failedTests }} failing,
      </span>
      <span v-if="passedTests" class="text-green-500">
        {{ passedTests }} successful,
      </span>
      <span> out of {{ totalTests }} tests. </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from "@nuxtjs/composition-api"
import {
  HoppTestExpectResult,
  HoppTestResult,
} from "~/helpers/types/HoppTestResult"

const props = defineProps({
  testResults: {
    type: Object as PropType<HoppTestResult>,
    required: true,
    expectResults: [] as HoppTestExpectResult[],
  },
})

const totalTests = computed(() => props.testResults.expectResults.length)
const failedTests = computed(
  () =>
    props.testResults.expectResults.filter(
      (result: { status: string }) => result.status === "fail"
    ).length
)
const passedTests = computed(
  () =>
    props.testResults.expectResults.filter(
      (result: { status: string }) => result.status === "pass"
    ).length
)
</script>
