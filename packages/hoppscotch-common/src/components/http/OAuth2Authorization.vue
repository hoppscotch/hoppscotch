<template>
  <div class="flex flex-col">
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="oidcDiscoveryURL"
        :styles="
          hasAccessTokenOrAuthURL ? 'pointer-events-none opacity-70' : ''
        "
        placeholder="OpenID Connect Discovery URL"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="authURL"
        placeholder="Authorization URL"
        :styles="hasOIDCURL ? 'pointer-events-none opacity-70' : ''"
      ></SmartEnvInput>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="accessTokenURL"
        placeholder="Access Token URL"
        :styles="hasOIDCURL ? 'pointer-events-none opacity-70' : ''"
      />
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

<script setup lang="ts">
import { ref, watch } from "vue"
import {
  HoppGQLAuthOAuth2,
  HoppRESTAuthOAuth2,
  parseTemplateString,
} from "@hoppscotch/data"
import { pluckRef } from "@composables/ref"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { tokenRequest } from "~/helpers/oauth"
import { getCombinedEnvVariables } from "~/helpers/preRequest"
import * as E from "fp-ts/Either"
import { computed } from "vue"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: HoppRESTAuthOAuth2 | HoppGQLAuthOAuth2
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthOAuth2): void
}>()

const auth = ref(props.modelValue)

watch(
  () => auth.value,
  (val) => {
    emit("update:modelValue", val)
  }
)

const oidcDiscoveryURL = pluckRef(auth, "oidcDiscoveryURL")
const hasOIDCURL = computed(() => {
  return oidcDiscoveryURL.value
})

const authURL = pluckRef(auth, "authURL")

const accessTokenURL = pluckRef(auth, "accessTokenURL")
const hasAccessTokenOrAuthURL = computed(() => {
  return accessTokenURL.value || authURL.value
})

const clientID = pluckRef(auth, "clientID")

// TODO: Fix this type error. currently there is no type for clientSecret
const clientSecret = pluckRef(auth, "clientSecret" as any)

const scope = pluckRef(auth, "scope")

function translateTokenRequestError(error: string) {
  switch (error) {
    case "OIDC_DISCOVERY_FAILED":
      return t("authorization.oauth.token_generation_oidc_discovery_failed")
    default:
      return t("authorization.oauth.something_went_wrong_on_token_generation")
  }
}

const handleAccessTokenRequest = async () => {
  if (!oidcDiscoveryURL.value && !(authURL.value || accessTokenURL.value)) {
    toast.error(`${t("error.incomplete_config_urls")}`)
    return
  }

  const envs = getCombinedEnvVariables()
  const envVars = [...envs.selected, ...envs.global]

  try {
    const tokenReqParams = {
      grantType: "code",
      oidcDiscoveryUrl: parseTemplateString(oidcDiscoveryURL.value, envVars),
      authUrl: parseTemplateString(authURL.value, envVars),
      accessTokenUrl: parseTemplateString(accessTokenURL.value, envVars),
      clientId: parseTemplateString(clientID.value, envVars),
      clientSecret: parseTemplateString(clientSecret.value, envVars),
      scope: parseTemplateString(scope.value, envVars),
    }
    const res = await tokenRequest(tokenReqParams)

    if (res && E.isLeft(res)) {
      toast.error(translateTokenRequestError(res.left))
    }
  } catch (e) {
    toast.error(`${e}`)
  }
}
</script>
