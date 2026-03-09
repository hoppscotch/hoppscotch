<template>
  <div class="flex flex-col p-1">
    <div class="space-y-4 p-1">
      <div v-for="feature in visibleFeatures" :key="feature.id">
        <p class="flex items-center">
          <span
            class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary"
            :class="{
              'text-green-500':
                featureSupportForImportFormat[feature.id] === 'SUPPORTED' ||
                featureSupportForImportFormat[feature.id] === 'SKIPPED',
              'text-amber-500':
                featureSupportForImportFormat[feature.id] ===
                'NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT',
            }"
          >
            <icon-lucide-check-circle
              v-if="
                featureSupportForImportFormat[feature.id] === 'SUPPORTED' ||
                featureSupportForImportFormat[feature.id] === 'SKIPPED'
              "
              class="svg-icons"
            />

            <IconInfo
              v-else-if="
                featureSupportForImportFormat[feature.id] ===
                'NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT'
              "
              class="svg-icons"
            />
          </span>
          <span>{{ t(feature.label) }}</span>
        </p>

        <p class="ml-10 text-secondaryLight">
          <template
            v-if="featureSupportForImportFormat[feature.id] === 'SUPPORTED'"
          >
            {{ feature.count }}
            {{
              feature.count != 1
                ? t(feature.label)
                : t(feature.label).slice(0, -1)
            }}
            Imported
          </template>

          <template
            v-else-if="featureSupportForImportFormat[feature.id] === 'SKIPPED'"
          >
            0 {{ t(feature.label) }} Imported
          </template>

          <template
            v-else-if="
              featureSupportForImportFormat[feature.id] ===
              'NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT'
            "
          >
            <!-- Special message for Postman scripts when using legacy sandbox -->
            <template
              v-if="
                importFormat === 'postman' &&
                (feature.id === 'preRequestScripts' ||
                  feature.id === 'testScripts') &&
                scriptsImported === undefined
              "
            >
              0 {{ t(feature.label) }} Imported
            </template>
            <!-- Generic message for other unsupported features -->
            <template v-else>
              {{
                t("import.import_summary_not_supported_by_hoppscotch_import", {
                  featureLabel: t(feature.label),
                })
              }}
            </template>
          </template>
        </p>
      </div>
    </div>

    <!-- Informational banner for script imports when experimental sandbox is disabled -->
    <div
      v-if="showScriptImportInfo"
      class="mt-6 flex items-start space-x-3 rounded border border-dividerLight shadow-sm bg-primaryLight px-2 py-4"
    >
      <IconInfo class="flex-shrink-0 text-accent svg-icons" />
      <div class="flex-1 space-y-2">
        <p class="font-semibold text-secondary">
          {{ totalScriptsCount }}
          {{
            totalScriptsCount === 1
              ? t("import.import_summary_script_found")
              : t("import.import_summary_scripts_found")
          }}
        </p>
        <p class="text-secondaryLight">
          {{ t("import.import_summary_enable_experimental_sandbox") }}
        </p>
      </div>
    </div>

    <div class="mt-9">
      <HoppButtonSecondary
        class="w-full"
        :label="t('action.close')"
        outline
        filled
        @click="onClose"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed, Ref, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"
import IconInfo from "~icons/lucide/info"
import { SupportedImportFormat } from "./../types"

const t = useI18n()

type Feature =
  | "collections"
  | "requests"
  | "responses"
  | "preRequestScripts"
  | "testScripts"

type FeatureStatus =
  | "SUPPORTED"
  | "NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT"
  | "NOT_SUPPORTED_BY_SOURCE"
  | "SKIPPED"

type FeatureWithCount = {
  count: number
  label: string
  id: Feature
}

const props = defineProps<{
  importFormat: SupportedImportFormat
  collections: HoppCollection[]
  scriptsImported?: boolean
  originalScriptCounts?: { preRequest: number; test: number }
  onClose: () => void
}>()

const importSourceAndSupportedFeatures: Record<
  SupportedImportFormat,
  Record<Feature, FeatureStatus>
> = {
  hoppscotch: {
    collections: "SUPPORTED",
    requests: "SUPPORTED",
    responses: "SUPPORTED",
    preRequestScripts: "SUPPORTED",
    testScripts: "SUPPORTED",
  },
  postman: {
    collections: "SUPPORTED",
    requests: "SUPPORTED",
    responses: "SUPPORTED",
    preRequestScripts: "NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT",
    testScripts: "NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT",
  },
  insomnia: {
    collections: "SUPPORTED",
    requests: "SUPPORTED",
    responses: "NOT_SUPPORTED_BY_SOURCE",
    preRequestScripts: "NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT",
    testScripts: "NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT",
  },
  openapi: {
    collections: "SUPPORTED",
    requests: "SUPPORTED",
    responses: "SUPPORTED",
    preRequestScripts: "NOT_SUPPORTED_BY_SOURCE",
    testScripts: "NOT_SUPPORTED_BY_SOURCE",
  },
  har: {
    collections: "SUPPORTED",
    requests: "SUPPORTED",
    responses: "NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT",
    preRequestScripts: "NOT_SUPPORTED_BY_SOURCE",
    testScripts: "NOT_SUPPORTED_BY_SOURCE",
  },
}

const featuresWithCount: Ref<FeatureWithCount[]> = ref([])

const countCollections = (collections: HoppCollection[]) => {
  let collectionCount = 0
  let requestCount = 0
  let preRequestScriptsCount = 0
  let testScriptsCount = 0
  let responseCount = 0

  const flattenHoppCollections = (_collections: HoppCollection[]) => {
    _collections.forEach((collection) => {
      collectionCount++

      collection.requests.forEach((request) => {
        requestCount++

        const _request = request as HoppRESTRequest

        preRequestScriptsCount += !!_request.preRequestScript?.trim() ? 1 : 0
        testScriptsCount += !!_request.testScript?.trim() ? 1 : 0

        responseCount += _request.responses
          ? Object.values(_request.responses).length
          : 0
      })

      flattenHoppCollections(collection.folders)
    })
  }

  flattenHoppCollections(collections)

  return {
    collectionCount,
    requestCount,
    responseCount,
    preRequestScriptsCount,
    testScriptsCount,
  }
}

watch(
  props.collections,
  (collections) => {
    const {
      collectionCount,
      requestCount,
      responseCount,
      preRequestScriptsCount,
      testScriptsCount,
    } = countCollections(collections)

    featuresWithCount.value = [
      {
        count: collectionCount,
        label: "import.import_summary_collections_title",
        id: "collections" as const,
      },
      {
        count: requestCount,
        label: "import.import_summary_requests_title",
        id: "requests" as const,
      },
      {
        count: responseCount,
        label: "import.import_summary_responses_title",
        id: "responses" as const,
      },
      {
        count: preRequestScriptsCount,
        label: "import.import_summary_pre_request_scripts_title",
        id: "preRequestScripts" as const,
      },
      {
        count: testScriptsCount,
        label: "import.import_summary_post_request_scripts_title",
        id: "testScripts" as const,
      },
    ]
  },
  {
    immediate: true,
  }
)

const featureSupportForImportFormat = computed(() => {
  const baseSupport = importSourceAndSupportedFeatures[props.importFormat]

  // Handle Postman script import status
  if (props.importFormat === "postman") {
    if (props.scriptsImported === true) {
      // User checked the box and imported scripts
      return {
        ...baseSupport,
        preRequestScripts: "SUPPORTED" as FeatureStatus,
        testScripts: "SUPPORTED" as FeatureStatus,
      }
    } else if (props.scriptsImported === false) {
      // User explicitly didn't import scripts (checkbox unchecked)
      return {
        ...baseSupport,
        preRequestScripts: "SKIPPED" as FeatureStatus,
        testScripts: "SKIPPED" as FeatureStatus,
      }
    }
    // props.scriptsImported === undefined means legacy sandbox or old import
    // Keep default NOT_SUPPORTED_BY_HOPPSCOTCH_IMPORT
  }

  return baseSupport
})

const visibleFeatures = computed(() => {
  return featuresWithCount.value.filter((feature) => {
    return (
      importSourceAndSupportedFeatures[props.importFormat][feature.id] !==
      "NOT_SUPPORTED_BY_SOURCE"
    )
  })
})

const showScriptImportInfo = computed(() => {
  return (
    props.importFormat === "postman" &&
    props.scriptsImported === undefined &&
    totalScriptsCount.value > 0
  )
})

const totalScriptsCount = computed(() => {
  if (props.importFormat !== "postman" || props.scriptsImported !== undefined)
    return 0

  // Use original counts from raw Postman JSON
  const preRequestScripts = props.originalScriptCounts?.preRequest || 0
  const testScripts = props.originalScriptCounts?.test || 0

  return preRequestScripts + testScripts
})
</script>
