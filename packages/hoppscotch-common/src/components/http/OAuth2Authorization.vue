<template>
  <div class="flex flex-col">
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="oidcDiscoveryURL"
        placeholder="OpenID Connect Discovery URL"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput v-model="authURL" placeholder="Authorization URL" />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput v-model="accessTokenURL" placeholder="Access Token URL" />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput v-model="clientID" placeholder="Client ID" />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput v-model="clientSecret" placeholder="Client Secret" />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput v-model="scope" placeholder="Scope" />
    </div>
    <div class="p-2">
      <HoppButtonSecondary
        filled
        :label="`${t('authorization.generate_token')}`"
        @click="handleAccessTokenRequest()"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Ref, defineComponent } from "vue"
import { HoppRESTAuthOAuth2, parseTemplateString } from "@hoppscotch/data"
import { pluckRef } from "@composables/ref"
import { useI18n } from "@composables/i18n"
import { useStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { tokenRequest } from "~/helpers/oauth"
import { getCombinedEnvVariables } from "~/helpers/preRequest"

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
      const envVars = [...envs.selected, ...envs.global]

      try {
        const tokenReqParams = {
          grantType: "code",
          oidcDiscoveryUrl: parseTemplateString(
            oidcDiscoveryURL.value,
            envVars
          ),
          authUrl: parseTemplateString(authURL.value, envVars),
          accessTokenUrl: parseTemplateString(accessTokenURL.value, envVars),
          clientId: parseTemplateString(clientID.value, envVars),
          clientSecret: parseTemplateString(clientSecret.value, envVars),
          scope: parseTemplateString(scope.value, envVars),
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
