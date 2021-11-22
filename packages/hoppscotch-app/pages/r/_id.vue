<template>
  <div class="flex flex-col items-center justify-between">
    <div
      v-if="invalidLink"
      class="flex flex-1 items-center justify-center flex-col"
    >
      <i class="opacity-75 pb-2 material-icons">error_outline</i>
      <h1 class="heading text-center">
        {{ $t("error.invalid_link") }}
      </h1>
      <p class="text-center mt-2">
        {{ $t("error.invalid_link_description") }}
      </p>
    </div>
    <div v-else class="flex-col flex-1 p-4 flex items-center justify-center">
      <div
        v-if="shortcodeDetails.loading"
        class="flex-col flex-1 p-4 flex items-center justify-center"
      >
        <SmartSpinner />
      </div>
      <div v-else>
        <div
          v-if="!shortcodeDetails.loading && E.isLeft(shortcodeDetails.data)"
          class="flex flex-col p-4 items-center"
        >
          <i class="mb-4 material-icons">error_outline</i>
          <p>
            {{ shortcodeDetails.data.left }}
          </p>
          <p class="mt-4">
            <ButtonSecondary to="/" svg="home" filled :label="$t('app.home')" />
            <ButtonSecondary
              svg="refresh-cw"
              :label="$t('app.reload')"
              filled
              @click.native="reloadApplication"
            />
          </p>
        </div>
        <div
          v-if="!shortcodeDetails.loading && E.isRight(shortcodeDetails.data)"
          class="flex-col flex-1 p-4 flex items-center justify-center"
        >
          <h1 class="heading">
            {{ $t("state.loading") }}
          </h1>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  useContext,
  useRoute,
  useRouter,
  watch,
} from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { useGQLQuery } from "~/helpers/backend/GQLClient"
import {
  GetRequestFromShortcodeDocument,
  GetRequestFromShortcodeQuery,
  GetRequestFromShortcodeQueryVariables,
} from "~/helpers/backend/graphql"
import { HoppRESTRequest } from "~/helpers/types/HoppRESTRequest"
import { setRESTRequest } from "~/newstore/RESTSession"

export default defineComponent({
  setup() {
    const route = useRoute()
    const router = useRouter()
    const { localePath } = useContext() as any

    const shortcodeDetails = useGQLQuery<
      GetRequestFromShortcodeQuery,
      GetRequestFromShortcodeQueryVariables,
      ""
    >({
      query: GetRequestFromShortcodeDocument,
      variables: {
        shortcode: route.value.params.id as string,
      },
    })

    watch(
      () => shortcodeDetails.data,
      () => {
        if (shortcodeDetails.loading) return

        const data = shortcodeDetails.data

        if (E.isRight(data)) {
          const request = JSON.parse(data.right.shortcode?.request as string)

          setRESTRequest(request as unknown as HoppRESTRequest)
          router.push({ path: localePath("/") })
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
