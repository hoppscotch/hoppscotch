<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-upperMobileSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4 sm:top-upperSecondaryStickyFold"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("request.parameter_list") }}
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
          v-if="bulkMode"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': WRAP_LINES }"
          :icon="IconWrapText"
          @click.prevent="toggleNestedSetting('WRAP_LINES', 'httpParams')"
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
          @click="addParam"
        />
      </div>
    </div>
    <div v-if="bulkMode" class="h-full relative">
      <div ref="bulkEditor" class="absolute inset-0"></div>
    </div>
    <div v-else>
      <draggable
        v-model="workingParams"
        item-key="id"
        animation="250"
        handle=".draggable-handle"
        draggable=".draggable-content"
        ghost-class="cursor-move"
        chosen-class="bg-primaryLight"
        drag-class="cursor-grabbing"
      >
        <template #item="{ element: param, index }">
          <div
            class="draggable-content group flex divide-x divide-dividerLight border-b border-dividerLight"
          >
            <span>
              <HoppButtonSecondary
                v-tippy="{
                  theme: 'tooltip',
                  delay: [500, 20],
                  content:
                    index !== workingParams?.length - 1
                      ? t('action.drag_to_reorder')
                      : null,
                }"
                :icon="IconGripVertical"
                class="opacity-0"
                :class="{
                  'draggable-handle cursor-grab group-hover:opacity-100':
                    index !== workingParams?.length - 1,
                }"
                tabindex="-1"
              />
            </span>
            <SmartEnvInput
              v-model="param.key"
              :placeholder="`${t('count.parameter', { count: index + 1 })}`"
              :inspection-results="
                getInspectorResult(parameterKeyResults, index)
              "
              :auto-complete-env="true"
              :envs="envs"
              @change="
                updateParam(index, {
                  id: param.id,
                  key: $event,
                  value: param.value,
                  active: param.active,
                })
              "
            />
            <SmartEnvInput
              v-model="param.value"
              :placeholder="`${t('count.value', { count: index + 1 })}`"
              :inspection-results="
                getInspectorResult(parameterValueResults, index)
              "
              :auto-complete-env="true"
              :envs="envs"
              @change="
                updateParam(index, {
                  id: param.id,
                  key: param.key,
                  value: $event,
                  active: param.active,
                })
              "
            />
            <span>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="
                  param.hasOwnProperty('active')
                    ? param.active
                      ? t('action.turn_off')
                      : t('action.turn_on')
                    : t('action.turn_off')
                "
                :icon="
                  param.hasOwnProperty('active')
                    ? param.active
                      ? IconCheckCircle
                      : IconCircle
                    : IconCheckCircle
                "
                color="green"
                @click="
                  updateParam(index, {
                    id: param.id,
                    key: param.key,
                    value: param.value,
                    active: param.hasOwnProperty('active')
                      ? !param.active
                      : false,
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
                @click="deleteParam(index)"
              />
            </span>
          </div>
        </template>
      </draggable>
      <HoppSmartPlaceholder
        v-if="workingParams.length === 0"
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('empty.parameters')}`"
        :text="t('empty.parameters')"
      >
        <template #body>
          <HoppButtonSecondary
            :label="`${t('add.new')}`"
            :icon="IconPlus"
            filled
            @click="addParam"
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
import IconWrapText from "~icons/lucide/wrap-text"
import { reactive, ref, watch } from "vue"
import { flow, pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import * as E from "fp-ts/Either"
import {
  HoppRESTParam,
  parseRawKeyValueEntriesE,
  rawKeyValueEntriesToString,
  RawKeyValueEntry,
} from "@hoppscotch/data"
import { isEqual, cloneDeep } from "lodash-es"
import draggable from "vuedraggable-es"
import linter from "~/helpers/editor/linting/rawKeyValue"
import { useCodemirror } from "@composables/codemirror"
import { useColorMode } from "@composables/theming"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { throwError } from "@functional/error"
import { objRemoveKey } from "@functional/object"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { InspectionService, InspectorResult } from "~/services/inspection"
import { RESTTabService } from "~/services/tab/rest"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { AggregateEnvironment } from "~/newstore/environments"

const colorMode = useColorMode()

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const idTicker = ref(0)

const bulkMode = ref(false)
const bulkParams = ref("")
const bulkEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "httpParams")

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(
  bulkEditor,
  bulkParams,
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

const props = defineProps<{
  modelValue: HoppRESTParam[]
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: Array<HoppRESTParam>): void
}>()

// The functional parameters list (the parameters actually applied to the session)
const params = useVModel(props, "modelValue", emit)

// The UI representation of the parameters list (has the empty end param)
const workingParams = ref<Array<HoppRESTParam & { id: number }>>([
  {
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working Params always have last element is always an empty param
watch(workingParams, (paramsList) => {
  if (paramsList.length > 0 && paramsList[paramsList.length - 1].key !== "") {
    workingParams.value.push({
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between params and working/bulk params
watch(
  params,
  (newParamsList) => {
    // Sync should overwrite working params
    const filteredWorkingParams: HoppRESTParam[] = pipe(
      workingParams.value,
      A.filterMap(
        flow(
          O.fromPredicate((e) => e.key !== ""),
          O.map(objRemoveKey("id"))
        )
      )
    )

    const filteredBulkParams = pipe(
      parseRawKeyValueEntriesE(bulkParams.value),
      E.map(
        flow(
          RA.filter((e) => e.key !== ""),
          RA.toArray
        )
      ),
      E.getOrElse(() => [] as RawKeyValueEntry[])
    )

    if (!isEqual(newParamsList, filteredWorkingParams)) {
      workingParams.value = pipe(
        newParamsList,
        A.map((x) => ({ id: idTicker.value++, ...x }))
      )
    }

    if (!isEqual(newParamsList, filteredBulkParams)) {
      bulkParams.value = rawKeyValueEntriesToString(newParamsList)
    }
  },
  { immediate: true }
)

watch(workingParams, (newWorkingParams) => {
  const fixedParams = pipe(
    newWorkingParams,
    A.filterMap(
      flow(
        O.fromPredicate((e) => e.key !== ""),
        O.map(objRemoveKey("id"))
      )
    )
  )

  if (!isEqual(params.value, fixedParams)) {
    params.value = cloneDeep(fixedParams)
  }
})

watch(bulkParams, (newBulkParams) => {
  const filteredBulkParams = pipe(
    parseRawKeyValueEntriesE(newBulkParams),
    E.map(
      flow(
        RA.filter((e) => e.key !== ""),
        RA.toArray
      )
    ),
    E.getOrElse(() => [] as RawKeyValueEntry[])
  )

  if (!isEqual(params.value, filteredBulkParams)) {
    params.value = filteredBulkParams
  }
})

const addParam = () => {
  workingParams.value.push({
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  })
}

const updateParam = (index: number, param: HoppRESTParam & { id: number }) => {
  workingParams.value = workingParams.value.map((h, i) =>
    i === index ? param : h
  )
}

const deleteParam = (index: number) => {
  const paramsBeforeDeletion = cloneDeep(workingParams.value)

  if (
    !(
      paramsBeforeDeletion.length > 0 &&
      index === paramsBeforeDeletion.length - 1
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
            workingParams.value = paramsBeforeDeletion
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

  workingParams.value = pipe(
    workingParams.value,
    A.deleteAt(index),
    O.getOrElseW(() => throwError("Working Params Deletion Out of Bounds"))
  )
}

const clearContent = () => {
  // set params list to the initial state
  workingParams.value = [
    {
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkParams.value = ""
}

const inspectionService = useService(InspectionService)

const parameterKeyResults = inspectionService.getResultViewFor(
  tabs.currentTabID.value,
  (result) =>
    result.locations.type === "parameter" && result.locations.position === "key"
)

const parameterValueResults = inspectionService.getResultViewFor(
  tabs.currentTabID.value,
  (result) =>
    result.locations.type === "parameter" &&
    result.locations.position === "value"
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
