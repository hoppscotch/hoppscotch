<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("request.parameter_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/parameters"
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
          @click.native="addParam"
        />
      </div>
    </div>
    <div v-if="bulkMode" ref="bulkEditor" class="flex flex-col flex-1"></div>
    <div v-else>
      <div
        v-for="(param, index) in workingParams"
        :key="`param-${param.id}`"
        class="flex border-b divide-x divide-dividerLight border-dividerLight"
      >
        <SmartEnvInput
          v-model="param.key"
          :placeholder="`${t('count.parameter', { count: index + 1 })}`"
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
              updateParam(index, {
                id: param.id,
                key: param.key,
                value: param.value,
                active: param.hasOwnProperty('active') ? !param.active : false,
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
            @click.native="deleteParam(index)"
          />
        </span>
      </div>
      <div
        v-if="workingParams.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${$colorMode.value}/add_files.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.parameters')}`"
        />
        <span class="pb-4 text-center">
          {{ t("empty.parameters") }}
        </span>
        <ButtonSecondary
          :label="`${t('add.new')}`"
          svg="plus"
          filled
          class="mb-4"
          @click.native="addParam"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
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
import isEqual from "lodash/isEqual"
import cloneDeep from "lodash/cloneDeep"
import linter from "~/helpers/editor/linting/rawKeyValue"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { useI18n, useToast, useStream } from "~/helpers/utils/composables"
import { restParams$, setRESTParams } from "~/newstore/RESTSession"
import { throwError } from "~/helpers/functional/error"
import { objRemoveKey } from "~/helpers/functional/object"

const t = useI18n()

const toast = useToast()

const idTicker = ref(0)

const bulkMode = ref(false)
const bulkParams = ref("")

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

const bulkEditor = ref<any | null>(null)

useCodemirror(bulkEditor, bulkParams, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter,
  completer: null,
  environmentHighlights: true,
})

// The functional parameters list (the parameters actually applied to the session)
const params = useStream(restParams$, [], setRESTParams)

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
</script>
