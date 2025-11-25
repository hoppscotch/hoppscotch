<template>
  <div class="flex items-center border-b border-dividerLight">
    <span class="flex items-center">
      <label class="ml-4 text-secondaryLight min-w-[6rem]">
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
            class="rounded-none pr-8"
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

  <!-- Private Key field for RSA/ECDSA algorithms -->

  <div
    v-if="isAsymmetricAlgorithm"
    class="ml-4 py-2 border-b border-dividerLight"
  >
    <label class="text-secondaryLight">
      {{ t("authorization.jwt.private_key") }}
    </label>
    <div ref="privateKeyEditor" class="mt-2 h-32"></div>
  </div>

  <!-- Secret field for HMAC algorithms -->
  <div v-else>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.secret") }}
      </label>
      <SmartEnvInput
        v-model="auth.secret"
        :auto-complete-env="true"
        placeholder="your_secret_key_here"
        :envs="envs"
        class="px-4"
      />
    </div>

    <div class="px-4 py-2 flex items-center">
      <HoppSmartCheckbox
        :on="auth.isSecretBase64Encoded"
        @change="auth.isSecretBase64Encoded = !auth.isSecretBase64Encoded"
      >
        {{ t("authorization.jwt.secret_base64_encoded") }}
      </HoppSmartCheckbox>
    </div>
  </div>

  <div class="ml-4 py-2 border-b border-dividerLight">
    <label class="text-secondaryLight">
      {{ t("authorization.payload") }}
    </label>
    <div ref="payloadEditor" class="mt-2 h-32"></div>
  </div>

  <div class="flex flex-col">
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
        <label class="ml-4 text-secondaryLight min-w-[6rem]">
          {{ t("authorization.pass_key_by") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => authTippyActions?.focus()"
        >
          <HoppSmartSelectWrapper>
            <HoppButtonSecondary :label="passBy" class="rounded-none pr-8" />
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
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{
          auth.addTo === "HEADERS"
            ? t("authorization.jwt.header_prefix")
            : t("authorization.jwt.param_name")
        }}
      </label>
      <SmartEnvInput
        v-if="auth.addTo === 'HEADERS'"
        v-model="auth.headerPrefix"
        :auto-complete-env="true"
        placeholder="Bearer"
        :envs="envs"
        class="px-4"
      />

      <SmartEnvInput
        v-else
        v-model="auth.paramName"
        :auto-complete-env="true"
        placeholder="access_token"
        :envs="envs"
        class="px-4"
      />
    </div>
  </div>

  <div class="ml-4 py-2 border-b border-dividerLight">
    <label class="text-secondaryLight">
      {{ t("authorization.jwt.headers") }}
    </label>
    <div ref="headersEditor" class="mt-2 h-32"></div>
  </div>
</template>

<script setup lang="ts">
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthJWT } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { computed, reactive, ref } from "vue"
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

// Template refs for CodeMirror editors
const payloadEditor = ref<any | null>(null)
const headersEditor = ref<any | null>(null)
const privateKeyEditor = ref<any | null>(null)

const payload = computed({
  get: () => auth.value.payload,
  set: (value) => {
    auth.value = {
      ...auth.value,
      payload: value,
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

const privateKey = computed({
  get: () => auth.value.privateKey,
  set: (value) => {
    auth.value = {
      ...auth.value,
      privateKey: value,
    }
  },
})

// Initialize CodeMirror for payload editor
useCodemirror(
  payloadEditor,
  payload,
  reactive({
    extendedEditorConfig: {
      mode: "application/json",
      readOnly: false,
      lineWrapping: true,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

// Initialize CodeMirror for headers editor
useCodemirror(
  headersEditor,
  jwtHeaders,
  reactive({
    extendedEditorConfig: {
      mode: "application/json",
      readOnly: false,
      lineWrapping: true,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

useCodemirror(
  privateKeyEditor,
  privateKey,
  reactive({
    extendedEditorConfig: {
      mode: "text/plain",
      readOnly: false,
      lineWrapping: true,
      placeholder: `-----BEGIN PRIVATE KEY-----
Your private key here
-----END PRIVATE KEY-----`,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

const algorithms: HoppRESTAuthJWT["algorithm"][] = ["HS256", "HS384", "HS512"]

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

const isAsymmetricAlgorithm = computed(() => {
  return (
    auth.value.algorithm.startsWith("RS") ||
    auth.value.algorithm.startsWith("ES") ||
    auth.value.algorithm.startsWith("PS")
  )
})
</script>
