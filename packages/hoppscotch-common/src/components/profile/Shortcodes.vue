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
        <SmartSpinner class="mb-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-if="!loading && myShortcodes.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${colorMode.value}/add_files.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 mb-8"
          :alt="`${t('empty.shortcodes')}`"
        />
        <span class="mb-4 text-center">
          {{ t("empty.shortcodes") }}
        </span>
      </div>
      <div v-else-if="!loading">
        <div
          class="hidden w-full border-t rounded-t bg-primaryLight lg:flex border-x border-dividerLight"
        >
          <div class="flex w-full overflow-y-scroll">
            <div class="table-box">
              {{ t("shortcodes.short_code") }}
            </div>
            <div class="table-box">
              {{ t("shortcodes.method") }}
            </div>
            <div class="table-box">
              {{ t("shortcodes.url") }}
            </div>
            <div class="table-box">
              {{ t("shortcodes.created_on") }}
            </div>
            <div class="justify-center table-box">
              {{ t("shortcodes.actions") }}
            </div>
          </div>
        </div>
        <div
          class="flex flex-col items-center justify-between w-full overflow-y-scroll border rounded max-h-sm lg:rounded-t-none lg:divide-y border-dividerLight divide-dividerLight"
        >
          <ProfileShortcode
            v-for="(shortcode, shortcodeIndex) in myShortcodes"
            :key="`shortcode-${shortcodeIndex}`"
            :shortcode="shortcode"
            @delete-shortcode="deleteShortcode"
          />
          <SmartIntersection
            v-if="hasMoreShortcodes && myShortcodes.length > 0"
            @intersecting="loadMoreShortcodes()"
          >
            <div v-if="adapterLoading" class="flex flex-col items-center py-3">
              <SmartSpinner />
            </div>
          </SmartIntersection>
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
import { GQLError } from "~/helpers/backend/GQLClient"
import { platform } from "~/platform"

import { onAuthEvent, onLoggedIn } from "@composables/auth"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useColorMode } from "@composables/theming"
import { usePageHead } from "@composables/head"

import ShortcodeListAdapter from "~/helpers/shortcodes/ShortcodeListAdapter"
import { deleteShortcode as backendDeleteShortcode } from "~/helpers/backend/mutations/Shortcode"

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

const deleteShortcode = (codeID: string) => {
  pipe(
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
</script>

<style lang="scss" scoped>
.table-box {
  @apply flex flex-1 items-center px-4 py-2 truncate;
}
</style>
