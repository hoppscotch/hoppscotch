<template>
  <AppSection :label="$t('test.result')">
    <div
      v-if="
        testResults &&
        (testResults.expectResults.length || testResults.tests.length)
      "
    >
      <div
        class="
          bg-primary
          border-b border-dividerLight
          flex flex-1
          top-lowerSecondaryStickyFold
          pl-4
          z-10
          sticky
          items-center
          justify-between
        "
      >
        <label class="font-semibold"> Test Report </label>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent()"
        />
      </div>
      <div class="flex p-2 items-center">
        <SmartProgressRing
          class="text-red-500"
          :radius="16"
          :stroke="4"
          :progress="(failedTests / totalTests) * 100"
        />
        <div class="ml-2">
          <span v-if="failedTests" class="font-semibold text-red-500">
            {{ failedTests }} failing,
          </span>
          <span v-if="passedTests" class="font-semibold text-green-500">
            {{ passedTests }} successful,
          </span>
          <span class="font-semibold"> out of {{ totalTests }} tests. </span>
        </div>
      </div>
      <div class="divide-y divide-dividerLight">
        <div v-if="testResults.tests">
          <HttpTestResult
            v-for="(result, index) in testResults.tests"
            :key="`result-${index}`"
            :results="result"
          />
        </div>
        <span
          v-if="testResults.description"
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
          {{ testResults.description }}
        </span>
        <div
          v-if="testResults.expectResults"
          class="divide-y divide-dividerLight"
        >
          <div
            v-for="(result, index) in testResults.expectResults"
            :key="`result-${index}`"
            class="flex py-2 px-4 items-center"
          >
            <i
              class="mr-4 material-icons"
              :class="
                result.status === 'pass' ? 'text-green-500' : 'text-red-500'
              "
            >
              {{ result.status === "pass" ? "check" : "close" }}
            </i>
            <span
              v-if="result.message"
              class="font-semibold text-secondaryDark"
            >
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
    </div>
    <div
      v-else
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">bug_report</i>
      <span class="text-center">
        {{ $t("empty.tests") }}
      </span>
    </div>
  </AppSection>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { restTestResults$, setRESTTestResults } from "~/newstore/RESTSession"

export default defineComponent({
  setup() {
    return {
      testResults: useReadonlyStream(restTestResults$, null),
    }
  },
  computed: {
    totalTests(): number | undefined {
      return this.testResults?.expectResults.length
    },
    failedTests(): number | undefined {
      return this.testResults?.expectResults.filter(
        (result: { status: string }) => result.status === "fail"
      ).length
    },
    passedTests(): number | undefined {
      return this.testResults?.expectResults.filter(
        (result: { status: string }) => result.status === "pass"
      ).length
    },
  },
  methods: {
    clearContent() {
      setRESTTestResults(null)
    },
  },
})
</script>
