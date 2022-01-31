<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperTertiaryStickyFold"
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
    <div v-if="bulkMode" ref="bulkEditor"></div>
    <div v-else>
      <div
        v-for="(param, index) in workingUrlEncodedParams"
        :key="`param-${index}`"
        class="flex border-b divide-x divide-dividerLight border-dividerLight"
      >
        <SmartEnvInput
          v-model="param.key"
          :placeholder="`${t('count.parameter', { count: index + 1 })}`"
          styles="
            bg-transparent
            flex
            flex-1
            py-1
            px-4
          "
          @change="
            updateUrlEncodedParam(index, {
              key: $event,
              value: param.value,
              active: param.active,
            })
          "
        />
        <SmartEnvInput
          v-model="param.value"
          :placeholder="`${t('count.value', { count: index + 1 })}`"
          styles="
            bg-transparent
            flex
            flex-1
            py-1
            px-4
          "
          @change="
            updateUrlEncodedParam(index, {
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
import clone from "lodash/clone"
import { HoppRESTReqBody } from "@hoppscotch/data"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { useRESTRequestBody } from "~/newstore/RESTSession"
import { pluckRef, useI18n, useToast } from "~/helpers/utils/composables"
import {
  parseRawKeyValueEntries,
  rawKeyValueEntriesToString,
  RawKeyValueEntry,
} from "~/helpers/rawKeyValue"

const t = useI18n()
const toast = useToast()

const bulkMode = ref(false)
const bulkUrlEncodedParams = ref("")
const bulkEditor = ref<any | null>(null)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(bulkEditor, bulkUrlEncodedParams, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter: null,
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
const workingUrlEncodedParams = ref<RawKeyValueEntry[]>([
  {
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
    const filteredWorkingUrlEncodedParams =
      workingUrlEncodedParams.value.filter((e) => e.key !== "")

    if (!isEqual(newurlEncodedParamList, filteredWorkingUrlEncodedParams)) {
      workingUrlEncodedParams.value = newurlEncodedParamList
    }
  },
  { immediate: true }
)

watch(workingUrlEncodedParams, (newWorkingUrlEncodedParams) => {
  const fixedUrlEncodedParams = newWorkingUrlEncodedParams.filter(
    (e) => e.key !== ""
  )
  if (!isEqual(urlEncodedParams.value, fixedUrlEncodedParams)) {
    urlEncodedParams.value = fixedUrlEncodedParams
  }
})

// Bulk Editor Syncing with Working urlEncodedParams
watch(bulkUrlEncodedParams, () => {
  try {
    const transformation = bulkUrlEncodedParams.value
      .split("\n")
      .filter((x) => x.trim().length > 0 && x.includes(":"))
      .map((item) => ({
        key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^#/, ""),
        value: item.substring(item.indexOf(":") + 1).trimLeft(),
        active: !item.trim().startsWith("#"),
      }))

    const filteredUrlEncodedParams = workingUrlEncodedParams.value.filter(
      (x) => x.key !== ""
    )

    if (!isEqual(filteredUrlEncodedParams, transformation)) {
      workingUrlEncodedParams.value = transformation
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

watch(workingUrlEncodedParams, (newurlEncodedParamList) => {
  if (bulkMode.value) return

  try {
    const currentBulkUrlEncodedParams = bulkUrlEncodedParams.value
      .split("\n")
      .map((item) => ({
        key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^#/, ""),
        value: item.substring(item.indexOf(":") + 1).trimLeft(),
        active: !item.trim().startsWith("#"),
      }))

    const filteredUrlEncodedParams = newurlEncodedParamList.filter(
      (x) => x.key !== ""
    )

    if (!isEqual(currentBulkUrlEncodedParams, filteredUrlEncodedParams)) {
      bulkUrlEncodedParams.value = filteredUrlEncodedParams
        .map((param) => {
          return `${param.active ? "" : "#"}${param.key}: ${param.value}`
        })
        .join("\n")
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

const addUrlEncodedParam = () => {
  workingUrlEncodedParams.value.push({
    key: "",
    value: "",
    active: true,
  })
}

const updateUrlEncodedParam = (index: number, param: RawKeyValueEntry) => {
  workingUrlEncodedParams.value = workingUrlEncodedParams.value.map((p, i) =>
    i === index ? param : p
  )
}

const deleteUrlEncodedParam = (index: number) => {
  const urlEncodedParamsBeforeDeletion = clone(workingUrlEncodedParams.value)

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

  workingUrlEncodedParams.value.splice(index, 1)
}

const clearContent = () => {
  // set urlEncodedParams list to the initial state
  workingUrlEncodedParams.value = [
    {
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkUrlEncodedParams.value = ""
}
</script>
