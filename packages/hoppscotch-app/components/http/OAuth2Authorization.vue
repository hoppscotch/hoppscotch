<template>
  <div class="flex flex-col">
    <div class="flex flex-1 border-b border-dividerLight">
      <span class="flex flex-1 px-4 bg-transparent items-center">
        <label class="text-secondaryLight">{{
          $t("authorization.grant_type")
        }}</label>
        <tippy
          ref="authTypeOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <span class="select-wrapper">
              <ButtonSecondary
                class="pr-8 ml-2 rounded-none"
                :label="$t(`authorization.${grantType}`)"
              />
            </span>
          </template>
          <div class="flex flex-col" role="menu">
            <SmartItem
              :label="$t('authorization.code')"
              :icon="
                grantType === 'code'
                  ? 'radio_button_checked'
                  : 'radio_button_unchecked'
              "
              :active="grantType === 'code'"
              @click.native="
                () => {
                  grantType = 'code'
                  authTypeOptions.tippy().hide()
                }
              "
            />
            <SmartItem
              :label="$t('authorization.client_credentials')"
              :icon="
                grantType === 'client_credentials'
                  ? 'radio_button_checked'
                  : 'radio_button_unchecked'
              "
              :active="grantType === 'client_credentials'"
              @click.native="
                () => {
                  grantType = 'client_credentials'
                  authTypeOptions.tippy().hide()
                }
              "
            />
          </div>
        </tippy>
      </span>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <input
        v-if="grantType === 'code'"
        id="oidcDiscoveryURL"
        v-model="oidcDiscoveryURL"
        class="flex flex-1 px-4 py-2 bg-transparent"
        placeholder="OpenID Connect Discovery URL"
        name="oidcDiscoveryURL"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <input
        v-if="grantType === 'code'"
        id="authURL"
        v-model="authURL"
        class="flex flex-1 px-4 py-2 bg-transparent"
        placeholder="Authentication URL"
        name="authURL"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <input
        id="accessTokenURL"
        v-model="accessTokenURL"
        class="flex flex-1 px-4 py-2 bg-transparent"
        placeholder="Access Token URL"
        name="accessTokenURL"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <input
        id="clientID"
        v-model="clientID"
        class="flex flex-1 px-4 py-2 bg-transparent"
        placeholder="Client ID"
        name="clientID"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <input
        v-if="grantType === 'client_credentials'"
        id="clientSecret"
        v-model="clientSecret"
        class="flex flex-1 px-4 py-2 bg-transparent"
        placeholder="Client Secret"
        name="clientSecret"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <input
        id="scope"
        v-model="scope"
        class="flex flex-1 px-4 py-2 bg-transparent"
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

<script lang="ts" setup>
import { Ref, ref } from "@nuxtjs/composition-api"
import { HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import {
  pluckRef,
  useI18n,
  useStream,
  useToast,
} from "~/helpers/utils/composables"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { tokenRequest } from "~/helpers/oauth"

const t = useI18n()
const toast = useToast()

const grantType = ref<"client_credentials" | "code">("code")

const authTypeOptions = ref<any | null>(null)

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
const clientSecret = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "clientSecret")
const scope = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "scope")
const oauth2Token = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "token")

const handleAccessTokenRequest = async () => {
  if (
    oidcDiscoveryURL.value === "" &&
    (authURL.value === "" || accessTokenURL.value === "")
  ) {
    toast.error(`${t("error.incomplete_config_urls")}`)
    return
  }
  try {
    const tokenReqParams = {
      grantType: grantType.value,
      oidcDiscoveryUrl: oidcDiscoveryURL.value,
      authUrl: authURL.value,
      accessTokenUrl: accessTokenURL.value,
      clientId: clientID.value,
      clientSecret: clientSecret.value,
      scope: scope.value,
    }

    const token = await tokenRequest(tokenReqParams)
    if (grantType.value === "client_credentials" && typeof token === "string") {
      oauth2Token.value = token
    }
  } catch (e) {
    toast.error(`${e}`)
  }
}
</script>
