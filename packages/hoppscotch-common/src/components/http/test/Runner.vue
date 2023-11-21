<template>
  <AppPaneLayout layout-id="rest-primary">
    <template #primary>
      <div
        class="flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary sticky top-0 z-20"
      >
        <div class="inline-flex flex-1 gap-8">
          <div v-for="item in arr" :key="item.name" class="flex flex-col">
            <span class="text-xs text-secondaryLight mb-1">
              {{ item.name }}
            </span>
            <span class="text-sm font-bold text-secondaryDark">
              {{ item.value }}
            </span>
          </div>
        </div>
        <HoppButtonPrimary label="Run" class="w-32" name="connect" />
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="`New Run`"
          filled
          outline
        />
      </div>

      <div v-if="showResult">
        <HoppSmartTabs
          v-model="selectedTestTab"
          styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10"
          render-inactive-tabs
        >
          <HoppSmartTab
            :id="'all_tests'"
            :label="`${t('tab.all_tests')}`"
            :info="`${8}`"
          >
            <div class="flex flex-col justify-center p-4">
              <!-- <HttpTestResult v-model="tab.document.testResults" /> -->
            </div>
          </HoppSmartTab>
          <HoppSmartTab
            :id="'passed'"
            :label="`${t('tab.passed')}`"
            :info="`${3}`"
          >
            tab passed
          </HoppSmartTab>
          <HoppSmartTab
            :id="'failed'"
            :label="`${t('tab.failed')}`"
            :info="`${5}`"
          >
            tab failed
          </HoppSmartTab>
        </HoppSmartTabs>
      </div>

      <div v-else class="flex flex-col flex-1">
        <HttpTestRunnerConfig v-model="tab" />
      </div>
    </template>
    <template #secondary>
      <HttpResponse v-model:document="tab.document" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import { ref } from "vue"
import { useVModel } from "@vueuse/core"
import { HoppTab } from "~/services/tab"
import { HoppTabDocument } from "~/helpers/rest/document"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const arr = [
  {
    name: "Collection",
    value: "Twitter API V3",
  },
  {
    name: "Environment",
    value: "None",
  },
  // {
  //   name: "Iteration",
  //   value: "4",
  // },
  // {
  //   name: "Duration",
  //   value: "6s 123ms",
  // },
  // {
  //   name: "Avg. Response Time",
  //   value: "1.5s",
  // },
]
const props = defineProps<{ modelValue: HoppTab<HoppTabDocument> }>()

const emit = defineEmits<{
  (e: "update:modelValue", val: HoppTab<HoppTabDocument>): void
}>()

const tab = useVModel(props, "modelValue", emit)

const showResult = ref(false)
const selectedTestTab = ref("all_tests")
</script>
