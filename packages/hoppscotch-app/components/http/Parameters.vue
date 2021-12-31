<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
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
    <div v-if="bulkMode" ref="bulkEditor"></div>
    <div v-else>
      <div
        v-for="(param, index) in workingParams"
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
            updateParam(index, {
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
            updateParam(index, {
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
import { HoppRESTParam } from "@hoppscotch/data"
import isEqual from "lodash/isEqual"
import clone from "lodash/clone"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { useI18n, useToast, useStream } from "~/helpers/utils/composables"
import { restParams$, setRESTParams } from "~/newstore/RESTSession"

const t = useI18n()

const toast = useToast()

const bulkMode = ref(false)
const bulkParams = ref("")

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

const bulkEditor = ref<any | null>(null)

useCodemirror(bulkEditor, bulkParams, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter: null,
  completer: null,
  environmentHighlights: true,
})

// The functional parameters list (the parameters actually applied to the session)
const params = useStream(restParams$, [], setRESTParams)

// The UI representation of the parameters list (has the empty end param)
const workingParams = ref<HoppRESTParam[]>([
  {
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working Params always have last element is always an empty param
watch(workingParams, (paramsList) => {
  if (paramsList.length > 0 && paramsList[paramsList.length - 1].key !== "") {
    workingParams.value.push({
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between params and working params
watch(
  params,
  (newParamsList) => {
    // Sync should overwrite working params
    const filteredWorkingParams = workingParams.value.filter(
      (e) => e.key !== ""
    )

    if (!isEqual(newParamsList, filteredWorkingParams)) {
      workingParams.value = newParamsList
    }
  },
  { immediate: true }
)

watch(workingParams, (newWorkingParams) => {
  const fixedParams = newWorkingParams.filter((e) => e.key !== "")
  if (!isEqual(params.value, fixedParams)) {
    params.value = fixedParams
  }
})

// Bulk Editor Syncing with Working Params
watch(bulkParams, () => {
  try {
    const transformation = bulkParams.value
      .split("\n")
      .filter((x) => x.trim().length > 0 && x.includes(":"))
      .map((item) => ({
        key: item
          .substring(0, item.indexOf(":"))
          .trimLeft()
          .replace(/^\/\//, ""),
        value: item.substring(item.indexOf(":") + 1).trimLeft(),
        active: !item.trim().startsWith("//"),
      }))

    const filteredParams = workingParams.value.filter((x) => x.key !== "")

    if (!isEqual(filteredParams, transformation)) {
      workingParams.value = transformation
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})
watch(workingParams, (newParamsList) => {
  // If we are in bulk mode, don't apply direct changes
  if (bulkMode.value) return

  try {
    const currentBulkParams = bulkParams.value.split("\n").map((item) => ({
      key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^\/\//, ""),
      value: item.substring(item.indexOf(":") + 1).trimLeft(),
      active: !item.trim().startsWith("//"),
    }))

    const filteredParams = newParamsList.filter((x) => x.key !== "")

    if (!isEqual(currentBulkParams, filteredParams)) {
      bulkParams.value = filteredParams
        .map((param) => {
          return `${param.active ? "" : "//"}${param.key}: ${param.value}`
        })
        .join("\n")
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

const addParam = () => {
  workingParams.value.push({
    key: "",
    value: "",
    active: true,
  })
}

const updateParam = (index: number, param: HoppRESTParam) => {
  workingParams.value = workingParams.value.map((h, i) =>
    i === index ? param : h
  )
}

const deleteParam = (index: number) => {
  const paramsBeforeDeletion = clone(workingParams.value)

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

  workingParams.value.splice(index, 1)
}

const clearContent = () => {
  // set params list to the initial state
  workingParams.value = [
    {
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkParams.value = ""
}
</script>
