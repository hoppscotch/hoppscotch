<template>
  <div class="flex flex-col space-y-2">
    <div class="flex relative">
      <input
        id="oidcDiscoveryURL"
        v-model="oidcDiscoveryURL"
        class="input floating-input"
        placeholder=" "
        name="oidcDiscoveryURL"
      />
      <label for="oidcDiscoveryURL">oidcDiscoveryURL </label>
    </div>
    <div class="flex relative">
      <input
        id="authURL"
        v-model="authURL"
        class="input floating-input"
        placeholder=" "
        name="authURL"
      />
      <label for="authURL">authURL </label>
    </div>
    <div class="flex relative">
      <input
        id="accessTokenURL"
        v-model="accessTokenURL"
        class="input floating-input"
        placeholder=" "
        name="accessTokenURL"
      />
      <label for="accessTokenURL">accessTokenURL </label>
    </div>
    <div class="flex relative">
      <input
        id="clientID"
        v-model="clientID"
        class="input floating-input"
        placeholder=" "
        name="clientID"
      />
      <label for="clientID">clientID </label>
    </div>
    <div class="flex relative">
      <input
        id="scope"
        v-model="scope"
        class="input floating-input"
        placeholder=" "
        name="scope"
      />
      <label for="scope">scope </label>
    </div>
    <div>
      <ButtonPrimary
        label="Get request"
        @click.native="handleAccessTokenRequest()"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Ref, useContext } from "@nuxtjs/composition-api"
import { pluckRef, useStream } from "~/helpers/utils/composables"
import { HoppRESTAuthOAuth2 } from "~/helpers/types/HoppRESTAuth"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { tokenRequest } from "~/helpers/oauth"

export default {
  setup() {
    const {
      $toast,
      app: { i18n },
    } = useContext()
    const $t = i18n.t.bind(i18n)

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
        $toast.error($t("complete_config_urls"), {
          icon: "error",
        })
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
        $toast.error(e, {
          icon: "code",
        })
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
