<template>
  <div
    class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight"
  >
    <label class="font-semibold text-secondaryLight">
      {{ t("tab.headers") }}
    </label>
    <div class="flex">
      <HoppButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://docs.hoppscotch.io/documentation/features/graphql-api-testing"
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
        @click="addHeader"
      />
    </div>
  </div>
  <div v-if="bulkMode" ref="bulkEditor" class="flex flex-col flex-1"></div>
  <div v-else>
    <draggable
      v-model="workingHeaders"
      :item-key="(header: any) => `header-${header.id}`"
      animation="250"
      handle=".draggable-handle"
      draggable=".draggable-content"
      ghost-class="cursor-move"
      chosen-class="bg-primaryLight"
      drag-class="cursor-grabbing"
    >
      <template #item="{ element: header, index }">
        <div
          class="flex border-b divide-x divide-dividerLight border-dividerLight draggable-content group"
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
              class="cursor-auto text-primary hover:text-primary"
              :class="{
                'draggable-handle group-hover:text-secondaryLight !cursor-grab':
                  index !== workingHeaders?.length - 1,
              }"
              tabindex="-1"
            />
          </span>
          <HoppSmartAutoComplete
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
                id: header.id,
                key: $event,
                value: header.value,
                active: header.active,
              })
            "
          />
          <input
            class="flex flex-1 px-4 py-2 bg-transparent"
            :placeholder="`${t('count.value', { count: index + 1 })}`"
            :name="`value ${String(index)}`"
            :value="header.value"
            autofocus
            @change="
              updateHeader(index, {
                id: header.id,
                key: header.key,
                value: ($event!.target! as HTMLInputElement).value,
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
    <HoppSmartPlaceholder
      v-if="workingHeaders.length === 0"
      :src="`/images/states/${colorMode.value}/add_category.svg`"
      :alt="`${t('empty.headers')}`"
      :text="t('empty.headers')"
    >
      <HoppButtonSecondary
        :label="`${t('add.new')}`"
        filled
        :icon="IconPlus"
        class="mb-4"
        @click="addHeader"
      />
    </HoppSmartPlaceholder>
  </div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconPlus from "~icons/lucide/plus"
import IconGripVertical from "~icons/lucide/grip-vertical"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconTrash from "~icons/lucide/trash"
import IconCircle from "~icons/lucide/circle"
import IconWrapText from "~icons/lucide/wrap-text"
import { reactive, ref, watch } from "vue"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import * as A from "fp-ts/Array"
import * as RA from "fp-ts/ReadonlyArray"
import { pipe, flow } from "fp-ts/function"
import {
  GQLHeader,
  rawKeyValueEntriesToString,
  parseRawKeyValueEntriesE,
  RawKeyValueEntry,
  HoppGQLRequest,
} from "@hoppscotch/data"
import draggable from "vuedraggable-es"
import { clone, cloneDeep, isEqual } from "lodash-es"
import { useColorMode } from "@composables/theming"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { commonHeaders } from "~/helpers/headers"
import { useCodemirror } from "@composables/codemirror"
import { objRemoveKey } from "~/helpers/functional/object"
import { useVModel } from "@vueuse/core"

const colorMode = useColorMode()
const t = useI18n()
const toast = useToast()

// v-model integration with props and emit
const props = defineProps<{ modelValue: HoppGQLRequest }>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppGQLRequest): void
}>()

const request = useVModel(props, "modelValue", emit)

const idTicker = ref(0)

const linewrapEnabled = ref(false)
const bulkMode = ref(false)
const bulkHeaders = ref("")

const deletionToast = ref<{ goAway: (delay: number) => void } | null>(null)

const bulkEditor = ref<any | null>(null)

useCodemirror(
  bulkEditor,
  bulkHeaders,
  reactive({
    extendedEditorConfig: {
      mode: "text/x-yaml",
      placeholder: `${t("state.bulk_mode_placeholder")}`,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

// The UI representation of the headers list (has the empty end header)
const workingHeaders = ref<Array<GQLHeader & { id: number }>>([
  {
    id: idTicker.value++,
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
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    })
  }
})

// Sync logic between headers and working headers
watch(
  props.modelValue.headers,
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

// Bulk Editor Syncing with Working Headers
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

  if (!isEqual(request.value.headers, filteredBulkHeaders)) {
    request.value.headers = filteredBulkHeaders
  }
})

watch(workingHeaders, (newHeadersList) => {
  // If we are in bulk mode, don't apply direct changes
  if (bulkMode.value) return

  try {
    const currentBulkHeaders = bulkHeaders.value.split("\n").map((item) => ({
      key: item.substring(0, item.indexOf(":")).trimLeft().replace(/^#/, ""),
      value: item.substring(item.indexOf(":") + 1).trimLeft(),
      active: !item.trim().startsWith("#"),
    }))

    const filteredHeaders = newHeadersList.filter((x) => x.key !== "")

    if (!isEqual(currentBulkHeaders, filteredHeaders)) {
      bulkHeaders.value = rawKeyValueEntriesToString(filteredHeaders)
    }
  } catch (e) {
    toast.error(`${t("error.something_went_wrong")}`)
    console.error(e)
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

const updateHeader = (index: number, header: GQLHeader & { id: number }) => {
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
          onClick: (_: any, toastObject: any) => {
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
      id: idTicker.value++,
      key: "",
      value: "",
      active: true,
    },
  ]

  bulkHeaders.value = ""
}
</script>
