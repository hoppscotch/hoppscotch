<template>
  <details class="flex flex-col">
    <summary
      class="flex cursor-pointer items-center justify-between py-2 pl-4 text-secondaryLight transition hover:text-secondary"
    >
      <span class="select-none">{{ t("authorization.advance_config") }}</span>
    </summary>

    <div class="flex flex-col border-t border-dividerLight">
      <!-- Auth Request Parameters Section -->
      <div class="border-b border-dividerLight">
        <div class="flex items-center justify-between p-4">
          <label class="font-semibold text-secondaryLight">
            {{ t("authorization.oauth.auth_request") }}
          </label>
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              @click="clearAuthRequestParams"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('add.new')"
              :icon="IconPlus"
              @click="addAuthRequestParam"
            />
          </div>
        </div>

        <div
          v-if="workingAuthRequestParams.length === 0"
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${colorMode.value}/add_category.svg`"
            :alt="`${t('empty.parameters')}`"
            class="mb-4 w-16 flex-shrink-0 text-center opacity-50"
          />
          <span class="text-center">
            {{ t("empty.parameters") }}
          </span>
        </div>

        <div v-else class="divide-y divide-dividerLight">
          <OAuth2KeyValue
            v-for="(param, index) in workingAuthRequestParams"
            :key="`auth-request-param-${param.id}`"
            v-model:name="param.key"
            v-model:value="param.value"
            v-model:description="param.description"
            :total="workingAuthRequestParams.length"
            :index="index"
            :entity-id="param.id"
            :entity-active="param.active"
            :is-active="param.hasOwnProperty('active')"
            :envs="envs"
            @update-entity="
              updateAuthRequestParam($event.index, $event.payload)
            "
            @delete-entity="deleteAuthRequestParam($event)"
          />
        </div>
      </div>

      <!-- Token Request Parameters Section -->
      <div class="border-b border-dividerLight">
        <div class="flex items-center justify-between p-4">
          <label class="font-semibold text-secondaryLight">
            {{ t("authorization.oauth.token_request") }}
          </label>
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              @click="clearTokenRequestParams"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('add.new')"
              :icon="IconPlus"
              @click="addTokenRequestParam"
            />
          </div>
        </div>

        <div
          v-if="workingTokenRequestParams.length === 0"
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${colorMode.value}/add_category.svg`"
            :alt="`${t('empty.parameters')}`"
            class="mb-4 w-16 flex-shrink-0 text-center opacity-50"
          />
          <span class="text-center">
            {{ t("empty.parameters") }}
          </span>
        </div>

        <div v-else class="divide-y divide-dividerLight">
          <OAuth2KeyValue
            v-for="(param, index) in workingTokenRequestParams"
            :key="`token-request-param-${param.id}`"
            v-model:name="param.key"
            v-model:value="param.value"
            :send-in="param.sendIn"
            :total="workingTokenRequestParams.length"
            :index="index"
            :entity-id="param.id"
            :entity-active="param.active"
            :is-active="param.hasOwnProperty('active')"
            :envs="envs"
            :send-in-options="tokenRequestSendInOptions"
            @update-entity="
              updateTokenRequestParam($event.index, $event.payload)
            "
            @delete-entity="deleteTokenRequestParam($event)"
          />
        </div>
      </div>

      <!-- Refresh Request Parameters Section -->
      <div>
        <div class="flex items-center justify-between p-4">
          <label class="font-semibold text-secondaryLight">
            {{ t("authorization.oauth.refresh_request") }}
          </label>
          <div class="flex">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.clear_all')"
              :icon="IconTrash2"
              @click="clearRefreshRequestParams"
            />
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('add.new')"
              :icon="IconPlus"
              @click="addRefreshRequestParam"
            />
          </div>
        </div>

        <div
          v-if="workingRefreshRequestParams.length === 0"
          class="flex flex-col items-center justify-center p-4 text-secondaryLight"
        >
          <img
            :src="`/images/states/${colorMode.value}/add_category.svg`"
            :alt="`${t('empty.parameters')}`"
            class="mb-4 w-16 flex-shrink-0 text-center opacity-50"
          />
          <span class="text-center">
            {{ t("empty.parameters") }}
          </span>
        </div>

        <div v-else class="divide-y divide-dividerLight">
          <OAuth2KeyValue
            v-for="(param, index) in workingRefreshRequestParams"
            :key="`refresh-request-param-${param.id}`"
            v-model:name="param.key"
            v-model:value="param.value"
            :send-in="param.sendIn"
            :total="workingRefreshRequestParams.length"
            :index="index"
            :entity-id="param.id"
            :entity-active="param.active"
            :is-active="param.hasOwnProperty('active')"
            :envs="envs"
            :send-in-options="refreshRequestSendInOptions"
            @update-entity="
              updateRefreshRequestParam($event.index, $event.payload)
            "
            @delete-entity="deleteRefreshRequestParam($event)"
          />
        </div>
      </div>
    </div>
  </details>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "~/composables/theming"
import { AggregateEnvironment } from "~/newstore/environments"
import OAuth2KeyValue from "./OAuth2KeyValue.vue"
import IconPlus from "~icons/lucide/plus"
import IconTrash2 from "~icons/lucide/trash-2"

const t = useI18n()
const colorMode = useColorMode()

interface AdditionalParam {
  id: number
  key: string
  value: string
  active: boolean
  description?: string
  sendIn?: string
}

interface Props {
  envs: AggregateEnvironment[]
}

defineProps<Props>()

// Send In options for token and refresh request parameters
const tokenRequestSendInOptions = [
  { value: "body", label: "Request Body" },
  { value: "url", label: "Request URL" },
  { value: "headers", label: "Request Headers" },
]

const refreshRequestSendInOptions = [
  { value: "body", label: "Request Body" },
  { value: "url", label: "Request URL" },
  { value: "headers", label: "Request Headers" },
]

// Working arrays that include empty rows for UI
const workingAuthRequestParams = ref<AdditionalParam[]>([
  { id: 1, key: "", value: "", active: true, description: "" },
])

const workingTokenRequestParams = ref<AdditionalParam[]>([
  { id: 2, key: "", value: "", active: true, sendIn: "body" },
])

const workingRefreshRequestParams = ref<AdditionalParam[]>([
  { id: 3, key: "", value: "", active: true, sendIn: "body" },
])

// Watch for changes in working params and sync them
let authRequestIdCounter = 1000
let tokenRequestIdCounter = 2000
let refreshRequestIdCounter = 3000

// Auto-add empty rows for auth request params
watch(
  workingAuthRequestParams,
  (newParams) => {
    if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
      workingAuthRequestParams.value.push({
        id: authRequestIdCounter++,
        key: "",
        value: "",
        active: true,
        description: "",
      })
    }
  },
  { deep: true }
)

// Auto-add empty rows for token request params
watch(
  workingTokenRequestParams,
  (newParams) => {
    if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
      workingTokenRequestParams.value.push({
        id: tokenRequestIdCounter++,
        key: "",
        value: "",
        active: true,
        sendIn: "body",
      })
    }
  },
  { deep: true }
)

// Auto-add empty rows for refresh request params
watch(
  workingRefreshRequestParams,
  (newParams) => {
    if (newParams.length > 0 && newParams[newParams.length - 1].key !== "") {
      workingRefreshRequestParams.value.push({
        id: refreshRequestIdCounter++,
        key: "",
        value: "",
        active: true,
        sendIn: "body",
      })
    }
  },
  { deep: true }
)

// Functions for auth request params
const addAuthRequestParam = () => {
  workingAuthRequestParams.value.push({
    id: authRequestIdCounter++,
    key: "",
    value: "",
    active: true,
    description: "",
  })
}

const updateAuthRequestParam = (index: number, payload: AdditionalParam) => {
  workingAuthRequestParams.value[index] = payload
}

const deleteAuthRequestParam = (index: number) => {
  workingAuthRequestParams.value.splice(index, 1)
  if (workingAuthRequestParams.value.length === 0) {
    addAuthRequestParam()
  }
}

const clearAuthRequestParams = () => {
  workingAuthRequestParams.value = [
    {
      id: authRequestIdCounter++,
      key: "",
      value: "",
      active: true,
      description: "",
    },
  ]
}

// Functions for token request params
const addTokenRequestParam = () => {
  workingTokenRequestParams.value.push({
    id: tokenRequestIdCounter++,
    key: "",
    value: "",
    active: true,
    sendIn: "body",
  })
}

const updateTokenRequestParam = (index: number, payload: AdditionalParam) => {
  workingTokenRequestParams.value[index] = payload
}

const deleteTokenRequestParam = (index: number) => {
  workingTokenRequestParams.value.splice(index, 1)
  if (workingTokenRequestParams.value.length === 0) {
    addTokenRequestParam()
  }
}

const clearTokenRequestParams = () => {
  workingTokenRequestParams.value = [
    {
      id: tokenRequestIdCounter++,
      key: "",
      value: "",
      active: true,
      sendIn: "body",
    },
  ]
}

// Functions for refresh request params
const addRefreshRequestParam = () => {
  workingRefreshRequestParams.value.push({
    id: refreshRequestIdCounter++,
    key: "",
    value: "",
    active: true,
    sendIn: "body",
  })
}

const updateRefreshRequestParam = (index: number, payload: AdditionalParam) => {
  workingRefreshRequestParams.value[index] = payload
}

const deleteRefreshRequestParam = (index: number) => {
  workingRefreshRequestParams.value.splice(index, 1)
  if (workingRefreshRequestParams.value.length === 0) {
    addRefreshRequestParam()
  }
}

const clearRefreshRequestParams = () => {
  workingRefreshRequestParams.value = [
    {
      id: refreshRequestIdCounter++,
      key: "",
      value: "",
      active: true,
      sendIn: "body",
    },
  ]
}
</script>
