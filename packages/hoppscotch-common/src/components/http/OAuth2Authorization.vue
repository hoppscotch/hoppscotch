<template>
  <div class="flex flex-col">
    <div class="flex flex-1 border-b border-dividerLight">
      <span class="flex flex-1 px-4 bg-transparent items-center">
        <label class="text-secondaryLight">
          {{ t("authorization.grant_type") }}
        </label>
        <div class="flex flex-row" role="menu">
          <HoppSmartItem
            :label="t('authorization.code')"
            :icon="
              grantType === 'client_credentials' ? IconCircle : IconCheckCircle
            "
            @click="() => (grantType = 'code')"
          />
          <HoppSmartItem
            :label="t('authorization.client_credentials')"
            :icon="
              grantType === 'client_credentials' ? IconCheckCircle : IconCircle
            "
            @click="() => (grantType = 'client_credentials')"
          />
        </div>
      </span>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <span class="flex flex-1 px-4 bg-transparent items-center">
        <label class="text-secondaryLight"> Place client credentials </label>
        <div class="flex flex-row" role="menu">
          <HoppSmartItem
            label="Body"
            :icon="
              clientCredentialsIn === 'header' ? IconCircle : IconCheckCircle
            "
            @click="() => (clientCredentialsIn = 'body')"
          />
          <HoppSmartItem
            label="Header"
            :icon="
              clientCredentialsIn === 'header' ? IconCheckCircle : IconCircle
            "
            @click="() => (clientCredentialsIn = 'header')"
          />
        </div>
      </span>
    </div>
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

<script setup lang="ts">
import { ref, watch } from "vue"
import { HoppRESTAuthOAuth2, parseTemplateString } from "@hoppscotch/data"
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import { pluckRef } from "@composables/ref"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { tokenRequest } from "~/helpers/oauth"
import { getCombinedEnvVariables } from "~/helpers/preRequest"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: HoppRESTAuthOAuth2
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

const grantType = pluckRef(auth, "grantType")

const clientCredentialsIn = pluckRef(auth, "clientCredentialsIn")

const oidcDiscoveryURL = pluckRef(auth, "oidcDiscoveryURL")

const authURL = pluckRef(auth, "authURL")

const accessTokenURL = pluckRef(auth, "accessTokenURL")

const clientID = pluckRef(auth, "clientID")

// TODO: Fix this type error. currently there is no type for clientSecret
const clientSecret = pluckRef(auth, "clientSecret" as any)

const scope = pluckRef(auth, "scope")
const oauth2Token = pluckRef(auth, "token")

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
      grantType: grantType.value || "code",
      clientCredentialsIn: clientCredentialsIn.value || "body",
      oidcDiscoveryUrl: parseTemplateString(oidcDiscoveryURL.value, envVars),
      authUrl: parseTemplateString(authURL.value, envVars),
      accessTokenUrl: parseTemplateString(accessTokenURL.value, envVars),
      clientId: parseTemplateString(clientID.value, envVars),
      clientSecret: parseTemplateString(clientSecret.value, envVars),
      scope: parseTemplateString(scope.value, envVars),
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
