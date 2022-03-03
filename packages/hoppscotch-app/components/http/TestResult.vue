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
              <div
                v-if="noEnvSelected && !globalHasAdditions"
                class="flex p-4 bg-error text-secondaryDark"
                role="alert"
              >
                <i class="mr-4 material-icons"> warning </i>
                <div class="flex flex-col">
                  <p>
                    {{ t("environment.no_environment_description") }}
                  </p>
                  <p class="flex mt-3 space-x-2">
                    <ButtonSecondary
                      :label="t('environment.add_to_global')"
                      class="text-tiny !bg-primary"
                      filled
                      @click.native="addEnvToGlobal()"
                    />
                    <ButtonSecondary
                      :label="t('environment.create_new')"
                      class="text-tiny !bg-primary"
                      filled
                      @click.native="displayModalAdd(true)"
                    />
                  </p>
                </div>
              </div>
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.global.additions"
                :key="`env-${env.key}-${index}`"
                :env="env"
                status="additions"
                global
              />
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.global.updations"
                :key="`env-${env.key}-${index}`"
                :env="env"
                status="updations"
                global
              />
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.selected.additions"
                :key="`env-${env.key}-${index}`"
                :env="env"
                status="additions"
              />
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.selected.updations"
                :key="`env-${env.key}-${index}`"
                :env="env"
                status="updations"
              />
              <HttpTestResultEnv
                v-for="(env, index) in testResults.envDiff.selected.deletions"
                :key="`env-${env.key}-${index}`"
                :env="env"
                status="deletions"
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
    <EnvironmentsAdd
      :show="showModalAdd"
      @hide-modal="displayModalAdd(false)"
      @environment-added="createNewEnv($event)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, Ref, ref } from "@nuxtjs/composition-api"
import isEqual from "lodash/isEqual"
import {
  useReadonlyStream,
  useI18n,
  useStream,
} from "~/helpers/utils/composables"
import {
  globalEnv$,
  selectedEnvIndex$,
  setCurrentEnvironment,
  setGlobalEnvVariables,
  updateEnvironment,
} from "~/newstore/environments"
import { restTestResults$, setRESTTestResults } from "~/newstore/RESTSession"
import { HoppTestResult } from "~/helpers/types/HoppTestResult"

const t = useI18n()

const showModalAdd = ref(false)

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
}

const testResults = useReadonlyStream(
  restTestResults$,
  null
) as Ref<HoppTestResult | null>

const clearContent = () => setRESTTestResults(null)

const haveEnvVariables = computed(() => {
  if (!testResults.value) return false
  return (
    testResults.value.envDiff.global.additions.length ||
    testResults.value.envDiff.global.updations.length ||
    testResults.value.envDiff.global.deletions.length ||
    testResults.value.envDiff.selected.additions.length ||
    testResults.value.envDiff.selected.updations.length ||
    testResults.value.envDiff.selected.deletions.length
  )
})

const selectedEnvironmentIndex = useStream(
  selectedEnvIndex$,
  -1,
  setCurrentEnvironment
)

const globalEnvVars = useReadonlyStream(globalEnv$, []) as Ref<
  Array<{
    key: string
    value: string
  }>
>

const noEnvSelected = computed(() => selectedEnvironmentIndex.value === -1)

const globalHasAdditions = computed(() => {
  if (!testResults.value?.envDiff.selected.additions) return false
  return (
    testResults.value.envDiff.selected.additions.every(
      (x) => globalEnvVars.value.findIndex((y) => isEqual(x, y)) !== -1
    ) ?? false
  )
})

const addEnvToGlobal = () => {
  if (!testResults.value?.envDiff.selected.additions) return
  setGlobalEnvVariables([
    ...globalEnvVars.value,
    ...testResults.value.envDiff.selected.additions,
  ])
}

const createNewEnv = ({ name, index }: { name: string; index: number }) => {
  if (!testResults.value?.envDiff.selected.additions) return
  updateEnvironment(index, {
    name,
    variables: testResults.value.envDiff.selected.additions,
  })
  setCurrentEnvironment(index)
}
</script>
