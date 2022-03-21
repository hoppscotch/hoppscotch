<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperMobileRawStickyFold sm:top-upperMobileRawTertiaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("request.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear_all')"
          svg="trash-2"
          @click.native="clearContent()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.bulk_mode')"
          svg="edit"
          :class="{ '!text-accent': bulkMode }"
          @click.native="bulkMode = !bulkMode"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('add.new')"
          svg="plus"
          :disabled="bulkMode"
          @click.native="addUrlEncodedParam"
        />
      </div>
    </div>
    <div v-if="bulkMode" ref="bulkEditor" class="flex flex-col flex-1"></div>
    <div v-else>
      <div
        v-for="(param, index) in workingUrlEncodedParams"
        :key="`param-${param.id}-${index}`"
        class="flex border-b divide-x divide-dividerLight border-dividerLight"
      >
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
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="
              param.hasOwnProperty('active')
                ? param.active
                  ? t('action.turn_off')
                  : t('action.turn_on')
                : t('action.turn_off')
            "
            :svg="
              param.hasOwnProperty('active')
                ? param.active
                  ? 'check-circle'
                  : 'circle'
                : 'check-circle'
            "
            color="green"
            @click.native="
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
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.remove')"
            svg="trash"
            color="red"
            @click.native="deleteUrlEncodedParam(index)"
          />
        </span>
      </div>
      <div
        v-if="workingUrlEncodedParams.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${$colorMode.value}/add_category.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.body')}`"
        />
        <span class="pb-4 text-center">
          {{ t("empty.body") }}
        </span>
        <ButtonSecondary
          filled
          :label="`${t('add.new')}`"
          svg="plus"
          class="mb-4"
          @click.native="addUrlEncodedParam"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, Ref, ref, watch } from "@nuxtjs/composition-api"
import isEqual from "lodash/isEqual"
import {
  HoppRESTReqBody,
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
import { cloneDeep } from "lodash"
import { useCodemirror } from "~/helpers/editor/codemirror"
import linter from "~/helpers/editor/linting/rawKeyValue"
import { useRESTRequestBody } from "~/newstore/RESTSession"
import { pluckRef, useI18n, useToast } from "~/helpers/utils/composables"
import { objRemoveKey } from "~/helpers/functional/object"
import { throwError } from "~/helpers/functional/error"

const t = useI18n()
const toast = useToast()

const idTicker = ref(0)

const bulkMode = ref(false)
const bulkUrlEncodedParams = ref("")
const bulkEditor = ref<any | null>(null)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(bulkEditor, bulkUrlEncodedParams, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter,
  completer: null,
  environmentHighlights: true,
})

// The functional urlEncodedParams list (the urlEncodedParams actually in the system)
const urlEncodedParamsRaw = pluckRef(
  useRESTRequestBody() as Ref<
    HoppRESTReqBody & { contentType: "application/x-www-form-urlencoded" }
  >,
  "body"
)

const urlEncodedParams = computed<RawKeyValueEntry[]>({
  get() {
    return parseRawKeyValueEntries(urlEncodedParamsRaw.value)
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
