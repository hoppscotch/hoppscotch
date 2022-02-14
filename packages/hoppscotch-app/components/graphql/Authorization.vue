<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
    >
      <span class="flex items-center">
        <label class="font-semibold text-secondaryLight">
          {{ $t("authorization.type") }}
        </label>
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
                :label="authName"
              />
            </span>
          </template>
          <SmartItem
            label="None"
            :icon="
              authName === 'None'
                ? 'radio_button_checked'
                : 'radio_button_unchecked'
            "
            :active="authName === 'None'"
            @click.native="
              () => {
                authType = 'none'
                authTypeOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            label="Basic Auth"
            :icon="
              authName === 'Basic Auth'
                ? 'radio_button_checked'
                : 'radio_button_unchecked'
            "
            :active="authName === 'Basic Auth'"
            @click.native="
              () => {
                authType = 'basic'
                authTypeOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            label="Bearer Token"
            :icon="
              authName === 'Bearer'
                ? 'radio_button_checked'
                : 'radio_button_unchecked'
            "
            :active="authName === 'Bearer'"
            @click.native="
              () => {
                authType = 'bearer'
                authTypeOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            label="OAuth 2.0"
            :icon="
              authName === 'OAuth 2.0'
                ? 'radio_button_checked'
                : 'radio_button_unchecked'
            "
            :active="authName === 'OAuth 2.0'"
            @click.native="
              () => {
                authType = 'oauth-2'
                authTypeOptions.tippy().hide()
              }
            "
          />
          <SmartItem
            label="API key"
            :icon="
              authName === 'API key'
                ? 'radio_button_checked'
                : 'radio_button_unchecked'
            "
            :active="authName === 'API key'"
            @click.native="
              () => {
                authType = 'api-key'
                authTypeOptions.tippy().hide()
              }
            "
          />
        </tippy>
      </span>
      <div class="flex">
        <!-- <SmartCheckbox
          :on="!URLExcludes.auth"
          @change="setExclude('auth', !$event)"
        >
          {{ $t("authorization.include_in_url") }}
        </SmartCheckbox> -->
        <SmartCheckbox
          :on="authActive"
          class="px-2"
          @change="authActive = !authActive"
        >
          {{ $t("state.enabled") }}
        </SmartCheckbox>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/authorization"
          blank
          :title="$t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear')"
          svg="trash-2"
          @click.native="clearContent"
        />
      </div>
    </div>
    <div
      v-if="authType === 'none'"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/login.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="`${$t('empty.authorization')}`"
      />
      <span class="pb-4 text-center">
        {{ $t("empty.authorization") }}
      </span>
      <ButtonSecondary
        outline
        :label="$t('app.documentation')"
        to="https://docs.hoppscotch.io/features/authorization"
        blank
        svg="external-link"
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
              :placeholder="$t('authorization.username')"
              styles="bg-transparent flex flex-1 py-1 px-4"
            />
          </div>
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="basicPassword"
              :placeholder="$t('authorization.password')"
              styles="bg-transparent flex flex-1 py-1 px-4"
            />
          </div>
        </div>
        <div v-if="authType === 'bearer'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="bearerToken"
              placeholder="Token"
              styles="bg-transparent flex flex-1 py-1 px-4"
            />
          </div>
        </div>
        <div v-if="authType === 'oauth-2'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="oauth2Token"
              placeholder="Token"
              styles="bg-transparent flex flex-1 py-1 px-4"
            />
          </div>
          <HttpOAuth2Authorization />
        </div>
        <div v-if="authType === 'api-key'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="apiKey"
              placeholder="Key"
              styles="bg-transparent flex flex-1 py-1 px-4"
            />
          </div>
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="apiValue"
              placeholder="Value"
              styles="bg-transparent flex flex-1 py-1 px-4"
            />
          </div>
          <div class="flex items-center border-b border-dividerLight">
            <label class="ml-4 text-secondaryLight">
              {{ $t("authorization.pass_key_by") }}
            </label>
            <tippy
              ref="addToOptions"
              interactive
              trigger="click"
              theme="popover"
              arrow
            >
              <template #trigger>
                <span class="select-wrapper">
                  <ButtonSecondary
                    :label="addTo || $t('state.none')"
                    class="pr-8 ml-2 rounded-none"
                  />
                </span>
              </template>
              <SmartItem
                :icon="
                  addTo === 'Headers'
                    ? 'radio_button_checked'
                    : 'radio_button_unchecked'
                "
                :active="addTo === 'Headers'"
                :label="'Headers'"
                @click.native="
                  () => {
                    addTo = 'Headers'
                    addToOptions.tippy().hide()
                  }
                "
              />
              <SmartItem
                :icon="
                  addTo === 'Query params'
                    ? 'radio_button_checked'
                    : 'radio_button_unchecked'
                "
                :active="addTo === 'Query params'"
                :label="'Query params'"
                @click.native="
                  () => {
                    addTo = 'Query params'
                    addToOptions.tippy().hide()
                  }
                "
              />
            </tippy>
          </div>
        </div>
      </div>
      <div
        class="sticky h-full p-4 overflow-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
      >
        <div class="pb-2 text-secondaryLight">
          {{ $t("helpers.authorization") }}
        </div>
        <SmartAnchor
          class="link"
          :label="`${$t('authorization.learn')} \xA0 →`"
          to="https://docs.hoppscotch.io/features/authorization"
          blank
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, Ref } from "@nuxtjs/composition-api"
import {
  HoppGQLAuthAPIKey,
  HoppGQLAuthBasic,
  HoppGQLAuthBearer,
  HoppGQLAuthOAuth2,
} from "@hoppscotch/data"
import { pluckRef, useStream } from "~/helpers/utils/composables"
import { gqlAuth$, setGQLAuth } from "~/newstore/GQLSession"

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
const authTypeOptions = ref<any | null>(null)
const addToOptions = ref<any | null>(null)
</script>
