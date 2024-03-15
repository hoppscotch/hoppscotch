<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      :class="[
        isCollectionProperty
          ? 'top-propertiesPrimaryStickyFold'
          : 'top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold',
      ]"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("request.header_list") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/rest-api-testing"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear_all')"
          :icon="IconTrash2"
          @click="clearContent()"
        />
        <HoppButtonSecondary
          v-if="bulkHeaders"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': WRAP_LINES }"
          :icon="IconWrapText"
          @click.prevent="toggleNestedSetting('WRAP_LINES', 'httpHeaders')"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.bulk_mode')"
          :icon="IconEdit"
          :class="{ '!text-accent': bulkMode }"
          @click="bulkMode = !bulkMode"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('add.new')"
          :icon="IconPlus"
          :disabled="bulkMode"
          @click="addHeader"
        />
      </div>
    </div>
    <div v-if="bulkMode" class="h-full relative w-full">
      <div ref="bulkEditor" class="absolute inset-0"></div>
    </div>
    <div v-else>
      <draggable
        v-model="workingHeaders"
        :item-key="(header: WorkingHeader) => `header-${header.id}`"
        animation="250"
        handle=".draggable-handle"
        draggable=".draggable-content"
        ghost-class="cursor-move"
        chosen-class="bg-primaryLight"
        drag-class="cursor-grabbing"
      >
        <template #item="{ element: header, index }">
          <div
            class="draggable-content group flex divide-x divide-dividerLight border-b border-dividerLight"
          >
            <span>
              <HoppButtonSecondary
                v-tippy="{
                  theme: 'tooltip',
                  delay: [500, 20],
                  content:
                    index !== workingHeaders?.length - 1
                      ? t('action.drag_to_reorder')
                      : null,
                }"
                :icon="IconGripVertical"
                class="opacity-0"
                :class="{
                  'draggable-handle cursor-grab group-hover:opacity-100':
                    index !== workingHeaders?.length - 1,
                }"
                tabindex="-1"
              />
            </span>
            <SmartEnvInput
              v-model="header.key"
              :placeholder="`${t('count.header', { count: index + 1 })}`"
              :auto-complete-source="commonHeaders"
              :env-index="index"
              :inspection-results="getInspectorResult(headerKeyResults, index)"
              :auto-complete-env="true"
              :envs="envs"
              @change="
                updateHeader(index, {
                  id: header.id,
                  key: $event,
                  value: header.value,
                  active: header.active,
                })
              "
            />
            <SmartEnvInput
              v-model="header.value"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              :inspection-results="
                getInspectorResult(headerValueResults, index)
              "
              :env-index="index"
              :auto-complete-env="true"
              :envs="envs"
              @change="
                updateHeader(index, {
                  id: header.id,
                  key: header.key,
                  value: $event,
                  active: header.active,
                })
              "
            />
            <span>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="
                  header.hasOwnProperty('active')
                    ? header.active
                      ? t('action.turn_off')
                      : t('action.turn_on')
                    : t('action.turn_off')
                "
                :icon="
                  header.hasOwnProperty('active')
                    ? header.active
                      ? IconCheckCircle
                      : IconCircle
                    : IconCheckCircle
                "
                color="green"
                @click="
                  updateHeader(index, {
                    id: header.id,
                    key: header.key,
                    value: header.value,
                    active: !header.active,
                  })
                "
              />
            </span>
            <span>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.remove')"
                :icon="IconTrash"
                color="red"
                @click="deleteHeader(index)"
              />
            </span>
          </div>
        </template>
      </draggable>

      <draggable
        v-model="computedHeaders"
        item-key="id"
        animation="250"
        handle=".draggable-handle"
        draggable=".draggable-content"
        ghost-class="cursor-move"
        chosen-class="bg-primaryLight"
        drag-class="cursor-grabbing"
      >
        <template #item="{ element: header, index }">
          <div
            class="draggable-content group flex divide-x divide-dividerLight border-b border-dividerLight"
          >
            <span>
              <HoppButtonSecondary
                :icon="IconLock"
                class="cursor-auto bg-divider text-secondaryLight opacity-25"
                tabindex="-1"
              />
            </span>
            <SmartEnvInput
              v-model="header.header.key"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              readonly
            />
            <SmartEnvInput
              :model-value="mask(header)"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              readonly
            />
            <span>
              <HoppButtonSecondary
                v-if="header.source === 'auth'"
                v-tippy="{ theme: 'tooltip' }"
                :title="t(masking ? 'state.show' : 'state.hide')"
                :icon="masking ? IconEye : IconEyeOff"
                @click="toggleMask()"
              />
              <div v-else class="aspect-square w-8"></div>
            </span>
            <span>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :icon="IconArrowUpRight"
                :title="changeTabTooltip(header.source)"
                @click="changeTab(header.source)"
              />
            </span>
          </div>
        </template>
      </draggable>

      <draggable
        v-model="inheritedProperties"
        item-key="id"
        animation="250"
        handle=".draggable-handle"
        draggable=".draggable-content"
        ghost-class="cursor-move"
        chosen-class="bg-primaryLight"
        drag-class="cursor-grabbing"
      >
        <template #item="{ element: header, index }">
          <div
            class="draggable-content group flex divide-x divide-dividerLight border-b border-dividerLight"
          >
            <span>
              <HoppButtonSecondary
                :icon="IconLock"
                class="cursor-auto bg-divider text-secondaryLight opacity-25"
                tabindex="-1"
              />
            </span>
            <SmartEnvInput
              v-model="header.header.key"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              readonly
            />
            <SmartEnvInput
              :model-value="
                header.source === 'auth' ? mask(header) : header.header.value
              "
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              readonly
            />
            <HoppButtonSecondary
              v-if="header.source === 'auth'"
              v-tippy="{ theme: 'tooltip' }"
              :title="t(masking ? 'state.show' : 'state.hide')"
              :icon="masking && header.source === 'auth' ? IconEye : IconEyeOff"
              @click="toggleMask()"
            />
            <span v-else class="aspect-square w-[2.05rem]"></span>
            <span>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :icon="IconInfo"
                :title="`This header is inherited from Parent Collection ${
                  header.inheritedFrom ?? ''
                }`"
              />
            </span>
          </div>
        </template>
      </draggable>

      <HoppSmartPlaceholder
        v-if="workingHeaders.length === 0"
        :src="`/images/states/${colorMode.value}/add_category.svg`"
        :alt="`${t('empty.headers')}`"
        :text="t('empty.headers')"
      >
        <template #body>
          <HoppButtonSecondary
            filled
            :label="`${t('add.new')}`"
            :icon="IconPlus"
            @click="addHeader"
          />
        </template>
      </HoppSmartPlaceholder>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconPlus from "~icons/lucide/plus"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import IconTrash from "~icons/lucide/trash"
import IconLock from "~icons/lucide/lock"
import IconEye from "~icons/lucide/eye"
import IconEyeOff from "~icons/lucide/eye-off"
import IconArrowUpRight from "~icons/lucide/arrow-up-right"
import IconWrapText from "~icons/lucide/wrap-text"
import IconInfo from "~icons/lucide/info"
import { useColorMode } from "@composables/theming"
import { computed, reactive, ref, watch } from "vue"
import { isEqual, cloneDeep } from "lodash-es"
import {
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTRequest,
  parseRawKeyValueEntriesE,
  rawKeyValueEntriesToString,
  RawKeyValueEntry,
} from "@hoppscotch/data"
import { flow, pipe } from "fp-ts/function"
import * as RA from "fp-ts/ReadonlyArray"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import draggable from "vuedraggable-es"
import { RESTOptionTabs } from "./RequestOptions.vue"
import { useCodemirror } from "@composables/codemirror"
import { commonHeaders } from "~/helpers/headers"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import linter from "~/helpers/editor/linting/rawKeyValue"
import { throwError } from "~/helpers/functional/error"
import { objRemoveKey } from "~/helpers/functional/object"
import {
  ComputedHeader,
  getComputedHeaders,
  getComputedAuthHeaders,
} from "~/helpers/utils/EffectiveURL"
import {
  AggregateEnvironment,
  aggregateEnvs$,
  getAggregateEnvs,
} from "~/newstore/environments"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { InspectionService, InspectorResult } from "~/services/inspection"
import { RESTTabService } from "~/services/tab/rest"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const t = useI18n()
const toast = useToast()

const tabs = useService(RESTTabService)

const colorMode = useColorMode()

const idTicker = ref(0)

const bulkMode = ref(false)
const bulkHeaders = ref("")
const bulkEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "httpHeaders")

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

// v-model integration with props and emit
const props = defineProps<{
  modelValue:
    | HoppRESTRequest
    | {
        headers: HoppRESTHeader[]
        auth: HoppRESTAuth
      }
  isCollectionProperty?: boolean
  inheritedProperties?: HoppInheritedProperty
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "change-tab", value: RESTOptionTabs): void
  (e: "update:modelValue", value: HoppRESTRequest): void
}>()

const request = useVModel(props, "modelValue", emit)

useCodemirror(
  bulkEditor,
  bulkHeaders,
  reactive({
    extendedEditorConfig: {
      mode: "text/x-yaml",
      placeholder: `${t("state.bulk_mode_placeholder")}`,
      lineWrapping: WRAP_LINES,
    },
    linter,
    completer: null,
    environmentHighlights: true,
  })
)

type WorkingHeader = HoppRESTHeader & { id: number }

// The UI representation of the headers list (has the empty end headers)
const workingHeaders = ref<Array<WorkingHeader>>([
  {
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working Headers always have last element is always an empty header
watch(workingHeaders, (headersList) => {
  if (
    headersList.length > 0 &&
    headersList[headersList.length - 1].key !== ""
  ) {
    workingHeaders.value.push({
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between headers and working/bulk headers
watch(
  () => request.value.headers,
  (newHeadersList) => {
    // Sync should overwrite working headers
    const filteredWorkingHeaders = pipe(
      workingHeaders.value,
      A.filterMap(
        flow(
          O.fromPredicate((e) => e.key !== ""),
          O.map(objRemoveKey("id"))
        )
      )
    )

    const filteredBulkHeaders = pipe(
      parseRawKeyValueEntriesE(bulkHeaders.value),
      E.map(
        flow(
          RA.filter((e) => e.key !== ""),
          RA.toArray
        )
      ),
      E.getOrElse(() => [] as RawKeyValueEntry[])
    )

    if (!isEqual(newHeadersList, filteredWorkingHeaders)) {
      workingHeaders.value = pipe(
        newHeadersList,
        A.map((x) => ({ id: idTicker.value++, ...x }))
      )
    }

    if (!isEqual(newHeadersList, filteredBulkHeaders)) {
      bulkHeaders.value = rawKeyValueEntriesToString(newHeadersList)
    }
  },
  { immediate: true }
)

watch(workingHeaders, (newWorkingHeaders) => {
  const fixedHeaders = pipe(
    newWorkingHeaders,
    A.filterMap(
      flow(
        O.fromPredicate((e) => e.key !== ""),
        O.map(objRemoveKey("id"))
      )
    )
  )

  if (!isEqual(request.value.headers, fixedHeaders)) {
    request.value.headers = cloneDeep(fixedHeaders)
  }
})

watch(bulkHeaders, (newBulkHeaders) => {
  const filteredBulkHeaders = pipe(
    parseRawKeyValueEntriesE(newBulkHeaders),
    E.map(
      flow(
        RA.filter((e) => e.key !== ""),
        RA.toArray
      )
    ),
    E.getOrElse(() => [] as RawKeyValueEntry[])
  )

  if (!isEqual(props.modelValue, filteredBulkHeaders)) {
    request.value.headers = filteredBulkHeaders
  }
})

const addHeader = () => {
  workingHeaders.value.push({
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  })
}

const updateHeader = (
  index: number,
  header: HoppRESTHeader & { id: number }
) => {
  workingHeaders.value = workingHeaders.value.map((h, i) =>
    i === index ? header : h
  )
}

const deleteHeader = (index: number) => {
  const headersBeforeDeletion = cloneDeep(workingHeaders.value)

  if (
    !(
      headersBeforeDeletion.length > 0 &&
      index === headersBeforeDeletion.length - 1
    )
  ) {
    if (deletionToast.value) {
      deletionToast.value.goAway(0)
      deletionToast.value = null
    }

    deletionToast.value = toast.success(`${t("state.deleted")}`, {
      action: [
        {
          text: `${t("action.undo")}`,
          onClick: (_, toastObject) => {
            workingHeaders.value = headersBeforeDeletion
            toastObject.goAway(0)
            deletionToast.value = null
          },
        },
      ],

      onComplete: () => {
        deletionToast.value = null
      },
    })
  }

  workingHeaders.value = pipe(
    workingHeaders.value,
    A.deleteAt(index),
    O.getOrElseW(() => throwError("Working Headers Deletion Out of Bounds"))
  )
}

const clearContent = () => {
  // set params list to the initial state
  workingHeaders.value = [
    {
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkHeaders.value = ""
}

const aggregateEnvs = useReadonlyStream(aggregateEnvs$, getAggregateEnvs())

const computedHeaders = computed(() =>
  getComputedHeaders(request.value, aggregateEnvs.value, false).map(
    (header, index) => ({
      id: `header-${index}`,
      ...header,
    })
  )
)

const inheritedProperties = computed(() => {
  if (!props.inheritedProperties?.auth || !props.inheritedProperties.headers)
    return []

  //filter out headers that are already in the request headers

  const inheritedHeaders = props.inheritedProperties.headers.filter(
    (header) =>
      !request.value.headers.some(
        (requestHeader) => requestHeader.key === header.inheritedHeader?.key
      )
  )

  const headers = inheritedHeaders
    .filter(
      (header) =>
        header.inheritedHeader !== null &&
        header.inheritedHeader !== undefined &&
        header.inheritedHeader.active
    )
    .map((header, index) => ({
      inheritedFrom: props.inheritedProperties?.headers[index].parentName,
      source: "headers",
      id: `header-${index}`,
      header: {
        key: header.inheritedHeader?.key,
        value: header.inheritedHeader?.value,
        active: header.inheritedHeader?.active,
      },
    }))

  let auth = [] as {
    inheritedFrom: string
    source: "auth"
    id: string
    header: {
      key: string
      value: string
      active: boolean
    }
  }[]

  const computedAuthHeader = getComputedAuthHeaders(
    aggregateEnvs.value,
    request.value,
    props.inheritedProperties.auth.inheritedAuth,
    false
  )[0]

  if (
    computedAuthHeader &&
    request.value.auth.authType === "inherit" &&
    request.value.auth.authActive
  ) {
    auth = [
      {
        inheritedFrom: props.inheritedProperties?.auth.parentName,
        source: "auth",
        id: `header-auth`,
        header: computedAuthHeader,
      },
    ]
  }

  return [...headers, ...auth]
})

const masking = ref(true)

const toggleMask = () => {
  masking.value = !masking.value
}

const mask = (header: ComputedHeader) => {
  if (header.source === "auth" && masking.value)
    return header.header.value.replace(/\S/gi, "*")
  return header.header.value
}

const changeTabTooltip = (tab: ComputedHeader["source"]) => {
  switch (tab) {
    case "auth":
      return t("request.go_to_authorization_tab")
    case "body":
      return t("request.go_to_body_tab")
  }
}

const changeTab = (tab: ComputedHeader["source"]) => {
  if (tab === "auth") emit("change-tab", "authorization")
  else emit("change-tab", "bodyParams")
}

const inspectionService = useService(InspectionService)

const headerKeyResults = inspectionService.getResultViewFor(
  tabs.currentTabID.value,
  (result) =>
    result.locations.type === "header" && result.locations.position === "key"
)

const headerValueResults = inspectionService.getResultViewFor(
  tabs.currentTabID.value,
  (result) =>
    result.locations.type === "header" && result.locations.position === "value"
)

const getInspectorResult = (results: InspectorResult[], index: number) => {
  return results.filter((result) => {
    if (result.locations.type === "url" || result.locations.type === "response")
      return
    return result.locations.index === index
  })
}
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperTertiaryStickyFold #{!important};
}
</style>
