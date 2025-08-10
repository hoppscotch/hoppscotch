<template>
  <div class="flex items-center px-4 border-b border-dividerLight">
    <label class="truncate font-semibold text-secondaryLight">
      {{ t("authorization.oauth.grant_type") }}
    </label>

    <tippy
      placement="bottom"
      interactive
      trigger="click"
      theme="popover"
      :on-shown="() => grantTypeTippyActions?.focus()"
      class="!flex-initial"
    >
      <HoppSmartSelectWrapper>
        <HoppButtonSecondary
          class="ml-2 rounded-none pr-8"
          :label="selectedGrantType?.label"
        />
      </HoppSmartSelectWrapper>
      <template #content="{ hide }">
        <div
          ref="grantTypeTippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          @keyup.escape="hide()"
        >
          <HoppSmartItem
            v-for="grantType in supportedGrantTypes"
            :key="grantType.id"
            :label="grantType.label"
            :icon="
              selectedGrantTypeID === grantType.id ? IconCircleDot : IconCircle
            "
            :active="selectedGrantTypeID === grantType.id"
            @click="
              () => {
                changeSelectedGrantType(grantType.id)

                hide()
              }
            "
          />
        </div>
      </template>
    </tippy>
  </div>

  <div class="flex flex-col">
    <div
      v-for="element in currentOAuthGrantTypeFormElements"
      :key="element.id"
      class="flex flex-1 border-b border-dividerLight"
    >
      <label
        v-if="element.type === 'text'"
        class="flex items-center ml-4 text-secondaryLight min-w-[6rem]"
      >
        {{ element.label }}
      </label>
      <SmartEnvInput
        v-if="element.type === 'text'"
        v-model="element.ref.value"
        :placeholder="getPlaceholderForField(element.id)"
        :envs="envs"
        :auto-complete-env="true"
        class="px-4"
      />
      <div
        v-else-if="element.type === 'checkbox'"
        class="px-4 py-2 flex items-center"
      >
        <span class="text-secondaryLight font-semibold mr-6">{{
          element.label
        }}</span>
        <HoppSmartCheckbox
          class="text-secondaryLight flex"
          :on="element.ref.value"
          @change="element.ref.value = !element.ref.value"
        ></HoppSmartCheckbox>
      </div>
      <div
        v-else-if="element.type === 'dropdown'"
        class="flex items-center px-4"
      >
        <label class="truncate text-secondaryLight">
          {{ element.label }}
        </label>
        <tippy
          v-if="element.ref.value"
          interactive
          trigger="click"
          theme="popover"
          class="!flex-initial"
        >
          <HoppSmartSelectWrapper>
            <HoppButtonSecondary
              class="ml-2 rounded-none pr-8"
              :label="element.ref.value.label"
            />
          </HoppSmartSelectWrapper>
          <template #content="{ hide }">
            <div
              :ref="element.tippyRefName"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                v-for="item in element.options"
                :key="item.id"
                :label="item.label"
                :icon="
                  element.ref.value.id === item.id ? IconCircleDot : IconCircle
                "
                :active="element.ref.value.id === item.id"
                @click="
                  () => {
                    element.ref.value = item
                    hide()
                  }
                "
              ></HoppSmartItem>
            </div>
          </template>
        </tippy>
      </div>
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
          :on-shown="() => authTippyActions?.focus()"
        >
          <HoppSmartSelectWrapper>
            <HoppButtonSecondary
              :label="passBy"
              class="ml-2 rounded-none pr-8"
            />
          </HoppSmartSelectWrapper>
          <template #content="{ hide }">
            <div
              ref="authTippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                v-for="addToTarget in addToTargets"
                :key="addToTarget.id"
                :label="addToTarget.label"
                :icon="
                  auth.addTo === addToTarget.id ? IconCircleDot : IconCircle
                "
                :active="auth.addTo === addToTarget.id"
                @click="
                  () => {
                    auth.addTo = addToTarget.id
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
    </div>

    <div class="flex flex-col">
      <div
        class="flex cursor-pointer items-center justify-between py-2 pl-4 text-secondaryLight transition hover:text-secondary"
        @click="toggleAdvancedConfig"
      >
        <span class="select-none">{{ t("authorization.advance_config") }}</span>
        <IconChevronDown
          v-if="!isAdvancedConfigExpanded"
          class="mr-4 opacity-50"
        />
        <IconChevronUp v-else class="mr-4 opacity-50" />
      </div>

      <div v-show="isAdvancedConfigExpanded">
        <div class="flex flex-col border-t border-dividerLight">
          <!-- Auth Request Parameters Section -->
          <div class="border-b border-dividerLight">
            <div class="flex items-center justify-between p-4">
              <label class="font-semibold text-secondaryLight">
                {{ t("authorization.oauth.auth_request") }}
              </label>
            </div>

            <div>
              <!-- Column Headers -->
              <div
                class="flex border-b divide-x divide-dividerLight border-dividerLight bg-primaryLight"
              >
                <span class="w-8"></span>
                <!-- Drag handle space -->
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("count.key") }}
                </span>
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("count.value") }}
                </span>
                <span class="w-8"></span>
                <!-- Active/Inactive toggle space -->
                <span class="w-8"></span>
                <!-- Delete button space -->
              </div>

              <div
                v-if="!workingAuthRequestParams.length"
                class="flex flex-col items-center justify-center p-4 text-secondaryLight"
              >
                <span class="text-center">
                  {{ t("empty.parameters") }}
                </span>

                <HoppButtonSecondary
                  class="mt-2"
                  :icon="IconPlus"
                  :label="`${t('action.add')}`"
                  @click="addAuthRequestParam()"
                />
              </div>

              <!-- Parameter rows -->
              <div v-else class="divide-y divide-dividerLight">
                <HttpKeyValue
                  v-for="(param, index) in workingAuthRequestParams"
                  :key="`auth-request-param-${param.id}`"
                  v-model:name="param.key"
                  v-model:value="param.value"
                  :show-description="false"
                  :total="workingAuthRequestParams.length"
                  :index="index"
                  :entity-id="param.id"
                  :entity-active="param.active"
                  :is-active="param.hasOwnProperty('active')"
                  :envs="envs"
                  :auto-complete-env="true"
                  :key-auto-complete-source="commonOAuth2AuthParams"
                  @update-entity="
                    updateAuthRequestParam($event.index, $event.payload)
                  "
                  @delete-entity="deleteAuthRequestParam($event)"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col border-t border-dividerLight">
          <!-- Token Request Parameters Section -->
          <div class="border-b border-dividerLight">
            <div class="flex items-center justify-between p-4">
              <label class="font-semibold text-secondaryLight">
                {{ t("authorization.oauth.token_request") }}
              </label>
            </div>

            <div>
              <!-- Column Headers -->
              <div
                class="flex border-b divide-x divide-dividerLight border-dividerLight bg-primaryLight"
              >
                <span class="w-8"></span>
                <!-- Drag handle space -->
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("count.key") }}
                </span>
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("count.value") }}
                </span>
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("authorization.oauth.send_in") }}
                </span>
                <span class="w-8"></span>
                <!-- Active/Inactive toggle space -->
                <span class="w-8"></span>
                <!-- Delete button space -->
              </div>

              <div
                v-if="!workingTokenRequestParams.length"
                class="flex flex-col items-center justify-center p-4 text-secondaryLight"
              >
                <span class="text-center">
                  {{ t("empty.parameters") }}
                </span>

                <HoppButtonSecondary
                  class="mt-2"
                  :icon="IconPlus"
                  :label="`${t('action.add')}`"
                  @click="addTokenRequestParam()"
                />
              </div>

              <!-- Parameter rows -->
              <div v-else class="divide-y divide-dividerLight">
                <HttpKeyValue
                  v-for="(param, index) in workingTokenRequestParams"
                  :key="`token-request-param-${param.id}`"
                  v-model:name="param.key"
                  v-model:value="param.value"
                  :show-description="false"
                  :total="workingTokenRequestParams.length"
                  :index="index"
                  :entity-id="param.id"
                  :entity-active="param.active"
                  :is-active="param.hasOwnProperty('active')"
                  :envs="envs"
                  :auto-complete-env="true"
                  :key-auto-complete-source="commonOAuth2TokenParams"
                  @update-entity="
                    updateTokenRequestParam($event.index, {
                      id: $event.payload.id,
                      key: $event.payload.key,
                      value: $event.payload.value,
                      sendIn: param.sendIn,
                      active: $event.payload.active,
                    })
                  "
                  @delete-entity="deleteTokenRequestParam($event)"
                >
                  <template #after-value>
                    <div class="flex flex-1">
                      <tippy interactive trigger="click" theme="popover">
                        <HoppSmartSelectWrapper>
                          <HoppButtonSecondary
                            :class="{ 'opacity-50': !param.active }"
                            class="flex-1 rounded-none text-left"
                            :label="
                              sendInOptionsLabels[param.sendIn] ||
                              t('authorization.oauth.send_in')
                            "
                          />
                        </HoppSmartSelectWrapper>
                        <template #content="{ hide }">
                          <div
                            class="flex flex-col focus:outline-none"
                            tabindex="0"
                            @keyup.escape="hide()"
                          >
                            <HoppSmartItem
                              v-for="option in sendInOptions"
                              :key="option"
                              :label="sendInOptionsLabels[option]"
                              :icon="
                                param.sendIn === option
                                  ? IconCircleDot
                                  : IconCircle
                              "
                              :active="param.sendIn === option"
                              @click="
                                () => {
                                  updateTokenRequestParam(index, {
                                    ...param,
                                    sendIn: option,
                                  })
                                  hide()
                                }
                              "
                            />
                          </div>
                        </template>
                      </tippy>
                    </div>
                  </template>
                </HttpKeyValue>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col border-t border-dividerLight">
          <!-- Refresh Request Parameters Section -->
          <div class="border-b border-dividerLight">
            <div class="flex items-center justify-between p-4">
              <label class="font-semibold text-secondaryLight">
                {{ t("authorization.oauth.refresh_request") }}
              </label>
            </div>

            <div>
              <!-- Column Headers -->
              <div
                class="flex border-b divide-x divide-dividerLight border-dividerLight bg-primaryLight"
              >
                <span class="w-8"></span>
                <!-- Drag handle space -->
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("count.key") }}
                </span>
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("count.value") }}
                </span>
                <span
                  class="flex-1 px-4 py-2 text-xs font-semibold text-secondaryLight"
                >
                  {{ t("authorization.oauth.send_in") }}
                </span>
                <span class="w-8"></span>
                <!-- Active/Inactive toggle space -->
                <span class="w-8"></span>
                <!-- Delete button space -->
              </div>

              <div
                v-if="!workingRefreshRequestParams.length"
                class="flex flex-col items-center justify-center p-4 text-secondaryLight"
              >
                <span class="text-center">
                  {{ t("empty.parameters") }}
                </span>

                <HoppButtonSecondary
                  class="mt-2"
                  :icon="IconPlus"
                  :label="`${t('action.add')}`"
                  @click="addRefreshRequestParam()"
                />
              </div>

              <!-- Parameter rows -->
              <div v-else class="divide-y divide-dividerLight">
                <HttpKeyValue
                  v-for="(param, index) in workingRefreshRequestParams"
                  :key="`refresh-request-param-${param.id}`"
                  v-model:name="param.key"
                  v-model:value="param.value"
                  :show-description="false"
                  :total="workingRefreshRequestParams.length"
                  :index="index"
                  :entity-id="param.id"
                  :entity-active="param.active"
                  :is-active="param.hasOwnProperty('active')"
                  :envs="envs"
                  :auto-complete-env="true"
                  :key-auto-complete-source="commonOAuth2RefreshParams"
                  @update-entity="
                    updateRefreshRequestParam($event.index, {
                      id: $event.payload.id,
                      key: $event.payload.key,
                      value: $event.payload.value,
                      sendIn: param.sendIn,
                      active: $event.payload.active,
                    })
                  "
                  @delete-entity="deleteRefreshRequestParam($event)"
                >
                  <template #after-value>
                    <div class="flex flex-1">
                      <tippy interactive trigger="click" theme="popover">
                        <HoppSmartSelectWrapper>
                          <HoppButtonSecondary
                            :class="{ 'opacity-50': !param.active }"
                            class="flex-1 rounded-none text-left"
                            :label="
                              sendInOptionsLabels[param.sendIn] ||
                              t('authorization.oauth.send_in')
                            "
                          />
                        </HoppSmartSelectWrapper>
                        <template #content="{ hide }">
                          <div
                            class="flex flex-col focus:outline-none"
                            tabindex="0"
                            @keyup.escape="hide()"
                          >
                            <HoppSmartItem
                              v-for="option in sendInOptions"
                              :key="option"
                              :label="sendInOptionsLabels[option]"
                              :icon="
                                param.sendIn === option
                                  ? IconCircleDot
                                  : IconCircle
                              "
                              :active="param.sendIn === option"
                              @click="
                                () => {
                                  updateRefreshRequestParam(index, {
                                    ...param,
                                    sendIn: option,
                                  })
                                  hide()
                                }
                              "
                            />
                          </div>
                        </template>
                      </tippy>
                    </div>
                  </template>
                </HttpKeyValue>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="p-2 gap-1 flex">
      <HoppButtonSecondary
        filled
        :loading="isGeneratingToken"
        :label="`${t('authorization.generate_token')}`"
        @click="generateOAuthToken()"
      />
      <HoppButtonSecondary
        v-if="runTokenRefresh"
        filled
        :loading="isRefreshingToken"
        :label="`${t('authorization.refresh_token')}`"
        @click="refreshOauthToken()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppGQLAuthOAuth2, HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { computed, onMounted, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { useOAuth2AdvancedParams } from "~/composables/oauth2/useOAuth2AdvancedParams"
import { useOAuth2GrantTypes } from "~/composables/oauth2/useOAuth2GrantTypes"
import { useToast } from "~/composables/toast"
import {
  commonOAuth2AuthParams,
  commonOAuth2RefreshParams,
  commonOAuth2TokenParams,
  sendInOptions,
  sendInOptionsLabels,
} from "~/helpers/oauth2Params"
import { AggregateEnvironment } from "~/newstore/environments"
import {
  grantTypesInvolvingRedirect,
  PersistedOAuthConfig,
} from "~/services/oauth/oauth.service"
import * as E from "fp-ts/Either"
import { PersistenceService } from "~/services/persistence"
import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconChevronUp from "~icons/lucide/chevron-up"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const toast = useToast()

const addToTargets = [
  {
    id: "HEADERS" as const,
    label: "Headers",
  },
  {
    id: "QUERY_PARAMS" as const,
    label: "Query Params",
  },
]

const getPlaceholderForField = (fieldId: string): string => {
  const placeholders: Record<string, string> = {
    authEndpoint: "https://example.com/oauth2/authorize",
    tokenEndpoint: "https://example.com/oauth2/token",
    clientId: "your_client_id_here",
    clientSecret: "your_client_secret_here",
    scopes: "read write",
    username: "your_username",
    password: "your_password",
  }
  return placeholders[fieldId] || t("authorization.oauth.enter_value")
}

const props = defineProps<{
  modelValue: HoppRESTAuthOAuth2 | HoppGQLAuthOAuth2
  isCollectionProperty?: boolean
  envs?: AggregateEnvironment[]
  source: "REST" | "GraphQL"
}>()

const auth = ref(props.modelValue)

// Loading states
const isGeneratingToken = ref(false)
const isRefreshingToken = ref(false)

// Advanced Configuration state
const isAdvancedConfigExpanded = ref(false)

const toggleAdvancedConfig = () => {
  isAdvancedConfigExpanded.value = !isAdvancedConfigExpanded.value
}

// Get advanced params management
const {
  workingAuthRequestParams,
  workingTokenRequestParams,
  workingRefreshRequestParams,
  addAuthRequestParam,
  updateAuthRequestParam,
  deleteAuthRequestParam,
  addTokenRequestParam,
  updateTokenRequestParam,
  deleteTokenRequestParam,
  addRefreshRequestParam,
  updateRefreshRequestParam,
  deleteRefreshRequestParam,
  initializeParams,
} = useOAuth2AdvancedParams(auth)

// Initialize advanced params on mount. e.g. authRequestParams, tokenRequestParams, refreshRequestParams
onMounted(initializeParams)

// Template refs for tippy actions
const grantTypeTippyActions = ref<HTMLElement | null>(null)
const pkceTippyActions = ref<HTMLElement | null>(null)
const authTippyActions = ref<HTMLElement | null>(null)
const clientAuthenticationTippyActions = ref<HTMLElement | null>(null)

// Get grant types management
const {
  supportedGrantTypes,
  selectedGrantTypeID,
  selectedGrantType,
  changeSelectedGrantType,
  runAction,
  runTokenRefresh,
  currentOAuthGrantTypeFormElements,
} = useOAuth2GrantTypes(
  auth,
  (...args) => setAccessTokenInActiveContext(...args),
  workingAuthRequestParams,
  workingTokenRequestParams,
  workingRefreshRequestParams,
  pkceTippyActions,
  clientAuthenticationTippyActions
)

const passBy = computed(() => {
  return (
    addToTargets.find((target) => target.id === auth.value.addTo)?.label ||
    t("state.none")
  )
})

const gqlTabsService = useService(GQLTabService)
const restTabsService = useService(RESTTabService)
const persistenceService = useService(PersistenceService)

const setAccessTokenInActiveContext = (
  accessToken?: string,
  refreshToken?: string
) => {
  if (props.isCollectionProperty && accessToken) {
    auth.value.grantTypeInfo = {
      ...auth.value.grantTypeInfo,
      token: accessToken,
    }

    // set the refresh token if provided
    // we also make sure the grantTypes supporting refreshTokens are
    if (
      refreshToken &&
      auth.value.grantTypeInfo.grantType === "AUTHORIZATION_CODE"
    ) {
      auth.value.grantTypeInfo = {
        ...auth.value.grantTypeInfo,
        refreshToken,
      }
    }

    return
  }

  if (props.source === "REST") {
    const restTab = restTabsService.currentActiveTab.value
    if (
      "request" in restTab.document &&
      restTab.document.request &&
      restTab.document.request.auth.authType === "oauth-2" &&
      accessToken
    ) {
      restTab.document.request.auth.grantTypeInfo.token = accessToken
    }

    if (
      refreshToken &&
      "request" in restTab.document &&
      restTab.document.request &&
      restTab.document.request.auth.authType === "oauth-2"
    ) {
      // @ts-expect-error - TODO: narrow the grantType to only supporting refresh tokens
      restTab.document.request.auth.grantTypeInfo.refreshToken = refreshToken
    }
  } else {
    const gqlTab = gqlTabsService.currentActiveTab.value
    if (
      "request" in gqlTab.document &&
      gqlTab.document.request &&
      gqlTab.document.request.auth.authType === "oauth-2" &&
      accessToken
    ) {
      gqlTab.document.request.auth.grantTypeInfo.token = accessToken
    }

    if (
      refreshToken &&
      "request" in gqlTab.document &&
      gqlTab.document.request &&
      gqlTab.document.request.auth.authType === "oauth-2"
    ) {
      // @ts-expect-error - TODO: narrow the grantType to only supporting refresh tokens
      gqlTab.document.request.auth.grantTypeInfo.refreshToken = refreshToken
    }
  }
}

const refreshOauthToken = async () => {
  if (!runTokenRefresh.value) {
    return
  }

  isRefreshingToken.value = true

  try {
    const res = await runTokenRefresh.value()

    if (E.isLeft(res)) {
      const errorMessages: Record<string, string> = {
        NO_REFRESH_TOKEN_PRESENT: t(
          "authorization.oauth.no_refresh_token_present"
        ),
        REFRESH_TOKEN_FUNCTION_NOT_DEFINED: t(
          "authorization.oauth.refresh_token_request_failed"
        ),
        OAUTH_REFRESH_TOKEN_FAILED: t(
          "authorization.oauth.refresh_token_request_failed"
        ),
      }

      const isKnownError = res.left in errorMessages

      if (!isKnownError) {
        toast.error(t("authorization.oauth.refresh_token_failed"))
        return
      }

      toast.error(errorMessages[res.left])
      return
    }

    toast.success(t("authorization.oauth.token_refreshed_successfully"))
  } finally {
    isRefreshingToken.value = false
  }
}

const generateOAuthToken = async () => {
  isGeneratingToken.value = true

  try {
    if (
      grantTypesInvolvingRedirect.includes(auth.value.grantTypeInfo.grantType)
    ) {
      const authConfig: PersistedOAuthConfig = {
        source: props.source,
        context: props.isCollectionProperty
          ? { type: "collection-properties", metadata: {} }
          : { type: "request-tab", metadata: {} },
        grant_type: auth.value.grantTypeInfo.grantType,
      }
      await persistenceService.setLocalConfig(
        "oauth_temp_config",
        JSON.stringify(authConfig)
      )
    }

    const res = await runAction.value?.()

    if (res && E.isLeft(res)) {
      const errorMessages = {
        VALIDATION_FAILED: t("authorization.oauth.validation_failed"),
        OAUTH_TOKEN_FETCH_FAILED: t("authorization.oauth.token_fetch_failed"),
      }
      if (res.left in errorMessages) {
        // @ts-expect-error - not possible to have a key that doesn't exist
        toast.error(errorMessages[res.left])
        return
      }

      toast.error(t("error.something_went_wrong"))

      return
    }
  } finally {
    isGeneratingToken.value = false
  }
}
</script>
