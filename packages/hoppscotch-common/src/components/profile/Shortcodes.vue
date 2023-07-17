<template>
  <section class="p-4">
    <h4 class="font-semibold text-secondaryDark">
      {{ t("settings.short_codes") }}
    </h4>
    <div class="my-1 text-secondaryLight">
      {{ t("settings.short_codes_description") }}
    </div>
    <div class="relative py-4 overflow-x-auto">
      <div v-if="loading" class="flex flex-col items-center justify-center">
        <HoppSmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <HoppSmartPlaceholder
        v-if="!loading && myShortcodes.length === 0"
        :src="`/images/states/${colorMode.value}/add_files.svg`"
        :alt="`${t('empty.shortcodes')}`"
        :text="t('empty.shortcodes')"
      >
      </HoppSmartPlaceholder>
      <div v-else-if="!loading">
        <div>
          <HoppSmartTable
            :cell-styles="requestMethodColors"
            :list="shortcodeList"
            :headings="headings"
            heading-styles="!py-2 text-xs"
          >
            <template #action="{ item }">
              <div class="flex flex-1 items-end py-2 truncate">
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.open_workspace')"
                  :to="`${shortcodeBaseURL}/r/${item.id}`"
                  blank
                  :icon="IconExternalLink"
                  class="px-3 text-accent hover:text-accent"
                />
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.copy')"
                  color="green"
                  :icon="copyIconRefs"
                  class="px-3"
                  @click="copyShortcode(item.id)"
                />
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.delete')"
                  :icon="IconTrash"
                  color="red"
                  class="px-3"
                  @click="deleteShortcode(item.id)"
                />
              </div>
            </template>
          </HoppSmartTable>
          <HoppSmartIntersection
            v-if="hasMoreShortcodes && myShortcodes.length > 0"
            @intersecting="loadMoreShortcodes()"
          >
            <div v-if="adapterLoading" class="flex flex-col items-center py-3">
              <HoppSmartSpinner />
            </div>
          </HoppSmartIntersection>
        </div>
      </div>
      <div
        v-if="!loading && adapterError"
        class="flex flex-col items-center py-4"
      >
        <icon-lucide-help-circle class="mb-4 svg-icons" />
        {{ getErrorMessage(adapterError) }}
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed } from "vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as RR from "fp-ts/ReadonlyRecord"
import * as O from "fp-ts/Option"
import { GQLError } from "~/helpers/backend/GQLClient"
import { platform } from "~/platform"

import { onAuthEvent, onLoggedIn } from "@composables/auth"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import { usePageHead } from "@composables/head"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { Shortcode } from "~/helpers/shortcodes/Shortcode"
import { shortDateTime } from "~/helpers/utils/date"
import { translateToNewRequest } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"

import ShortcodeListAdapter from "~/helpers/shortcodes/ShortcodeListAdapter"
import { deleteShortcode as backendDeleteShortcode } from "~/helpers/backend/mutations/Shortcode"

import IconTrash from "~icons/lucide/trash"
import IconExternalLink from "~icons/lucide/external-link"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

usePageHead({
  title: computed(() => t("navigation.profile")),
})

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const displayName = ref(currentUser.value?.displayName)
watchEffect(() => (displayName.value = currentUser.value?.displayName))

const emailAddress = ref(currentUser.value?.email)
watchEffect(() => (emailAddress.value = currentUser.value?.email))

const adapter = new ShortcodeListAdapter(true)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const myShortcodes = useReadonlyStream(adapter.shortcodes$, [])
const hasMoreShortcodes = useReadonlyStream(adapter.hasMoreShortcodes$, true)

const loading = computed(
  () => adapterLoading.value && myShortcodes.value.length === 0
)

onLoggedIn(() => {
  try {
    adapter.initialize()
  } catch (e) {}
})

onAuthEvent((ev) => {
  if (ev.event === "logout" && adapter.isInitialized()) {
    adapter.dispose()
    return
  }
})

const deleteShortcode = async (codeID: string) => {
  await pipe(
    backendDeleteShortcode(codeID),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err)}`)
      },
      () => {
        toast.success(`${t("shortcodes.deleted")}`)
      }
    )
  )()
}

const loadMoreShortcodes = () => {
  adapter.loadMore()
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "shortcode/not_found":
        return t("shortcodes.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}

const shortcodeBaseURL =
  import.meta.env.VITE_SHORTCODE_BASE_URL ?? "https://hopp.sh"

const copyShortcode = (codeID: string) => {
  copyToClipboard(`${shortcodeBaseURL}/r/${codeID}`)
  toast.success(`${t("state.copied_to_clipboard")}`)
  copyIconRefs.value = IconCheck
}

const copyIconRefs = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const dateStamp = (shortcode: Shortcode) => shortDateTime(shortcode.createdOn)

const parseShortcodeRequestMethod = (shortcode: Shortcode) =>
  pipe(shortcode.request, JSON.parse, translateToNewRequest).method

const parseShortcodeRequestEndpoint = (shortcode: Shortcode) =>
  pipe(shortcode.request, JSON.parse, translateToNewRequest).endpoint

const headings = [
  t("shortcodes.short_code"),
  t("shortcodes.method"),
  t("shortcodes.url"),
  t("shortcodes.created_on"),
  t("shortcodes.actions"),
]

const shortcodeList = computed(() => {
  return myShortcodes.value?.map((shortcode) => {
    return {
      id: shortcode.id,
      method: parseShortcodeRequestMethod(shortcode),
      endpoint: parseShortcodeRequestEndpoint(shortcode),
      createdOn: dateStamp(shortcode),
    }
  })
})

const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
} as const

const requestLabelColor = (shortcode: Shortcode) =>
  pipe(
    requestMethodLabels,
    RR.lookup(parseShortcodeRequestMethod(shortcode).toLowerCase()),
    O.getOrElseW(() => requestMethodLabels.default)
  )

const requestMethodColors = computed(() => {
  return myShortcodes.value?.map((shortcode, index) => {
    return {
      colName: "method",
      rowIndex: index,
      style: requestLabelColor(shortcode),
    }
  })
})
</script>
