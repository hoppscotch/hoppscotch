<template>
  <div class="flex flex-col items-center justify-between">
    <div
      v-if="invalidLink"
      class="flex flex-col items-center justify-center flex-1"
    >
      <icon-lucide-alert-triangle class="mb-2 opacity-75 svg-icons" />
      <h1 class="text-center heading">
        {{ t("error.invalid_link") }}
      </h1>
      <p class="mt-2 text-center">
        {{ t("error.invalid_link_description") }}
      </p>
    </div>
    <div v-else class="flex flex-col items-center justify-center flex-1 p-4">
      <div
        v-if="shortcodeDetails.loading"
        class="flex flex-col items-center justify-center flex-1 p-4"
      >
        <HoppSmartSpinner />
      </div>
      <div v-else>
        <div
          v-if="!shortcodeDetails.loading && E.isLeft(shortcodeDetails.data)"
          class="flex flex-col items-center p-4"
        >
          <icon-lucide-alert-triangle class="mb-2 opacity-75 svg-icons" />
          <h1 class="text-center heading">
            {{ t("error.invalid_link") }}
          </h1>
          <p class="mt-2 text-center">
            {{ t("error.invalid_link_description") }}
          </p>
          <p class="mt-4">
            <HoppButtonSecondary
              to="/"
              :icon="IconHome"
              filled
              :label="t('app.home')"
            />
            <HoppButtonSecondary
              :icon="IconRefreshCW"
              :label="t('app.reload')"
              filled
              @click="reloadApplication"
            />
          </p>
        </div>
        <div
          v-if="!shortcodeDetails.loading && E.isRight(shortcodeDetails.data)"
          class="flex flex-col items-center justify-center flex-1 p-4"
        >
          <h1 class="heading">
            {{ t("state.loading") }}
          </h1>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import * as E from "fp-ts/Either"
import { safelyExtractRESTRequest } from "@hoppscotch/data"
import { useGQLQuery } from "@composables/graphql"
import { useI18n } from "@composables/i18n"
import {
  ResolveShortcodeDocument,
  ResolveShortcodeQuery,
  ResolveShortcodeQueryVariables,
} from "~/helpers/backend/graphql"

import IconHome from "~icons/lucide/home"
import IconRefreshCW from "~icons/lucide/refresh-cw"
import { createNewTab } from "~/helpers/rest/tab"
import { getDefaultRESTRequest } from "~/helpers/rest/default"

const route = useRoute()
const router = useRouter()

const t = useI18n()

const invalidLink = ref(false)
const shortcodeID = ref("")

const shortcodeDetails = useGQLQuery<
  ResolveShortcodeQuery,
  ResolveShortcodeQueryVariables,
  ""
>({
  query: ResolveShortcodeDocument,
  variables: {
    code: route.params.id.toString(),
  },
})

watch(
  () => shortcodeDetails.data,
  () => addRequestToTab()
)

const addRequestToTab = () => {
  if (shortcodeDetails.loading) return

  const data = shortcodeDetails.data

  if (E.isRight(data)) {
    const request: unknown = JSON.parse(data.right.shortcode?.request as string)

    createNewTab({
      request: safelyExtractRESTRequest(request, getDefaultRESTRequest()),
      isDirty: false,
    })

    router.push({ path: "/" })
  }
}

const reloadApplication = () => {
  window.location.reload()
}

onMounted(() => {
  if (typeof route.params.id === "string") {
    shortcodeID.value = route.params.id
    shortcodeDetails.execute()
  }
  invalidLink.value = !shortcodeID.value
})
</script>
