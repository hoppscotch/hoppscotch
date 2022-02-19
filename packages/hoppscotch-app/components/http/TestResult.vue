<template>
  <div>
    <div
      v-if="
        testResults &&
        (testResults.expectResults.length ||
          testResults.tests.length ||
          haveEnvVariables)
      "
    >
      <div
        class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
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
      <div class="border-b divide-y-4 divide-dividerLight border-dividerLight">
        <div v-if="haveEnvVariables" class="flex flex-col">
          <details class="flex flex-col divide-y divide-dividerLight" open>
            <summary
              class="flex items-center justify-between flex-1 min-w-0 cursor-pointer transition focus:outline-none text-secondaryLight text-tiny group"
            >
              <span
                class="px-4 py-2 truncate transition group-hover:text-secondary capitalize-first"
              >
                {{ t("environment.title") }}
              </span>
            </summary>
            <div class="divide-y divide-dividerLight">
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.global.updations"
                :key="`env-${env.key}-${index}`"
                :env="env"
              />
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.selected.updations"
                :key="`env-${env.key}-${index}`"
                :env="env"
              />
            </div>
          </details>
        </div>
        <div v-if="testResults.tests" class="divide-y-4 divide-dividerLight">
          <HttpTestResultEntry
            v-for="(result, index) in testResults.tests"
            :key="`result-${index}`"
            :test-results="result"
          />
        </div>
        <div
          v-if="testResults.expectResults"
          class="divide-y divide-dividerLight"
        >
          <HttpTestResultReport
            v-if="testResults.expectResults.length"
            :test-results="testResults"
          />
          <div
            v-for="(result, index) in testResults.expectResults"
            :key="`result-${index}`"
            class="flex items-center px-4 py-2"
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
      v-else-if="testResults && testResults.scriptError"
      class="flex flex-col items-center justify-center flex-1 p-4"
    >
      <img
        :src="`/images/states/${$colorMode.value}/youre_lost.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-32 h-32 my-4"
        :alt="`${t('error.test_script_fail')}`"
      />
      <span class="mb-2 font-semibold text-center">
        {{ t("error.test_script_fail") }}
      </span>
      <span
        class="max-w-sm mb-6 text-center whitespace-normal text-secondaryLight"
      >
        {{ t("helpers.test_script_fail") }}
      </span>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/validation.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.tests')}`"
      />
      <span class="pb-2 text-center">
        {{ t("empty.tests") }}
      </span>
      <span class="pb-4 text-center">
        {{ t("helpers.tests") }}
      </span>
      <ButtonSecondary
        outline
        :label="`${t('action.learn_more')}`"
        to="https://docs.hoppscotch.io/features/tests"
        blank
        svg="external-link"
        reverse
        class="my-4"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "@nuxtjs/composition-api"
import { useReadonlyStream, useI18n } from "~/helpers/utils/composables"
import { restTestResults$, setRESTTestResults } from "~/newstore/RESTSession"

const t = useI18n()

const testResults = useReadonlyStream(restTestResults$, null)

const clearContent = () => setRESTTestResults(null)

const haveEnvVariables = computed(() => {
  if (!testResults.value) return false
  return (
    testResults.value.envDiff.global.updations.length ||
    testResults.value.envDiff.selected.updations.length
  )
})
</script>
