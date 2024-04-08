<template>
  <div
    class="sticky z-10 flex items-center justify-between border-y border-dividerLight bg-primary pl-4"
    :class="[
      isCollectionProperty
        ? 'top-propertiesPrimaryStickyFold'
        : 'top-sidebarPrimaryStickyFold',
    ]"
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
        :class="{ '!text-accent': WRAP_LINES }"
        :icon="IconWrapText"
        @click.prevent="toggleNestedSetting('WRAP_LINES', 'graphqlHeaders')"
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
  <div v-if="bulkMode" ref="bulkEditor" class="flex flex-1 flex-col"></div>
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
            <HoppButtonSecondary
              v-else
              v-tippy="{ theme: 'tooltip' }"
              :icon="IconArrowUpRight"
              :title="t('request.go_to_authorization_tab')"
              class="cursor-auto text-primary hover:text-primary"
            />
          </span>
          <span>
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :icon="IconArrowUpRight"
              :title="t('request.go_to_authorization_tab')"
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
          :label="`${t('add.new')}`"
          filled
          :icon="IconPlus"
          @click="addHeader"
        />
      </template>
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
import IconArrowUpRight from "~icons/lucide/arrow-up-right"
import IconLock from "~icons/lucide/lock"
import IconEye from "~icons/lucide/eye"
import IconEyeOff from "~icons/lucide/eye-off"
import IconInfo from "~icons/lucide/info"
import { computed, reactive, ref, watch } from "vue"
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
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { HoppGQLHeader } from "~/helpers/graphql"
import { throwError } from "~/helpers/functional/error"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

const colorMode = useColorMode()
const t = useI18n()
const toast = useToast()

// v-model integration with props and emit
const props = defineProps<{
  modelValue: HoppGQLRequest
  isCollectionProperty?: boolean
  inheritedProperties?: HoppInheritedProperty
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppGQLRequest): void
}>()

const request = useVModel(props, "modelValue", emit)

const idTicker = ref(0)

const WRAP_LINES = useNestedSetting("WRAP_LINES", "graphqlHeaders")
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
      lineWrapping: WRAP_LINES,
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

  workingHeaders.value = pipe(
    workingHeaders.value,
    A.deleteAt(index),
    O.getOrElseW(() => throwError("Working Headers Deletion Out of Bounds"))
  )
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

const getComputedAuthHeaders = (
  req?: HoppGQLRequest,
  auth?: HoppGQLRequest["auth"]
) => {
  const request = auth ? { auth: auth ?? { authActive: false } } : req
  // If Authorization header is also being user-defined, that takes priority
  if (req && req.headers.find((h) => h.key.toLowerCase() === "authorization"))
    return []

  if (!request) return []

  if (!request.auth || !request.auth.authActive) return []

  const headers: HoppGQLHeader[] = []

  // TODO: Support a better b64 implementation than btoa ?
  if (request.auth.authType === "basic") {
    const username = request.auth.username
    const password = request.auth.password

    headers.push({
      active: true,
      key: "Authorization",
      value: `Basic ${btoa(`${username}:${password}`)}`,
    })
  } else if (
    request.auth.authType === "bearer" ||
    (request.auth.authType === "oauth-2" && request.auth.addTo === "HEADERS")
  ) {
    const requestAuth = request.auth

    const isOAuth2 = requestAuth.authType === "oauth-2"

    const token = isOAuth2 ? requestAuth.grantTypeInfo.token : requestAuth.token

    headers.push({
      active: true,
      key: "Authorization",
      value: `Bearer ${token}`,
    })
  } else if (request.auth.authType === "api-key") {
    const { key, addTo } = request.auth

    if (addTo === "HEADERS" && key) {
      headers.push({
        active: true,
        key,
        value: request.auth.value ?? "",
      })
    }
  }

  return headers
}

const getComputedHeaders = (req: HoppGQLRequest) => {
  return [
    ...getComputedAuthHeaders(req).map((header) => ({
      source: "auth" as const,
      header,
    })),
  ]
}

const computedHeaders = computed(() =>
  getComputedHeaders(request.value).map((header, index) => ({
    id: `header-${index}`,
    ...header,
  }))
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
    request.value,
    props.inheritedProperties.auth.inheritedAuth
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

const mask = (header: any) => {
  if (header.source === "auth" && masking.value)
    return header.header.value.replace(/\S/gi, "*")
  return header.header.value
}

// const changeTab = (tab: ComputedHeader["source"]) => {
//   if (tab === "auth") emit("change-tab", "authorization")
//   else emit("change-tab", "bodyParams")
// }
</script>
