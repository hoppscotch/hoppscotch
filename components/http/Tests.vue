<template>
  <AppSection label="postRequestTests">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-24
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
        maxLines: '16',
        minLines: '8',
        fontSize: '12px',
        autoScrollEditorIntoView: true,
        showPrintMargin: false,
        useWorker: false,
      }"
      complete-mode="test"
    />
    <div v-if="testResults">
      <div
        class="
          bg-primary
          border-b border-dividerLight
          flex flex-1
          pl-4
          top-24
          z-10
          sticky
          items-center
          justify-between
        "
      >
        <div>
          <label class="font-semibold"> Test Report </label>
        </div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent()"
        />
      </div>
      <div class="flex my-4 items-center">
        <div class="ml-4">
          <span class="font-semibold text-red-500">
            {{ failedTests }} failing,
          </span>
          <span class="font-semibold text-green-500">
            {{ passedTests }} successful,
          </span>
          <span class="font-semibold"> out of {{ totalTests }} tests. </span>
        </div>
        <div class="bg-primaryDark flex space-x-2 flex-1 h-1 mx-4 relative">
          <div
            class="rounded h-full bg-green-500"
            :style="`width: ${(passedTests / totalTests) * 100 + '%'}`"
          ></div>
          <div
            class="rounded h-full bg-red-500"
            :style="`width: ${(failedTests / totalTests) * 100 + '%'}`"
          ></div>
        </div>
      </div>
      <HttpTestResult :results="testResults" />
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
