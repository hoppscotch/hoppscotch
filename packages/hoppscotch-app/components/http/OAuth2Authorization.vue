<template>
  <div class="flex flex-col">
    <div class="border-b border-dividerLight flex">
      <input
        id="oidcDiscoveryURL"
        v-model="oidcDiscoveryURL"
        class="bg-transparent flex flex-1 py-2 px-4"
        placeholder="OpenID Connect Discovery URL"
        name="oidcDiscoveryURL"
      />
    </div>
    <div class="border-b border-dividerLight flex">
      <input
        id="authURL"
        v-model="authURL"
        class="bg-transparent flex flex-1 py-2 px-4"
        placeholder="Authentication URL"
        name="authURL"
      />
    </div>
    <div class="border-b border-dividerLight flex">
      <input
        id="accessTokenURL"
        v-model="accessTokenURL"
        class="bg-transparent flex flex-1 py-2 px-4"
        placeholder="Access Token URL"
        name="accessTokenURL"
      />
    </div>
    <div class="border-b border-dividerLight flex">
      <input
        id="clientID"
        v-model="clientID"
        class="bg-transparent flex flex-1 py-2 px-4"
        placeholder="Client ID"
        name="clientID"
      />
    </div>
    <div class="border-b border-dividerLight flex">
      <input
        id="scope"
        v-model="scope"
        class="bg-transparent flex flex-1 py-2 px-4"
        placeholder="Scope"
        name="scope"
      />
    </div>
    <div class="p-2">
      <ButtonSecondary
        filled
        :label="`${t('authorization.generate_token')}`"
        @click.native="handleAccessTokenRequest()"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Ref } from "@nuxtjs/composition-api"
import { HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import {
  pluckRef,
  useI18n,
  useStream,
  useToast,
} from "~/helpers/utils/composables"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { tokenRequest } from "~/helpers/oauth"

export default {
  setup() {
    const t = useI18n()
    const toast = useToast()

    const auth = useStream(
      restAuth$,
      { authType: "none", authActive: true },
      setRESTAuth
    )

    const oidcDiscoveryURL = pluckRef(
      auth as Ref<HoppRESTAuthOAuth2>,
      "oidcDiscoveryURL"
    )

    const authURL = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "authURL")

    const accessTokenURL = pluckRef(
      auth as Ref<HoppRESTAuthOAuth2>,
      "accessTokenURL"
    )

    const clientID = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "clientID")

    const scope = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "scope")

    const handleAccessTokenRequest = async () => {
      if (
        oidcDiscoveryURL.value === "" &&
        (authURL.value === "" || accessTokenURL.value === "")
      ) {
        toast.error(`${t("complete_config_urls")}`)
        return
      }
      try {
        const tokenReqParams = {
          grantType: "code",
          oidcDiscoveryUrl: oidcDiscoveryURL.value,
          authUrl: authURL.value,
          accessTokenUrl: accessTokenURL.value,
          clientId: clientID.value,
          scope: scope.value,
        }
        await tokenRequest(tokenReqParams)
      } catch (e) {
        toast.error(`${e}`)
      }
    }

    return {
      oidcDiscoveryURL,
      authURL,
      accessTokenURL,
      clientID,
      scope,
      handleAccessTokenRequest,
    }
  },
}
</script>
