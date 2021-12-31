<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between flex-1 pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("request.header_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/headers"
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
          @click.native="addHeader"
        />
      </div>
    </div>
    <div v-if="bulkMode" ref="bulkEditor"></div>
    <div v-else>
      <div
        v-for="(header, index) in workingHeaders"
        :key="`header-${index}`"
        class="flex border-b divide-x divide-dividerLight border-dividerLight"
      >
        <SmartAutoComplete
          :placeholder="`${t('count.header', { count: index + 1 })}`"
          :source="commonHeaders"
          :spellcheck="false"
          :value="header.key"
          autofocus
          styles="
            bg-transparent
            flex
            flex-1
            py-1
            px-4
            truncate
          "
          class="flex-1 !flex"
          @input="
            updateHeader(index, {
              key: $event,
              value: header.value,
              active: header.active,
            })
          "
        />
        <SmartEnvInput
          v-model="header.value"
          :placeholder="`${t('count.value', { count: index + 1 })}`"
          styles="
            bg-transparent
            flex
            flex-1
            py-1
            px-4
          "
          @change="
            updateHeader(index, {
              key: header.key,
              value: $event,
              active: header.active,
            })
          "
        />
        <span>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="
              header.hasOwnProperty('active')
                ? header.active
                  ? t('action.turn_off')
                  : t('action.turn_on')
                : t('action.turn_off')
            "
            :svg="
              header.hasOwnProperty('active')
                ? header.active
                  ? 'check-circle'
                  : 'circle'
                : 'check-circle'
            "
            color="green"
            @click.native="
              updateHeader(index, {
                key: header.key,
                value: header.value,
                active: !header.active,
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
            @click.native="deleteHeader(index)"
          />
        </span>
      </div>
      <div
        v-if="workingHeaders.length === 0"
        class="flex flex-col text-secondaryLight p-4 items-center justify-center"
      >
        <img
          :src="`/images/states/${$colorMode.value}/add_category.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.headers')}`"
        />
        <span class="pb-4 text-center">
          {{ t("empty.headers") }}
        </span>
        <ButtonSecondary
          filled
          :label="`${t('add.new')}`"
          svg="plus"
          class="mb-4"
          @click.native="addHeader"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Ref, ref, watch } from "@nuxtjs/composition-api"
import isEqual from "lodash/isEqual"
import clone from "lodash/clone"
import { HoppRESTHeader } from "@hoppscotch/data"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { restHeaders$, setRESTHeaders } from "~/newstore/RESTSession"
import { commonHeaders } from "~/helpers/headers"
import { useI18n, useStream, useToast } from "~/helpers/utils/composables"

const t = useI18n()
const toast = useToast()

const bulkMode = ref(false)
const bulkHeaders = ref("")
const bulkEditor = ref<any | null>(null)

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

useCodemirror(bulkEditor, bulkHeaders, {
  extendedEditorConfig: {
    mode: "text/x-yaml",
    placeholder: `${t("state.bulk_mode_placeholder")}`,
  },
  linter: null,
  completer: null,
  environmentHighlights: true,
})

// The functional headers list (the headers actually in the system)
const headers = useStream(restHeaders$, [], setRESTHeaders) as Ref<
  HoppRESTHeader[]
>

// The UI representation of the headers list (has the empty end header)
const workingHeaders = ref<HoppRESTHeader[]>([
  {
    key: "",
    value: "",
    active: true,
  },
])

// Rule: Working Headers always have one empty header or the last element is always an empty header
watch(workingHeaders, (headersList) => {
  if (
    headersList.length > 0 &&
    headersList[headersList.length - 1].key !== ""
  ) {
    workingHeaders.value.push({
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between headers and working headers
watch(
  headers,
  (newHeadersList) => {
    // Sync should overwrite working headers
    const filteredWorkingHeaders = workingHeaders.value.filter(
      (e) => e.key !== ""
    )

    if (!isEqual(newHeadersList, filteredWorkingHeaders)) {
      workingHeaders.value = newHeadersList
    }
  },
  { immediate: true }
)

watch(workingHeaders, (newWorkingHeaders) => {
  const fixedHeaders = newWorkingHeaders.filter((e) => e.key !== "")
  if (!isEqual(headers.value, fixedHeaders)) {
    headers.value = fixedHeaders
  }
})

// Bulk Editor Syncing with Working Headers
watch(bulkHeaders, () => {
  try {
    const transformation = bulkHeaders.value
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

    const filteredHeaders = workingHeaders.value.filter((x) => x.key !== "")

    if (!isEqual(filteredHeaders, transformation)) {
      workingHeaders.value = transformation
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})
watch(workingHeaders, (newHeadersList) => {
  try {
    const currentBulkHeaders = bulkHeaders.value.split("\n").map((item) => ({
      key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^\/\//, ""),
      value: item.substring(item.indexOf(":") + 1).trimLeft(),
      active: !item.trim().startsWith("//"),
    }))

    const filteredHeaders = newHeadersList.filter((x) => x.key !== "")

    if (!isEqual(currentBulkHeaders, filteredHeaders)) {
      bulkHeaders.value = filteredHeaders
        .map((header) => {
          return `${header.active ? "" : "//"}${header.key}: ${header.value}`
        })
        .join("\n")
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
  }
})

const addHeader = () => {
  workingHeaders.value.push({
    key: "",
    value: "",
    active: true,
  })
}

const updateHeader = (index: number, header: HoppRESTHeader) => {
  workingHeaders.value = workingHeaders.value.map((h, i) =>
    i === index ? header : h
  )
}

const deleteHeader = (index: number) => {
  const headersBeforeDeletion = clone(workingHeaders.value)

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

  workingHeaders.value.splice(index, 1)
}

const clearContent = () => {
  // set headers list to the initial state
  workingHeaders.value = [
    {
      key: "",
      value: "",
      active: true,
    },
  ]
}
</script>
