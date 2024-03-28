<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky z-10 flex items-center justify-between border-y border-dividerLight bg-primary pl-4"
      :class="[
        isCollectionProperty
          ? 'top-propertiesPrimaryStickyFold'
          : 'top-sidebarPrimaryStickyFold',
      ]"
    >
      <span class="flex items-center">
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("authorization.type") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
        >
          <HoppSmartSelectWrapper>
            <HoppButtonSecondary
              class="ml-2 rounded-none pr-8"
              :label="authName"
            />
          </HoppSmartSelectWrapper>
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                v-if="!isRootCollection"
                label="Inherit"
                :icon="authName === 'Inherit' ? IconCircleDot : IconCircle"
                :active="authName === 'Inherit'"
                @click="
                  () => {
                    auth.authType = 'inherit'
                    hide()
                  }
                "
              />
              <HoppSmartItem
                label="None"
                :icon="authName === 'None' ? IconCircleDot : IconCircle"
                :active="authName === 'None'"
                @click="
                  () => {
                    auth.authType = 'none'
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
                    auth.authType = 'basic'
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
                    auth.authType = 'bearer'
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
                    selectOAuth2AuthType()
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
                    auth.authType = 'api-key'
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
          {{ $t("authorization.include_in_url") }}
        </HoppSmartCheckbox>-->
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
    <HoppSmartPlaceholder
      v-if="auth.authType === 'none'"
      :src="`/images/states/${colorMode.value}/login.svg`"
      :alt="`${t('empty.authorization')}`"
      :text="t('empty.authorization')"
    >
      <template #body>
        <HoppButtonSecondary
          outline
          :label="t('app.documentation')"
          to="https://docs.hoppscotch.io/documentation/features/authorization"
          blank
          :icon="IconExternalLink"
          reverse
        />
      </template>
    </HoppSmartPlaceholder>
    <div v-else class="flex flex-1 border-b border-dividerLight">
      <div class="w-2/3 border-r border-dividerLight">
        <div v-if="auth.authType === 'basic'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.username"
              :environment-highlights="false"
              :placeholder="t('authorization.username')"
            />
          </div>
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.password"
              :environment-highlights="false"
              :placeholder="t('authorization.password')"
            />
          </div>
        </div>
        <div v-if="auth.authType === 'inherit'" class="p-4">
          <span v-if="inheritedProperties?.auth">
            Inherited
            {{ getAuthName(inheritedProperties.auth.inheritedAuth.authType) }}
            from Parent Collection {{ inheritedProperties?.auth.parentName }}
          </span>
          <span v-else>
            Please save this request in any collection to inherit the
            authorization
          </span>
        </div>
        <div v-if="auth.authType === 'bearer'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.token"
              :environment-highlights="false"
              placeholder="Token"
            />
          </div>
        </div>
        <div v-if="auth.authType === 'oauth-2'">
          <div class="flex flex-1 border-b border-dividerLight">
            <SmartEnvInput
              v-model="auth.grantTypeInfo.token"
              :environment-highlights="false"
              placeholder="Token"
            />
          </div>
          <HttpOAuth2Authorization v-model="auth" source="GraphQL" />
        </div>
        <div v-if="auth.authType === 'api-key'">
          <HttpAuthorizationApiKey v-model="auth" />
        </div>
      </div>
      <div
        class="z-[9] sticky top-upperTertiaryStickyFold h-full min-w-[12rem] max-w-1/3 flex-shrink-0 overflow-auto overflow-x-auto bg-primary p-4"
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
import { useI18n } from "@composables/i18n"
import { pluckRef } from "@composables/ref"
import { useColorMode } from "@composables/theming"
import { HoppGQLAuth, HoppGQLAuthOAuth2 } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { computed, onMounted, ref } from "vue"

import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconExternalLink from "~icons/lucide/external-link"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconTrash2 from "~icons/lucide/trash-2"

import { getDefaultAuthCodeOauthFlowParams } from "~/services/oauth/flows/authCode"

const t = useI18n()

const colorMode = useColorMode()

const props = defineProps<{
  modelValue: HoppGQLAuth
  isCollectionProperty?: boolean
  isRootCollection?: boolean
  inheritedProperties?: HoppInheritedProperty
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppGQLAuth): void
}>()

onMounted(() => {
  if (props.isRootCollection && auth.value.authType === "inherit") {
    auth.value = {
      authType: "none",
      authActive: true,
    }
  }
})

const auth = useVModel(props, "modelValue", emit)

const AUTH_KEY_NAME = {
  basic: "Basic Auth",
  bearer: "Bearer",
  "oauth-2": "OAuth 2.0",
  "api-key": "API key",
  none: "None",
  inherit: "Inherit",
} as const

const authType = pluckRef(auth, "authType")

const authName = computed(() =>
  AUTH_KEY_NAME[authType.value] ? AUTH_KEY_NAME[authType.value] : "None"
)

const getAuthName = (type: HoppGQLAuth["authType"] | undefined) => {
  if (!type) return "None"
  return AUTH_KEY_NAME[type] ? AUTH_KEY_NAME[type] : "None"
}

const selectOAuth2AuthType = () => {
  const defaultGrantTypeInfo: HoppGQLAuthOAuth2["grantTypeInfo"] = {
    ...getDefaultAuthCodeOauthFlowParams(),
    grantType: "AUTHORIZATION_CODE",
    token: "",
  }

  // @ts-expect-error - the existing grantTypeInfo might be in the auth object, typescript doesnt know that
  const existingGrantTypeInfo = auth.value.grantTypeInfo as
    | HoppGQLAuthOAuth2["grantTypeInfo"]
    | undefined

  const grantTypeInfo = existingGrantTypeInfo
    ? existingGrantTypeInfo
    : defaultGrantTypeInfo

  auth.value = {
    ...auth.value,
    authType: "oauth-2",
    addTo: "HEADERS",
    grantTypeInfo: grantTypeInfo,
  }
}

const authActive = pluckRef(auth, "authActive")

const clearContent = () => {
  auth.value = {
    authType: "inherit",
    authActive: true,
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
</script>
