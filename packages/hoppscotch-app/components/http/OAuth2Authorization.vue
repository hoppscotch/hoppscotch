<template>
  <div class="flex flex-col">
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="oidcDiscoveryURL"
        placeholder="OpenID Connect Discovery URL"
        styles="bg-transparent flex flex-1 py-1 px-4"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="authURL"
        placeholder="Authorization URL"
        styles="bg-transparent flex flex-1 py-1 px-4"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="accessTokenURL"
        placeholder="Access Token URL"
        styles="flex flex-1 px-4 py-2 bg-transparent"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="clientID"
        placeholder="Client ID"
        styles="flex flex-1 px-4 py-2 bg-transparent"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="clientSecret"
        placeholder="Client Secret"
        styles="flex flex-1 px-4 py-2 bg-transparent"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="scope"
        placeholder="Scope"
        styles="flex flex-1 px-4 py-2 bg-transparent"
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
import { Ref, defineComponent } from "@nuxtjs/composition-api"
import { HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import {
  pluckRef,
  useI18n,
  useStream,
  useToast,
} from "~/helpers/utils/composables"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { tokenRequest } from "~/helpers/oauth"
import { getCombinedEnvVariables } from "~/helpers/preRequest"
import { parseTemplateString } from "~/helpers/templating"

export default defineComponent({
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

    const clientSecret = pluckRef(
      auth as Ref<HoppRESTAuthOAuth2>,
      "clientSecret"
    )

    const scope = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "scope")

    const handleAccessTokenRequest = async () => {
      if (
        oidcDiscoveryURL.value === "" &&
        (authURL.value === "" || accessTokenURL.value === "")
      ) {
        toast.error(`${t("error.incomplete_config_urls")}`)
        return
      }
      const envs = getCombinedEnvVariables()

      try {
        const tokenReqParams = {
          grantType: "code",
          oidcDiscoveryUrl: parseTemplateString(oidcDiscoveryURL.value, envs),
          authUrl: parseTemplateString(authURL.value, envs),
          accessTokenUrl: parseTemplateString(accessTokenURL.value, envs),
          clientId: parseTemplateString(clientID.value, envs),
          clientSecret: parseTemplateString(clientSecret.value, envs),
          scope: parseTemplateString(scope.value, envs),
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
      clientSecret,
      scope,
      handleAccessTokenRequest,
      t,
    }
  },
})
</script>
