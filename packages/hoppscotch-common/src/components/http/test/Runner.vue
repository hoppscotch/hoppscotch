<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <div
        class="flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary sticky top-0 z-20"
      >
        <div class="inline-flex flex-1 gap-8">
          <HttpTestRunnerMeta
            :heading="t('collection.title')"
            :text="collectionName"
          />
          <template v-if="showResult">
            <HttpTestRunnerMeta
              :heading="t('environment.heading')"
              :text="'None'"
            />
            <HttpTestRunnerMeta :heading="t('test.iterations')" :text="'1'" />
            <HttpTestRunnerMeta
              :heading="t('test.duration')"
              :text="'10s 321ms'"
            />
            <HttpTestRunnerMeta
              :heading="t('test.avg_resp')"
              :text="'1234ms'"
            />
          </template>
        </div>
        <HoppButtonPrimary
          v-if="!showResult"
          :label="t('test.run')"
          class="w-32"
          @click="runTests()"
        />
        <HoppButtonPrimary
          v-if="showResult && !stopRunningTest"
          :label="t('test.stop')"
          class="w-32"
          @click="stopRunning()"
        />
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('test.new_run')"
          filled
          outline
          @click="newRun()"
        />
      </div>

      <div v-if="showResult">
        <HttpTestRunnerResult
          :config="testRunnerConfig"
          :collection="collection"
        />
      </div>

      <div v-else class="flex flex-col flex-1">
        <HttpTestRunnerConfig v-model="tab" v-model:config="testRunnerConfig" />
      </div>
    </template>
    <template #secondary>
      <!-- <HttpResponse v-model:document="tab.document" /> -->
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { computed, ref } from "vue"
import { HoppTestRunnerDocument } from "~/helpers/rest/document"
import { HoppTab } from "~/services/tab"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()

export type TestRunnerConfig = {
  iterations: number
  delay: number
  stopOnError: boolean
  persistResponses: boolean
  keepVariableValues: boolean
}

const testRunnerConfig = ref<TestRunnerConfig>({
  iterations: 1,
  delay: 0,
  stopOnError: false,
  persistResponses: false,
  keepVariableValues: false,
})

const props = defineProps<{ modelValue: HoppTab<HoppTestRunnerDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTestRunnerDocument>): void
}>()

const collectionName = computed(() => {
  if (props.modelValue.document.type === "test-runner") {
    return props.modelValue.document.collection.name
  }
  return ""
})

const tab = useVModel(props, "modelValue", emit)

const collection = computed(() => {
  return tab.value.document.collection
})

const runTests = () => {
  showResult.value = true
}

const showResult = ref(false)
const stopRunningTest = ref(false)

const stopRunning = () => {
  stopRunningTest.value = true
}

const newRun = () => {
  showResult.value = false
  stopRunningTest.value = false
}
</script>
