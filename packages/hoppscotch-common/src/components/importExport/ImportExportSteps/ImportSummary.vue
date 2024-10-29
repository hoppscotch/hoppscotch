<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { Ref, ref, watch } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  collections: HoppCollection[]
  onClose: () => void
}>()

type CountBlock = {
  count: number
  label: string
  id: string
}

const countBlocks: Ref<CountBlock[]> = ref([])

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

    countBlocks.value = [
      {
        count: collectionCount,
        label: "import.import_summary_collections_title",
        id: "collections_count",
      },
      {
        count: requestCount,
        label: "import.import_summary_requests_title",
        id: "requests_count",
      },
      {
        count: responseCount,
        label: "import.import_summary_responses_title",
        id: "responses_count",
      },
      {
        count: preRequestScriptsCount,
        label: "import.import_summary_pre_request_scripts_title",
        id: "pre_request_scripts_count",
      },
      {
        count: testScriptsCount,
        label: "import.import_summary_test_scripts_title",
        id: "test_scripts_count",
      },
    ]
  },
  {
    immediate: true,
  }
)
</script>

<template>
  <div class="space-y-4">
    <div v-for="countBlock in countBlocks" :key="countBlock.id">
      <p class="flex items-center">
        <span
          class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark text-green-500"
        >
          <icon-lucide-check-circle class="svg-icons" />
        </span>
        <span>{{ t(countBlock.label) }}</span>
      </p>

      <p class="ml-10 text-secondaryLight">
        {{ countBlock.count }}
        {{
          countBlock.count != 1
            ? t(countBlock.label)
            : t(countBlock.label).slice(0, -1)
        }}
        Imported
      </p>
    </div>
  </div>

  <div class="mt-10">
    <HoppButtonSecondary
      class="w-full"
      :label="t('action.close')"
      outline
      filled
      @click="
        () => {
          onClose()
        }
      "
    />
  </div>
</template>
