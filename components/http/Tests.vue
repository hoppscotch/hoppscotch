<template>
  <AppSection label="postRequestTests">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-110px
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-xs">
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
        maxLines: '16',
        minLines: '8',
        fontSize: '14px',
        autoScrollEditorIntoView: true,
        showPrintMargin: false,
        useWorker: false,
      }"
      complete-mode="test"
    />
    <pre>
    {{ testResults }}
    </pre>
    <div v-if="testResults">
      <div class="flex flex-1 pl-4 items-center justify-between">
        <div>
          <label class="font-semibold text-xs"> Test Report: </label>
          <span class="font-semibold text-xs text-red-500">
            {{ failedTests }} failing,
          </span>
          <span class="font-semibold text-xs text-green-500">
            {{ passedTests }} successful,
          </span>
          <span class="font-semibold text-xs text-secondaryDark">
            out of {{ totalTests }} tests.
          </span>
        </div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent()"
        />
      </div>
      <div v-if="testResults.expectResults">
        <HttpTestResult
          v-for="(result, index) in testResults.expectResults"
          :key="`result-${index}`"
          class="divide-y divide-dividerLight"
          :results="testResults.expectResults"
        />
      </div>
      <div v-if="testResults.tests">
        <HttpTestResult
          v-for="(result, index) in testResults.tests"
          :key="`result-${index}`"
          class="divide-y divide-dividerLight"
          :results="testResults.tests"
        />
      </div>
    </div>
  </AppSection>
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
    totalTests() {
      return this.testResults.expectResults.length
    },
    failedTests() {
      return this.testResults.expectResults.filter(
        (result) => result.status === "fail"
      ).length
    },
    passedTests() {
      return this.testResults.expectResults.filter(
        (result) => result.status === "pass"
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
