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

    <div v-if="selectedGrantTypeID === 'authCode'" class="flex flex-col">
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
                              sendInOptions.find(
                                (option) => option.value === param.sendIn
                              )?.label || t('authorization.oauth.send_in')
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
                              :key="option.value"
                              :label="option.label"
                              :icon="
                                param.sendIn === option.value
                                  ? IconCircleDot
                                  : IconCircle
                              "
                              :active="param.sendIn === option.value"
                              @click="
                                () => {
                                  updateTokenRequestParam(index, {
                                    ...param,
                                    sendIn: option.value as
                                      | 'headers'
                                      | 'body'
                                      | 'url',
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
                              sendInOptions.find(
                                (option) => option.value === param.sendIn
                              )?.label || t('authorization.oauth.send_in')
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
                              :key="option.value"
                              :label="option.label"
                              :icon="
                                param.sendIn === option.value
                                  ? IconCircleDot
                                  : IconCircle
                              "
                              :active="param.sendIn === option.value"
                              @click="
                                () => {
                                  updateRefreshRequestParam(index, {
                                    ...param,
                                    sendIn: option.value as
                                      | 'headers'
                                      | 'body'
                                      | 'url',
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
        :label="`${t('authorization.generate_token')}`"
        @click="generateOAuthToken()"
      />
      <HoppButtonSecondary
        v-if="runTokenRefresh"
        filled
        :label="`${t('authorization.refresh_token')}`"
        @click="refreshOauthToken()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppGQLAuthOAuth2, HoppRESTAuthOAuth2 } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import { Ref, computed, ref, watch, onMounted } from "vue"
import { z } from "zod"
import { useI18n } from "~/composables/i18n"
import { refWithCallbackOnChange } from "~/composables/ref"
import { useToast } from "~/composables/toast"
import {
  replaceTemplateString,
  replaceTemplateStringsInObjectValues,
} from "~/helpers/auth"
import {
  commonOAuth2AuthParams,
  commonOAuth2RefreshParams,
  commonOAuth2TokenParams,
  sendInOptions,
} from "~/helpers/oauth2Params"
import { AggregateEnvironment } from "~/newstore/environments"
import authCode, {
  AuthCodeOauthFlowParams,
  AuthCodeOauthRefreshParams,
  getDefaultAuthCodeOauthFlowParams,
} from "~/services/oauth/flows/authCode"
import clientCredentials, {
  ClientCredentialsFlowParams,
  getDefaultClientCredentialsFlowParams,
} from "~/services/oauth/flows/clientCredentials"
import implicit, {
  ImplicitOauthFlowParams,
  getDefaultImplicitOauthFlowParams,
} from "~/services/oauth/flows/implicit"
import passwordFlow, {
  PasswordFlowParams,
  getDefaultPasswordFlowParams,
} from "~/services/oauth/flows/password"
import {
  PersistedOAuthConfig,
  grantTypesInvolvingRedirect,
} from "~/services/oauth/oauth.service"
import { PersistenceService } from "~/services/persistence"
import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconChevronUp from "~icons/lucide/chevron-up"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const toast = useToast()

const gqlTabsService = useService(GQLTabService)
const persistenceService = useService(PersistenceService)
const restTabsService = useService(RESTTabService)

const props = defineProps<{
  modelValue: HoppRESTAuthOAuth2 | HoppGQLAuthOAuth2
  isCollectionProperty?: boolean
  envs?: AggregateEnvironment[]
  source: "REST" | "GraphQL"
}>()

const auth = ref(props.modelValue)

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

const passBy = computed(() => {
  return (
    addToTargets.find((target) => target.id === auth.value.addTo)?.label ||
    t("state.none")
  )
})

const supportedGrantTypes = [
  {
    // used for both authCode and authCodePKCE
    id: "authCode" as const,
    label: t("authorization.oauth.label_auth_code"),
    formElements: computed(() => {
      if (!(auth.value.grantTypeInfo.grantType === "AUTHORIZATION_CODE")) {
        return
      }

      const grantType = auth.value.grantTypeInfo

      const authEndpoint = refWithCallbackOnChange(
        grantType?.authEndpoint,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            authEndpoint: value,
          }
        }
      )

      const tokenEndpoint = refWithCallbackOnChange(
        grantType?.tokenEndpoint,
        (value) => {
          if (!("tokenEndpoint" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            tokenEndpoint: value,
          }
        }
      )

      const clientID = refWithCallbackOnChange(grantType?.clientID, (value) => {
        auth.value.grantTypeInfo = {
          ...auth.value.grantTypeInfo,
          clientID: value,
        }
      })

      const clientSecret = refWithCallbackOnChange(
        grantType?.clientSecret,
        (value) => {
          if (!("clientSecret" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientSecret: value ?? "",
          }
        }
      )

      const scopes = refWithCallbackOnChange(
        grantType?.scopes ? grantType.scopes : undefined,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            scopes: value,
          }
        }
      )

      const isPKCE = refWithCallbackOnChange(
        auth.value.grantTypeInfo.isPKCE,
        (value) => {
          if (!("isPKCE" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            isPKCE: value,
          }
        }
      )

      const codeChallenge: Ref<{
        id: "plain" | "S256"
        label: string
      } | null> = refWithCallbackOnChange(
        auth.value.grantTypeInfo.codeVerifierMethod
          ? {
              id: auth.value.grantTypeInfo.codeVerifierMethod,
              label:
                auth.value.grantTypeInfo.codeVerifierMethod === "plain"
                  ? "Plain"
                  : "SHA-256",
            }
          : null,
        (value) => {
          if (!("codeVerifierMethod" in auth.value.grantTypeInfo) || !value) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            codeVerifierMethod: value.id,
          }
        }
      )

      const refreshToken = async () => {
        const grantTypeInfo = auth.value.grantTypeInfo

        if (!("refreshToken" in grantTypeInfo)) {
          return E.left("NO_REFRESH_TOKEN_PRESENT" as const)
        }

        const refreshToken = grantTypeInfo.refreshToken

        if (!refreshToken) {
          return E.left("NO_REFRESH_TOKEN_PRESENT" as const)
        }

        const params: AuthCodeOauthRefreshParams = {
          clientID: clientID.value,
          clientSecret: clientSecret.value,
          tokenEndpoint: tokenEndpoint.value,
          refreshToken,
        }

        const unwrappedParams = replaceTemplateStringsInObjectValues(params)

        const refreshTokenFunc = authCode.refreshToken

        if (!refreshTokenFunc) {
          return E.left("REFRESH_TOKEN_FUNCTION_NOT_DEFINED" as const)
        }

        const res = await refreshTokenFunc(unwrappedParams)

        if (E.isLeft(res)) {
          return E.left("OAUTH_REFRESH_TOKEN_FAILED" as const)
        }

        setAccessTokenInActiveContext(
          res.right.access_token,
          res.right.refresh_token
        )

        return E.right(undefined)
      }

      const runAction = async () => {
        const params: AuthCodeOauthFlowParams = {
          authEndpoint: authEndpoint.value,
          tokenEndpoint: tokenEndpoint.value,
          clientID: clientID.value,
          clientSecret: clientSecret.value,
          scopes: scopes.value,
          isPKCE: isPKCE.value,
          codeVerifierMethod: codeChallenge.value?.id,
          authRequestParams: workingAuthRequestParams.value
            .filter((p) => p.active && p.key && p.value)
            .map((p) => ({
              id: p.id,
              key: replaceTemplateString(p.key),
              value: replaceTemplateString(p.value),
              active: p.active,
              sendIn: p.sendIn,
            })),
          tokenRequestParams: workingTokenRequestParams.value
            .filter((p) => p.active && p.key && p.value)
            .map((p) => ({
              id: p.id,
              key: replaceTemplateString(p.key),
              value: replaceTemplateString(p.value),
              active: p.active,
              sendIn: p.sendIn,
            })),
          refreshRequestParams: workingRefreshRequestParams.value
            .filter((p) => p.active && p.key && p.value)
            .map((p) => ({
              id: p.id,
              key: replaceTemplateString(p.key),
              value: replaceTemplateString(p.value),
              active: p.active,
              sendIn: p.sendIn,
            })),
        }

        const unwrappedParams = replaceTemplateStringsInObjectValues(params)

        const parsedArgs = authCode.params.safeParse(unwrappedParams)

        if (!parsedArgs.success) {
          return E.left("VALIDATION_FAILED" as const)
        }

        const res = await authCode.init(parsedArgs.data)

        if (E.isLeft(res)) {
          return res
        }

        return E.right(undefined)
      }

      const pkceElements = computed(() => {
        const checkbox = {
          id: "isPKCE",
          label: t("authorization.oauth.label_use_pkce"),
          type: "checkbox" as const,
          ref: isPKCE,
          onChange: (e: Event) => {
            const target = e.target as HTMLInputElement

            isPKCE.value = target.checked
          },
        }

        return isPKCE.value
          ? [
              checkbox,
              {
                id: "codeChallenge",
                label: t("authorization.oauth.label_code_challenge"),
                type: "dropdown" as const,
                ref: codeChallenge,
                tippyRefName: "pkceTippyActions",
                tippyRef: pkceTippyActions,
                options: [
                  {
                    id: "plain" as const,
                    label: "Plain",
                  },
                  {
                    id: "S256" as const,
                    label: "SHA-256",
                  },
                ],
              },
            ]
          : [checkbox]
      })

      const elements = computed(() => {
        return [
          ...pkceElements.value,
          {
            id: "authEndpoint",
            label: t("authorization.oauth.label_authorization_endpoint"),
            type: "text" as const,
            ref: authEndpoint,
          },
          {
            id: "tokenEndpoint",
            label: t("authorization.oauth.label_token_endpoint"),
            type: "text" as const,
            ref: tokenEndpoint,
          },
          {
            id: "clientId",
            label: t("authorization.oauth.label_client_id"),
            type: "text" as const,
            ref: clientID,
          },
          {
            id: "clientSecret",
            label: t("authorization.oauth.label_client_secret"),
            type: "text" as const,
            ref: clientSecret,
          },
          {
            id: "scopes",
            label: t("authorization.oauth.label_scopes"),
            type: "text" as const,
            ref: scopes,
          },
        ]
      })

      return {
        runAction,
        refreshToken,
        elements,
      }
    }),
  },
  {
    id: "clientCredentials" as const,
    label: t("authorization.oauth.label_client_credentials"),
    formElements: computed(() => {
      if (!(auth.value.grantTypeInfo.grantType === "CLIENT_CREDENTIALS")) {
        return
      }

      const grantTypeInfo = auth.value.grantTypeInfo

      const authEndpoint = refWithCallbackOnChange(
        grantTypeInfo?.authEndpoint,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            authEndpoint: value,
          }
        }
      )

      const clientID = refWithCallbackOnChange(
        grantTypeInfo?.clientID,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientID: value,
          }
        }
      )

      const clientSecret = refWithCallbackOnChange(
        grantTypeInfo?.clientSecret,
        (value) => {
          if (!("clientSecret" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientSecret: value,
          }
        }
      )

      const scopes = refWithCallbackOnChange(
        grantTypeInfo?.scopes ? grantTypeInfo.scopes : undefined,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            scopes: value,
          }
        }
      )

      const clientAuthentication = refWithCallbackOnChange(
        grantTypeInfo.clientAuthentication
          ? grantTypeInfo.clientAuthentication === "AS_BASIC_AUTH_HEADERS"
            ? {
                id: "AS_BASIC_AUTH_HEADERS" as const,
                label: t("authorization.oauth.label_send_as_basic_auth"),
              }
            : {
                id: "IN_BODY" as const,
                label: t("authorization.oauth.label_send_in_body"),
              }
          : {
              id: "IN_BODY" as const,
              label: t("authorization.oauth.label_send_in_body"),
            },
        (value) => {
          if (!("clientAuthentication" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientAuthentication: value.id,
          }
        }
      )

      const runAction = async () => {
        const values: ClientCredentialsFlowParams =
          replaceTemplateStringsInObjectValues({
            authEndpoint: authEndpoint.value,
            clientID: clientID.value,
            clientSecret: clientSecret.value,
            scopes: scopes.value,
            clientAuthentication: clientAuthentication.value.id,
          })

        const parsedArgs = clientCredentials.params.safeParse(values)

        if (!parsedArgs.success) {
          return E.left("VALIDATION_FAILED" as const)
        }

        const res = await clientCredentials.init(parsedArgs.data)

        if (E.isLeft(res)) {
          return E.left("OAUTH_TOKEN_FETCH_FAILED" as const)
        }

        setAccessTokenInActiveContext(res.right?.access_token)

        toast.success(t("authorization.oauth.token_fetched_successfully"))

        return E.right(undefined)
      }

      const elements = computed(() => {
        return [
          {
            id: "authEndpoint",
            label: t("authorization.oauth.label_authorization_endpoint"),
            type: "text" as const,
            ref: authEndpoint,
          },
          {
            id: "clientId",
            label: t("authorization.oauth.label_client_id"),
            type: "text" as const,
            ref: clientID,
          },
          {
            id: "clientSecret",
            label: t("authorization.oauth.label_client_secret"),
            type: "text" as const,
            ref: clientSecret,
          },
          {
            id: "scopes",
            label: t("authorization.oauth.label_scopes"),
            type: "text" as const,
            ref: scopes,
          },
          {
            id: "clientAuthentication",
            label: t("authorization.oauth.label_send_as"),
            type: "dropdown" as const,
            ref: clientAuthentication,
            tippyRefName: "clientAuthenticationTippyActions",
            tippyRef: clientAuthenticationTippyActions,
            options: [
              {
                id: "IN_BODY" as const,
                label: t("authorization.oauth.label_send_in_body"),
              },
              {
                id: "AS_BASIC_AUTH_HEADERS" as const,
                label: t("authorization.oauth.label_send_as_basic_auth"),
              },
            ],
          },
        ]
      })

      return {
        runAction,
        elements,
      }
    }),
  },
  {
    id: "password" as const,
    label: "Password",
    formElements: computed(() => {
      if (!(auth.value.grantTypeInfo.grantType === "PASSWORD")) {
        return
      }

      const grantTypeInfo = auth.value.grantTypeInfo

      const authEndpoint = refWithCallbackOnChange(
        grantTypeInfo?.authEndpoint,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            authEndpoint: value,
          }
        }
      )

      const clientID = refWithCallbackOnChange(
        grantTypeInfo?.clientID,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientID: value,
          }
        }
      )

      const clientSecret = refWithCallbackOnChange(
        grantTypeInfo?.clientSecret,
        (value) => {
          if (!("clientSecret" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientSecret: value,
          }
        }
      )

      const scopes = refWithCallbackOnChange(
        grantTypeInfo?.scopes ? grantTypeInfo.scopes : undefined,
        (value) => {
          auth.value.grantTypeInfo.scopes = value
        }
      )

      const username = refWithCallbackOnChange(
        grantTypeInfo?.username,
        (value) => {
          if (!("username" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            username: value,
          }
        }
      )

      const password = refWithCallbackOnChange(
        grantTypeInfo?.password,
        (value) => {
          if (!("password" in auth.value.grantTypeInfo)) {
            return
          }

          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            password: value,
          }
        }
      )

      const runAction = async () => {
        const values: PasswordFlowParams = replaceTemplateStringsInObjectValues(
          {
            authEndpoint: authEndpoint.value,
            clientID: clientID.value,
            clientSecret: clientSecret.value,
            scopes: scopes.value,
            username: username.value,
            password: password.value,
          }
        )

        const parsedArgs = passwordFlow.params.safeParse(values)

        if (!parsedArgs.success) {
          return E.left("VALIDATION_FAILED" as const)
        }

        const res = await passwordFlow.init(parsedArgs.data)

        if (E.isLeft(res)) {
          return E.left("OAUTH_TOKEN_FETCH_FAILED" as const)
        }

        setAccessTokenInActiveContext(res.right?.access_token)

        toast.success(t("authorization.oauth.token_fetched_successfully"))

        return E.right(undefined)
      }

      const elements = computed(() => {
        return [
          {
            id: "authEndpoint",
            label: t("authorization.oauth.label_authorization_endpoint"),
            type: "text" as const,
            ref: authEndpoint,
          },
          {
            id: "clientId",
            label: t("authorization.oauth.label_client_id"),
            type: "text" as const,
            ref: clientID,
          },
          {
            id: "clientSecret",
            label: t("authorization.oauth.label_client_secret"),
            type: "text" as const,
            ref: clientSecret,
          },
          {
            id: "username",
            label: t("authorization.oauth.label_username"),
            type: "text" as const,
            ref: username,
          },
          {
            id: "password",
            label: t("authorization.oauth.label_password"),
            type: "text" as const,
            ref: password,
          },
          {
            id: "scopes",
            label: t("authorization.oauth.label_scopes"),
            type: "text" as const,
            ref: scopes,
          },
        ]
      })

      return {
        runAction,
        elements,
      }
    }),
  },
  {
    id: "implicit" as const,
    label: t("authorization.oauth.label_implicit"),
    formElements: computed(() => {
      const grantTypeInfo = auth.value.grantTypeInfo

      const authEndpoint = refWithCallbackOnChange(
        grantTypeInfo?.authEndpoint,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            authEndpoint: value,
          }
        }
      )

      const clientID = refWithCallbackOnChange(
        grantTypeInfo?.clientID,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            clientID: value,
          }
        }
      )

      const scopes = refWithCallbackOnChange(
        grantTypeInfo?.scopes ? grantTypeInfo.scopes : undefined,
        (value) => {
          auth.value.grantTypeInfo = {
            ...auth.value.grantTypeInfo,
            scopes: value,
          }
        }
      )

      const runAction = () => {
        const values: ImplicitOauthFlowParams =
          replaceTemplateStringsInObjectValues({
            authEndpoint: authEndpoint.value,
            clientID: clientID.value,
            scopes: scopes.value,
          })

        const unwrappedValues = replaceTemplateStringsInObjectValues(values)

        const parsedArgs = implicit.params.safeParse(unwrappedValues)

        if (!parsedArgs.success) {
          return E.left("VALIDATION_FAILED" as const)
        }

        implicit.init(parsedArgs.data)

        return E.right(undefined)
      }

      const elements = computed(() => {
        return [
          {
            id: "authEndpoint",
            label: t("authorization.oauth.label_authorization_endpoint"),
            type: "text" as const,
            ref: authEndpoint,
          },
          {
            id: "clientId",
            label: t("authorization.oauth.label_client_id"),
            type: "text" as const,
            ref: clientID,
          },
          {
            id: "scopes",
            label: t("authorization.oauth.label_scopes"),
            type: "text" as const,
            ref: scopes,
          },
        ]
      })

      return {
        runAction,
        elements,
      }
    }),
  },
]

type GrantTypes = z.infer<
  typeof HoppRESTAuthOAuth2
>["grantTypeInfo"]["grantType"]

const grantTypeMap: Record<
  GrantTypes,
  (typeof supportedGrantTypes)[number]["id"]
> = {
  AUTHORIZATION_CODE: "authCode",
  CLIENT_CREDENTIALS: "clientCredentials",
  IMPLICIT: "implicit",
  PASSWORD: "password",
} as const

const grantTypeDefaultPayload = {
  AUTHORIZATION_CODE: getDefaultAuthCodeOauthFlowParams,
  CLIENT_CREDENTIALS: getDefaultClientCredentialsFlowParams,
  IMPLICIT: getDefaultImplicitOauthFlowParams,
  PASSWORD: getDefaultPasswordFlowParams,
} as const

const selectedGrantTypeID = computed(() => {
  const currentGrantType = auth.value.grantTypeInfo.grantType
  return grantTypeMap[currentGrantType]
})

const selectedGrantType = computed(() => {
  return supportedGrantTypes.find(
    (grantType) => grantType.id === selectedGrantTypeID.value
  )
})

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

  const tabService = props.source === "REST" ? restTabsService : gqlTabsService

  if (
    tabService.currentActiveTab.value.document.request.auth.authType ===
      "oauth-2" &&
    accessToken
  ) {
    tabService.currentActiveTab.value.document.request.auth.grantTypeInfo.token =
      accessToken
  }

  if (
    refreshToken &&
    tabService.currentActiveTab.value.document.request.auth.authType ===
      "oauth-2"
  ) {
    // @ts-expect-error - TODO: narrow the grantType to only supporting refresh tokens
    tabService.currentActiveTab.value.document.request.auth.grantTypeInfo.refreshToken =
      refreshToken
  }
}

const changeSelectedGrantType = (
  grantType: (typeof supportedGrantTypes)[number]["id"]
) => {
  const keys = Object.keys(grantTypeMap) as GrantTypes[]

  const grantTypeToSet = keys.find((key) => grantTypeMap[key] === grantType)

  if (grantTypeToSet) {
    auth.value.grantTypeInfo.grantType = grantTypeToSet

    const getDefaultPayload = grantTypeDefaultPayload[grantTypeToSet]

    // set the default payload for the grant type
    // for eg: if the grant type was auth code, and then the user selected the password grant type,
    // there wont be a password key in the payload
    // so we set the default payload, and it'll add all the keys that are missing
    if (getDefaultPayload) {
      auth.value.grantTypeInfo = {
        ...getDefaultPayload(),
        ...auth.value.grantTypeInfo,
      }
    }
  }
}

const runAction = computed(() => {
  return selectedGrantType.value?.formElements.value?.runAction
})

const runTokenRefresh = computed(() => {
  // the only grant type that supports refresh tokens is the authCode grant type
  if (selectedGrantType.value?.id === "authCode") {
    return selectedGrantType.value?.formElements.value?.refreshToken
  }

  return null
})

const currentOAuthGrantTypeFormElements = computed(() => {
  return selectedGrantType.value?.formElements.value?.elements.value
})

const refreshOauthToken = async () => {
  if (!runTokenRefresh.value) {
    return
  }

  const res = await runTokenRefresh.value()

  if (E.isLeft(res)) {
    const errorMessages = {
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
}

const generateOAuthToken = async () => {
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
}

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

const grantTypeTippyActions = ref<HTMLElement | null>(null)
const pkceTippyActions = ref<HTMLElement | null>(null)
const authTippyActions = ref<HTMLElement | null>(null)
const clientAuthenticationTippyActions = ref<HTMLElement | null>(null)

// Advanced Configuration state
const isAdvancedConfigExpanded = ref(false)

const toggleAdvancedConfig = () => {
  isAdvancedConfigExpanded.value = !isAdvancedConfigExpanded.value
}

// Advanced Configuration: Auth Request Parameters
type OAuth2AdvancedParam = {
  id: number
  key: string
  value: string
  active: boolean
  sendIn?: "headers" | "url" | "body"
}

let paramsIdCounter = 1000

// Initialize working auth request params
const workingAuthRequestParams = ref<OAuth2AdvancedParam[]>([
  { id: paramsIdCounter++, key: "", value: "", active: true },
])

// Watch for changes in working auth request params
watch(
  workingAuthRequestParams,
  (newParams: OAuth2AdvancedParam[]) => {
    // Auto-add empty row when the last row is filled
    if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
      workingAuthRequestParams.value.push({
        id: paramsIdCounter++,
        key: "",
        value: "",
        active: true,
      })
    }

    // Update auth.value.grantTypeInfo with non-empty params
    const nonEmptyParams = newParams.filter(
      (p: OAuth2AdvancedParam) => p.key !== "" || p.value !== ""
    )

    if ("authRequestParams" in auth.value.grantTypeInfo) {
      auth.value.grantTypeInfo.authRequestParams = nonEmptyParams.map(
        (param) => ({
          id: param.id,
          key: param.key,
          value: param.value,
          active: param.active,
        })
      )
    }
  },
  { deep: true }
)

// Functions for auth request params management
const addAuthRequestParam = () => {
  workingAuthRequestParams.value.push({
    id: paramsIdCounter++,
    key: "",
    value: "",
    active: true,
  })
}

const updateAuthRequestParam = (
  index: number,
  payload: OAuth2AdvancedParam
) => {
  workingAuthRequestParams.value[index] = payload
}

const deleteAuthRequestParam = (index: number) => {
  // Only delete if it's not the last empty row, or if there are multiple rows
  if (workingAuthRequestParams.value.length > 1) {
    workingAuthRequestParams.value.splice(index, 1)
  }
}

// Token Request Parameters
interface OAuth2TokenParam {
  id: number
  key: string
  value: string
  sendIn: "headers" | "body" | "url"
  active: boolean
}

// Initialize working token request params
const workingTokenRequestParams = ref<OAuth2TokenParam[]>([
  {
    id: paramsIdCounter++,
    key: "",
    value: "",
    sendIn: "body",
    active: true,
  },
])

// Watch for changes in working token request params
watch(
  workingTokenRequestParams,
  (newParams: OAuth2TokenParam[]) => {
    // Auto-add empty row when the last row is filled
    if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
      workingTokenRequestParams.value.push({
        id: paramsIdCounter++,
        key: "",
        value: "",
        sendIn: "body",
        active: true,
      })
    }

    // Update auth.value.grantTypeInfo with non-empty params
    const nonEmptyParams = newParams.filter(
      (p: OAuth2TokenParam) => p.key !== "" || p.value !== ""
    )

    if ("tokenRequestParams" in auth.value.grantTypeInfo) {
      auth.value.grantTypeInfo.tokenRequestParams = nonEmptyParams.map(
        (param) => ({
          id: param.id,
          key: param.key,
          value: param.value,
          sendIn: param.sendIn,
          active: param.active,
        })
      )
    }
  },
  { deep: true }
)

// Functions for token request params management
const addTokenRequestParam = () => {
  workingTokenRequestParams.value.push({
    id: paramsIdCounter++,
    key: "",
    value: "",
    sendIn: "body",
    active: true,
  })
}

const updateTokenRequestParam = (index: number, payload: OAuth2TokenParam) => {
  workingTokenRequestParams.value[index] = payload
}

const deleteTokenRequestParam = (index: number) => {
  // Only delete if it's not the last empty row, or if there are multiple rows
  if (workingTokenRequestParams.value.length > 1) {
    workingTokenRequestParams.value.splice(index, 1)
  }
}

// Refresh Request Parameters
interface OAuth2RefreshParam {
  id: number
  key: string
  value: string
  sendIn: "headers" | "body" | "url"
  active: boolean
}

// Initialize working refresh request params
const workingRefreshRequestParams = ref<OAuth2RefreshParam[]>([
  {
    id: paramsIdCounter++,
    key: "",
    value: "",
    sendIn: "body",
    active: true,
  },
])

// Watch for changes in working refresh request params
watch(
  workingRefreshRequestParams,
  (newParams: OAuth2RefreshParam[]) => {
    // Auto-add empty row when the last row is filled
    if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
      workingRefreshRequestParams.value.push({
        id: paramsIdCounter++,
        key: "",
        value: "",
        sendIn: "body",
        active: true,
      })
    }

    // Update auth.value.grantTypeInfo with non-empty params
    const nonEmptyParams = newParams.filter(
      (p: OAuth2RefreshParam) => p.key !== "" || p.value !== ""
    )

    if ("refreshRequestParams" in auth.value.grantTypeInfo) {
      auth.value.grantTypeInfo.refreshRequestParams = nonEmptyParams.map(
        (param) => ({
          id: param.id,
          key: param.key,
          value: param.value,
          sendIn: param.sendIn,
          active: param.active,
        })
      )
    }
  },
  { deep: true }
)

// Functions for refresh request params management
const addRefreshRequestParam = () => {
  workingRefreshRequestParams.value.push({
    id: paramsIdCounter++,
    key: "",
    value: "",
    sendIn: "body",
    active: true,
  })
}

const updateRefreshRequestParam = (
  index: number,
  payload: OAuth2RefreshParam
) => {
  workingRefreshRequestParams.value[index] = payload
}

const deleteRefreshRequestParam = (index: number) => {
  // Only delete if it's not the last empty row, or if there are multiple rows
  if (workingRefreshRequestParams.value.length > 1) {
    workingRefreshRequestParams.value.splice(index, 1)
  }
}

// Initialize advanced parameters from the auth object when component mounts
onMounted(() => {
  if (
    "authRequestParams" in auth.value.grantTypeInfo &&
    auth.value.grantTypeInfo.authRequestParams &&
    auth.value.grantTypeInfo.authRequestParams.length > 0
  ) {
    workingAuthRequestParams.value =
      auth.value.grantTypeInfo.authRequestParams.map((param) => ({
        id: param.id || paramsIdCounter++,
        key: param.key,
        value: param.value,
        active: param.active,
      }))
  }

  if (
    "tokenRequestParams" in auth.value.grantTypeInfo &&
    auth.value.grantTypeInfo.tokenRequestParams &&
    auth.value.grantTypeInfo.tokenRequestParams.length > 0
  ) {
    workingTokenRequestParams.value = [
      ...auth.value.grantTypeInfo.tokenRequestParams.map((param) => ({
        id: param.id || paramsIdCounter++,
        key: param.key,
        value: param.value,
        sendIn: param.sendIn || "body",
        active: param.active,
      })),

      {
        id: paramsIdCounter++,
        key: "",
        value: "",
        sendIn: "body",
        active: true,
      },
    ]
  }

  if (
    "refreshRequestParams" in auth.value.grantTypeInfo &&
    auth.value.grantTypeInfo.refreshRequestParams &&
    auth.value.grantTypeInfo.refreshRequestParams.length > 0
  ) {
    workingRefreshRequestParams.value = [
      ...auth.value.grantTypeInfo.refreshRequestParams.map((param) => ({
        id: param.id || paramsIdCounter++,
        key: param.key,
        value: param.value,
        sendIn: param.sendIn || "body",
        active: param.active,
      })),
      {
        id: paramsIdCounter++,
        key: "",
        value: "",
        sendIn: "body",
        active: true,
      },
    ]
  }
})
</script>
