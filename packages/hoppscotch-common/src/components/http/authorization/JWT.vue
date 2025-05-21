<template>
  <div class="flex items-center border-b border-dividerLight">
    <span class="flex items-center">
      <label class="ml-4 text-secondaryLight">
        {{ t("authorization.digest.algorithm") }}
      </label>
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => authTippyActions.focus()"
      >
        <HoppSmartSelectWrapper>
          <HoppButtonSecondary
            :label="auth.algorithm"
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
              v-for="alg in algorithms"
              :key="alg"
              :icon="auth.algorithm === alg ? IconCircleDot : IconCircle"
              :active="auth.algorithm === alg"
              :label="alg"
              @click="
                () => {
                  auth.algorithm = alg
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </span>
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.secret"
      :auto-complete-env="true"
      :placeholder="t('authorization.secret')"
      :envs="envs"
    />
  </div>
  <div class="px-4 py-2 flex items-center">
    <span class="text-secondaryLight font-semibold mr-6">
      {{ t("authorization.jwt.secret_base64_encoded") }}
    </span>
    <HoppSmartCheckbox
      class="text-secondaryLight flex"
      :on="auth.isSecretBase64Encoded"
      @change="auth.isSecretBase64Encoded = !auth.isSecretBase64Encoded"
    ></HoppSmartCheckbox>
  </div>

  <div class="ml-4 py-2 border-b border-dividerLight">
    <label class="text-secondaryLight">
      {{ t("authorization.payload") }}
    </label>
    <div class="mt-2">
      <textarea
        v-model="payload"
        :placeholder="t('authorization.payload_placeholder')"
        :line-numbers="true"
        :language="'json'"
      >
      </textarea>
    </div>
  </div>

  <div class="flex flex-col divide-y divide-dividerLight">
    <!-- label as advanced config here -->
    <div class="p-4 flex flex-col space-y-1">
      <label>
        {{ t("authorization.advance_config") }}
      </label>
      <p class="text-secondaryLight">
        {{ t("authorization.advance_config_description") }}
      </p>
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

    <!-- passby conditional prefix or name -->
    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-if="auth.addTo === 'HEADERS'"
        v-model="auth.headerPrefix"
        :auto-complete-env="true"
        :placeholder="t('authorization.jwt.placeholder_request_header')"
        :envs="envs"
      />

      <SmartEnvInput
        v-else
        v-model="auth.paramName"
        :auto-complete-env="true"
        :placeholder="t('authorization.jwt.placeholder_request_param')"
        :envs="envs"
      />
    </div>
  </div>

  <div class="ml-4 py-2 border-b border-dividerLight">
    <label class="text-secondaryLight">
      {{ t("authorization.jwt.headers") }}
    </label>
    <div class="mt-2">
      <textarea
        v-model="jwtHeaders"
        :placeholder="t('authorization.jwt.placeholder_headers')"
        :line-numbers="true"
        :language="'json'"
      >
      </textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { ref, computed } from "vue"
import { useVModel } from "@vueuse/core"
import { HoppRESTAuthJWT } from "@hoppscotch/data"
import { AggregateEnvironment } from "~/newstore/environments"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"

const t = useI18n()
const authTippyActions = ref<any | null>(null)

const props = withDefaults(
  defineProps<{
    modelValue: HoppRESTAuthJWT
    envs?: AggregateEnvironment[]
  }>(),
  {
    envs: undefined,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthJWT): void
}>()

const auth = useVModel(props, "modelValue", emit)

// Setup refs for every field to help with reactivity
const secret = computed({
  get: () => auth.value.secret,
  set: (value) => {
    auth.value = {
      ...auth.value,
      secret: value,
    }
  },
})

const payload = computed({
  get: () => auth.value.payload,
  set: (value) => {
    auth.value = {
      ...auth.value,
      payload: value,
    }
  },
})

const addTo = computed({
  get: () => auth.value.addTo,
  set: (value) => {
    auth.value = {
      ...auth.value,
      addTo: value,
    }
  },
})

const isSecretBase64Encoded = computed({
  get: () => auth.value.isSecretBase64Encoded,
  set: (value) => {
    auth.value = {
      ...auth.value,
      isSecretBase64Encoded: value,
    }
  },
})

const headerPrefix = computed({
  get: () => auth.value.headerPrefix,
  set: (value) => {
    auth.value = {
      ...auth.value,
      headerPrefix: value,
    }
  },
})

const paramName = computed({
  get: () => auth.value.paramName,
  set: (value) => {
    auth.value = {
      ...auth.value,
      paramName: value,
    }
  },
})

const jwtHeaders = computed({
  get: () => auth.value.jwtHeaders,
  set: (value) => {
    auth.value = {
      ...auth.value,
      jwtHeaders: value,
    }
  },
})

const algorithms: HoppRESTAuthJWT["algorithm"][] = [
  "HS256",
  "HS384",
  "HS512",
  "RS256",
  "RS384",
  "RS512",
  "ES256",
  "ES384",
  "ES512",
]

const showAlgorithmOptions = ref(false)

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
</script>
