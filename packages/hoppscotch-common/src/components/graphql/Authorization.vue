<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
    >
      <span class="flex items-center">
        <label class="font-semibold truncate text-secondaryLight">
          {{ t("authorization.type") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
        >
          <span class="select-wrapper">
            <HoppButtonSecondary
              class="pr-8 ml-2 rounded-none"
              :label="authName"
            />
          </span>
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                label="None"
                :icon="authName === 'None' ? IconCircleDot : IconCircle"
                :active="authName === 'None'"
                @click="
                  () => {
                    authType = 'none'
                    hide()
                  }
                "
              />
              <HoppSmartItem
                label="Basic Auth"
                :icon="authName === 'Basic Auth' ? IconCircleDot : IconCircle"
                :active="authName === 'Basic Auth'"
                @click="
                  () => {
                    authType = 'basic'
                    hide()
                  }
                "
              />
              <HoppSmartItem
                label="Bearer Token"
                :icon="authName === 'Bearer' ? IconCircleDot : IconCircle"
                :active="authName === 'Bearer'"
                @click="
                  () => {
                    authType = 'bearer'
                    hide()
                  }
                "
              />
              <HoppSmartItem
                label="OAuth 2.0"
                :icon="authName === 'OAuth 2.0' ? IconCircleDot : IconCircle"
                :active="authName === 'OAuth 2.0'"
                @click="
                  () => {
                    authType = 'oauth-2'
                    hide()
                  }
                "
              />
              <HoppSmartItem
                label="API key"
                :icon="authName === 'API key' ? IconCircleDot : IconCircle"
                :active="authName === 'API key'"
                @click="
                  () => {
                    authType = 'api-key'
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
      <div class="flex">
        <!-- <HoppSmartCheckbox
          :on="!URLExcludes.auth"
          @change="setExclude('auth', !$event)"
        >
          {{ t("authorization.include_in_url") }}
        </HoppSmartCheckbox> -->
        <HoppSmartCheckbox
          :on="authActive"
          class="px-2"
          @change="authActive = !authActive"
        >
          {{ t("state.enabled") }}
        </HoppSmartCheckbox>
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/authorization"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearContent"
        />
      </div>
    </div>
    <div
      v-if="authType === 'none'"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${colorMode.value}/login.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${t('empty.authorization')}`"
      />
      <span class="pb-4 text-center">
        {{ t("empty.authorization") }}
      </span>
      <HoppButtonSecondary
        outline
        :label="t('app.documentation')"
        to="https://docs.hoppscotch.io/documentation/features/authorization"
        blank
        :icon="IconExternalLink"
        reverse
        class="mb-4"
      />
    </div>
    <div v-else class="flex flex-1 border-b border-dividerLight">
      <div class="w-2/3 border-r border-dividerLight">
        <div v-if="authType === 'basic'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="basicUsername"
              :placeholder="t('authorization.username')"
            />
          </div>
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="basicPassword"
              :placeholder="t('authorization.password')"
            />
          </div>
        </div>
        <div v-if="authType === 'bearer'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput v-model="bearerToken" placeholder="Token" />
          </div>
        </div>
        <div v-if="authType === 'oauth-2'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput v-model="oauth2Token" placeholder="Token" />
          </div>
          <HttpOAuth2Authorization />
        </div>
        <div v-if="authType === 'api-key'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput v-model="apiKey" placeholder="Key" />
          </div>
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput v-model="apiValue" placeholder="Value" />
          </div>
          <div class="flex items-center border-b border-dividerLight">
            <span class="flex items-center">
              <label class="ml-4 text-secondaryLight">
                {{ t("authorization.pass_key_by") }}
              </label>
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => authTippyActions.focus()"
              >
                <span class="select-wrapper">
                  <HoppButtonSecondary
                    :label="addTo || t('state.none')"
                    class="pr-8 ml-2 rounded-none"
                  />
                </span>
                <template #content="{ hide }">
                  <div
                    ref="authTippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      :icon="addTo === 'Headers' ? IconCircleDot : IconCircle"
                      :active="addTo === 'Headers'"
                      :label="'Headers'"
                      @click="
                        () => {
                          addTo = 'Headers'
                          hide()
                        }
                      "
                    />
                    <HoppSmartItem
                      :icon="
                        addTo === 'Query params' ? IconCircleDot : IconCircle
                      "
                      :active="addTo === 'Query params'"
                      :label="'Query params'"
                      @click="
                        () => {
                          addTo = 'Query params'
                          hide()
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </span>
          </div>
        </div>
      </div>
      <div
        class="sticky flex-shrink-0 h-full p-4 overflow-auto overflow-x-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
      >
        <div class="pb-2 text-secondaryLight">
          {{ t("helpers.authorization") }}
        </div>
        <HoppSmartAnchor
          class="link"
          :label="t('authorization.learn')"
          :icon="IconExternalLink"
          to="https://docs.hoppscotch.io/documentation/features/authorization"
          blank
          reverse
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, Ref } from "vue"
import {
  HoppGQLAuthAPIKey,
  HoppGQLAuthBasic,
  HoppGQLAuthBearer,
  HoppGQLAuthOAuth2,
} from "@hoppscotch/data"

import { pluckRef } from "@composables/ref"
import { useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { gqlAuth$, setGQLAuth } from "~/newstore/GQLSession"

import IconTrash2 from "~icons/lucide/trash-2"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconExternalLink from "~icons/lucide/external-link"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconCircle from "~icons/lucide/circle"

const t = useI18n()
const colorMode = useColorMode()

const auth = useStream(
  gqlAuth$,
  { authType: "none", authActive: true },
  setGQLAuth
)
const authType = pluckRef(auth, "authType")
const authName = computed(() => {
  if (authType.value === "basic") return "Basic Auth"
  else if (authType.value === "bearer") return "Bearer"
  else if (authType.value === "oauth-2") return "OAuth 2.0"
  else if (authType.value === "api-key") return "API key"
  else return "None"
})
const authActive = pluckRef(auth, "authActive")
const basicUsername = pluckRef(auth as Ref<HoppGQLAuthBasic>, "username")
const basicPassword = pluckRef(auth as Ref<HoppGQLAuthBasic>, "password")
const bearerToken = pluckRef(auth as Ref<HoppGQLAuthBearer>, "token")
const oauth2Token = pluckRef(auth as Ref<HoppGQLAuthOAuth2>, "token")
const apiKey = pluckRef(auth as Ref<HoppGQLAuthAPIKey>, "key")
const apiValue = pluckRef(auth as Ref<HoppGQLAuthAPIKey>, "value")
const addTo = pluckRef(auth as Ref<HoppGQLAuthAPIKey>, "addTo")
if (typeof addTo.value === "undefined") {
  addTo.value = "Headers"
  apiKey.value = ""
  apiValue.value = ""
}

const clearContent = () => {
  auth.value = {
    authType: "none",
    authActive: true,
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
const authTippyActions = ref<any | null>(null)
</script>
