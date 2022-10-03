<template>
  <div class="flex flex-col items-center justify-between">
    <div
      v-if="invalidLink"
      class="flex flex-col items-center justify-center flex-1"
    >
      <i class="pb-2 opacity-75 material-icons">error_outline</i>
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
        <SmartSpinner />
      </div>
      <div v-else>
        <div
          v-if="!shortcodeDetails.loading && E.isLeft(shortcodeDetails.data)"
          class="flex flex-col items-center p-4"
        >
          <i class="pb-2 opacity-75 material-icons">error_outline</i>
          <h1 class="text-center heading">
            {{ t("error.invalid_link") }}
          </h1>
          <p class="mt-2 text-center">
            {{ t("error.invalid_link_description") }}
          </p>
          <p class="mt-4">
            <ButtonSecondary
              to="/"
              :icon="IconHome"
              filled
              :label="t('app.home')"
            />
            <ButtonSecondary
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

<script lang="ts">
import { defineComponent, watch } from "vue"
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
import { getDefaultRESTRequest, setRESTRequest } from "~/newstore/RESTSession"

import IconHome from "~icons/lucide/home"
import IconRefreshCW from "~icons/lucide/refresh-cw"

export default defineComponent({
  setup() {
    const route = useRoute()
    const router = useRouter()

    const t = useI18n()

    const shortcodeDetails = useGQLQuery<
      ResolveShortcodeQuery,
      ResolveShortcodeQueryVariables,
      ""
    >({
      query: ResolveShortcodeDocument,
      variables: {
        code: route.params.id as string,
      },
    })

    watch(
      () => shortcodeDetails.data,
      () => {
        if (shortcodeDetails.loading) return

        const data = shortcodeDetails.data

        if (E.isRight(data)) {
          const request: unknown = JSON.parse(
            data.right.shortcode?.request as string
          )

          setRESTRequest(
            safelyExtractRESTRequest(request, getDefaultRESTRequest())
          )

          router.push({ path: "/" })
        }
      }
    )

    const reloadApplication = () => {
      window.location.reload()
    }

    return {
      E,
      shortcodeDetails,
      reloadApplication,
      t,
      IconHome,
      IconRefreshCW,
    }
  },
  data() {
    return {
      invalidLink: false,
      shortcodeID: "",
    }
  },
  mounted() {
    if (typeof this.$route.params.id === "string") {
      this.shortcodeID = this.$route.params.id
    }
    this.invalidLink = !this.shortcodeID
  },
})
</script>
