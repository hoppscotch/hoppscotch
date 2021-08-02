<template>
  <SmartTabs styles="sticky top-24 z-20">
    <SmartTab id="script" :label="$t('test.script')" :selected="true">
      <div
        class="
          bg-primary
          border-b border-dividerLight
          flex flex-1
          pl-4
          top-32
          z-10
          sticky
          items-center
          justify-between
        "
      >
        <label class="font-semibold">
          {{ $t("javascript_code") }}
        </label>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://github.com/hoppscotch/hoppscotch/wiki/Post-Request-Tests"
          blank
          :title="$t('wiki')"
          icon="help_outline"
        />
      </div>
      <SmartJsEditor
        v-model="testScript"
        :options="{
          maxLines: Infinity,
          minLines: 16,
          fontSize: '12px',
          autoScrollEditorIntoView: true,
          showPrintMargin: false,
          useWorker: false,
        }"
        complete-mode="test"
      />
    </SmartTab>
    <SmartTab
      id="results"
      :label="$t('test.results')"
      :info="totalTests ? totalTests.toString() : ''"
    >
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
            pl-4
            top-32
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
        <HttpTestResult :results="testResults" />
      </div>
      <div
        v-else
        class="
          flex flex-col
          text-secondaryLight
          p-4
          items-center
          justify-center
        "
      >
        <i class="opacity-75 pb-2 material-icons">bug_report</i>
        <span class="text-center">
          {{ $t("empty.tests") }}
        </span>
      </div>
    </SmartTab>
  </SmartTabs>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  useTestScript,
  restTestResults$,
  setRESTTestResults,
} from "~/newstore/RESTSession"
import { useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  setup() {
    return {
      testScript: useTestScript(),
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
