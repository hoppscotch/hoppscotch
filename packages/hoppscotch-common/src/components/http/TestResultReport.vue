<template>
  <div class="flex items-center px-4 py-2">
    <SmartProgressRing
      class="mr-2 text-red-500"
      :radius="8"
      :stroke="1.5"
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
import { computed, PropType } from "vue"
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
