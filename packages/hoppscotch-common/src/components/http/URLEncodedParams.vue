<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperMobileStickyFold sm:top-upperMobileTertiaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("request.body") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
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
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
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
          @click="addUrlEncodedParam"
        />
      </div>
    </div>
    <div v-if="bulkMode" ref="bulkEditor" class="flex flex-col flex-1"></div>
    <div v-else>
      <draggable
        v-model="workingUrlEncodedParams"
        :item-key="(param) => `param-${param.id}`"
        animation="250"
        handle=".draggable-handle"
        draggable=".draggable-content"
        ghost-class="cursor-move"
        chosen-class="bg-primaryLight"
        drag-class="cursor-grabbing"
      >
        <template #item="{ element: param, index }">
          <div
            class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
          >
            <span>
              <HoppButtonSecondary
                v-tippy="{
                  theme: 'tooltip',
                  delay: [500, 20],
                  content:
                    index !== workingUrlEncodedParams?.length - 1
                      ? t('action.drag_to_reorder')
                      : null,
                }"
                :icon="IconGripVertical"
                class="cursor-auto text-primary hover:text-primary"
                :class="{
                  'draggable-handle group-hover:text-secondaryLight !cursor-grab':
                    index !== workingUrlEncodedParams?.length - 1,
                }"
                tabindex="-1"
              />
            </span>
            <SmartEnvInput
              v-model="param.key"
              :placeholder="`${t('count.parameter', { count: index + 1 })}`"
              @change="
                updateUrlEncodedParam(index, {
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
              @change="
                updateUrlEncodedParam(index, {
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
                  updateUrlEncodedParam(index, {
                    id: param.id,
                    key: param.key,
                    value: param.value,
                    active: !param.active,
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
                @click="deleteUrlEncodedParam(index)"
              />
            </span>
          </div>
        </template>
      </draggable>
      <div
        v-if="workingUrlEncodedParams.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${colorMode.value}/add_category.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.body')}`"
        />
        <span class="pb-4 text-center">
          {{ t("empty.body") }}
        </span>
        <HoppButtonSecondary
          filled
          :label="`${t('add.new')}`"
          :icon="IconPlus"
          class="mb-4"
          @click="addUrlEncodedParam"
        />
      </div>
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
import { computed, reactive, ref, watch } from "vue"
import { isEqual, cloneDeep } from "lodash-es"
import {
  parseRawKeyValueEntries,
  parseRawKeyValueEntriesE,
  rawKeyValueEntriesToString,
  RawKeyValueEntry,
} from "@hoppscotch/data"
import { flow, pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import * as RA from "fp-ts/ReadonlyArray"
import * as E from "fp-ts/Either"
import draggable from "vuedraggable-es"
import { useCodemirror } from "@composables/codemirror"
import linter from "~/helpers/editor/linting/rawKeyValue"
import { useRESTRequestBody } from "~/newstore/RESTSession"
import { pluckRef } from "@composables/ref"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import { objRemoveKey } from "~/helpers/functional/object"
import { throwError } from "~/helpers/functional/error"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const idTicker = ref(0)

const bulkMode = ref(false)
const bulkUrlEncodedParams = ref("")
const bulkEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(
  bulkEditor,
  bulkUrlEncodedParams,
  reactive({
    extendedEditorConfig: {
      mode: "text/x-yaml",
      placeholder: `${t("state.bulk_mode_placeholder")}`,
      lineWrapping: linewrapEnabled,
    },
    linter,
    completer: null,
    environmentHighlights: true,
  })
)

// The functional urlEncodedParams list (the urlEncodedParams actually in the system)
const urlEncodedParamsRaw = pluckRef(useRESTRequestBody(), "body")

const urlEncodedParams = computed<RawKeyValueEntry[]>({
  get() {
    return typeof urlEncodedParamsRaw.value == "string"
      ? parseRawKeyValueEntries(urlEncodedParamsRaw.value)
      : []
  },
  set(newValue) {
    urlEncodedParamsRaw.value = rawKeyValueEntriesToString(newValue)
  },
})

// The UI representation of the urlEncodedParams list (has the empty end urlEncodedParam)
const workingUrlEncodedParams = ref<Array<RawKeyValueEntry & { id: number }>>([
  {
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working urlEncodedParams always have one empty urlEncodedParam or the last element is always an empty urlEncodedParams
watch(workingUrlEncodedParams, (urlEncodedParamList) => {
  if (
    urlEncodedParamList.length > 0 &&
    urlEncodedParamList[urlEncodedParamList.length - 1].key !== ""
  ) {
    workingUrlEncodedParams.value.push({
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between urlEncodedParams and working urlEncodedParams
watch(
  urlEncodedParams,
  (newurlEncodedParamList) => {
    const filteredWorkingUrlEncodedParams = pipe(
      workingUrlEncodedParams.value,
      A.filterMap(
        flow(
          O.fromPredicate((x) => x.key !== ""),
          O.map(objRemoveKey("id"))
        )
      )
    )

    const filteredBulkUrlEncodedParams = pipe(
      parseRawKeyValueEntriesE(bulkUrlEncodedParams.value),
      E.map(
        flow(
          RA.filter((e) => e.key !== ""),
          RA.toArray
        )
      )
    )

    if (!isEqual(newurlEncodedParamList, filteredWorkingUrlEncodedParams)) {
      workingUrlEncodedParams.value = pipe(
        newurlEncodedParamList,
        A.map((x) => ({ id: idTicker.value++, ...x }))
      )
    }

    if (!isEqual(newurlEncodedParamList, filteredBulkUrlEncodedParams)) {
      bulkUrlEncodedParams.value = rawKeyValueEntriesToString(
        newurlEncodedParamList
      )
    }
  },
  { immediate: true }
)

watch(workingUrlEncodedParams, (newWorkingUrlEncodedParams) => {
  const fixedUrlEncodedParams = pipe(
    newWorkingUrlEncodedParams,
    A.filterMap(
      flow(
        O.fromPredicate((e) => e.key !== ""),
        O.map(objRemoveKey("id"))
      )
    )
  )

  if (!isEqual(urlEncodedParams.value, fixedUrlEncodedParams)) {
    urlEncodedParams.value = fixedUrlEncodedParams
  }
})

watch(bulkUrlEncodedParams, (newBulkUrlEncodedParams) => {
  const filteredBulkParams = pipe(
    parseRawKeyValueEntriesE(newBulkUrlEncodedParams),
    E.map(
      flow(
        RA.filter((e) => e.key !== ""),
        RA.toArray
      )
    ),
    E.getOrElse(() => [] as RawKeyValueEntry[])
  )

  if (!isEqual(urlEncodedParams.value, filteredBulkParams)) {
    urlEncodedParams.value = filteredBulkParams
  }
})

const addUrlEncodedParam = () => {
  workingUrlEncodedParams.value.push({
    id: idTicker.value++,
    key: "",
    value: "",
    active: true,
  })
}

const updateUrlEncodedParam = (
  index: number,
  param: RawKeyValueEntry & { id: number }
) => {
  workingUrlEncodedParams.value = workingUrlEncodedParams.value.map((p, i) =>
    i === index ? param : p
  )
}

const deleteUrlEncodedParam = (index: number) => {
  const urlEncodedParamsBeforeDeletion = cloneDeep(
    workingUrlEncodedParams.value
  )

  if (
    !(
      urlEncodedParamsBeforeDeletion.length > 0 &&
      index === urlEncodedParamsBeforeDeletion.length - 1
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
            workingUrlEncodedParams.value = urlEncodedParamsBeforeDeletion
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

  workingUrlEncodedParams.value = pipe(
    workingUrlEncodedParams.value,
    A.deleteAt(index),
    O.getOrElseW(() =>
      throwError("Working URL Encoded Params Deletion Out of Bounds")
    )
  )
}

const clearContent = () => {
  // set urlEncodedParams list to the initial state
  workingUrlEncodedParams.value = [
    {
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkUrlEncodedParams.value = ""
}
</script>
