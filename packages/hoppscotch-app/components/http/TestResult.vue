<template>
  <AppSection :label="`${t('test.results')}`">
    <div
      v-if="
        testResults &&
        (testResults.expectResults.length || testResults.tests.length)
      "
    >
      <div
        class="
          bg-primary
          border-dividerLight border-b
          flex flex-1
          top-lowerSecondaryStickyFold
          pl-4
          z-10
          sticky
          items-center
          justify-between
        "
      >
        <label class="font-semibold text-secondaryLight">
          {{ t("test.report") }}
        </label>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          svg="trash-2"
          @click.native="clearContent()"
        />
      </div>
      <div class="divide-dividerLight border-dividerLight border-b divide-y-4">
        <div v-if="testResults.tests" class="divide-dividerLight divide-y-4">
          <HttpTestResultEntry
            v-for="(result, index) in testResults.tests"
            :key="`result-${index}`"
            :test-results="result"
          />
        </div>
        <div
          v-if="testResults.expectResults"
          class="divide-dividerLight divide-y"
        >
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
              :class="
                result.status === 'pass' ? 'text-green-500' : 'text-red-500'
              "
            >
              {{ result.status === "pass" ? "check" : "close" }}
            </i>
            <span v-if="result.message" class="text-secondaryDark">
              {{ result.message }}
            </span>
            <span class="text-secondaryLight">
              {{
                ` \xA0 — \xA0 ${
                  result.status === "pass" ? t("test.passed") : t("test.failed")
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
      <img
        :src="`/images/states/${$colorMode.value}/validation.svg`"
        loading="lazy"
        class="flex-col my-4 object-contain object-center h-16 w-16 inline-flex"
        :alt="`${t('empty.tests')}`"
      />
      <span class="text-center pb-2">
        {{ t("empty.tests") }}
      </span>
      <span class="text-center pb-4">
        {{ t("helpers.tests") }}
      </span>
      <ButtonSecondary
        outline
        :label="`${t('action.learn_more')}`"
        to="https://docs.hoppscotch.io"
        blank
        svg="external-link"
        reverse
        class="my-4"
      />
    </div>
  </AppSection>
</template>

<script setup lang="ts">
import { useReadonlyStream, useI18n } from "~/helpers/utils/composables"
import { restTestResults$, setRESTTestResults } from "~/newstore/RESTSession"

const t = useI18n()

const testResults = useReadonlyStream(restTestResults$, null)

const clearContent = () => setRESTTestResults(null)
</script>
