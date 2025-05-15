<template>
  <div class="space-y-4 px-4 py-2">
    <div>
      <h4 class="font-semibold tracking-wide text-secondaryDark">
        {{ t("authorization.jwt.secret") }}
      </h4>
      <div class="flex gap-2">
        <SmartEnvInput
          v-model="secret"
          :placeholder="t('authorization.jwt.secret_placeholder')"
          :auto-complete-env="true"
          :envs="envs"
          class="mt-2 flex flex-1"
        />
        <div class="mt-2">
          <HoppSmartCheckbox
            v-model="isSecretBase64Encoded"
            :label="t('authorization.jwt.is_secret_base64')"
          />
        </div>
      </div>
    </div>
    <div>
      <h4 class="font-semibold tracking-wide text-secondaryDark">
        {{ t("authorization.jwt.algorithm") }}
      </h4>
      <div class="mt-2">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          class="pr-8"
          :label="auth.algorithm"
          @click="showAlgorithmOptions = !showAlgorithmOptions"
        />
        <HoppSmartModal
          v-if="showAlgorithmOptions"
          dialog
          :title="t('authorization.jwt.algorithm')"
          @close="showAlgorithmOptions = false"
        >
          <template #body>
            <div class="flex flex-col">
              <HoppSmartItem
                v-for="algo in algorithms"
                :key="algo"
                :label="algo"
                :active="auth.algorithm === algo"
                @click="
                  () => {
                    auth.algorithm = algo
                    showAlgorithmOptions = false
                  }
                "
              />
            </div>
          </template>
        </HoppSmartModal>
      </div>
    </div>
    <div>
      <h4 class="font-semibold tracking-wide text-secondaryDark">
        {{ t("authorization.jwt.payload") }}
      </h4>
      <div class="mt-2">
        <HoppSmartTextarea
          v-model="payload"
          :placeholder="t('authorization.jwt.payload_placeholder')"
          :line-numbers="true"
          :language="'json'"
        />
      </div>
    </div>

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
          <HoppButtonSecondary :label="passBy" class="ml-2 rounded-none pr-8" />
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
              :icon="auth.addTo === addToTarget.id ? IconCircleDot : IconCircle"
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

    <HoppAccordion :open="false">
      <template #summary>
        <span class="flex items-center gap-2 text-secondaryDark">
          {{ t("authorization.jwt.advanced") }}
        </span>
      </template>
      <template #body>
        <div class="space-y-4">
          <div v-if="auth.addTo === 'HEADERS'">
            <h4 class="font-semibold tracking-wide text-secondaryDark">
              {{ t("authorization.jwt.header_prefix") }}
            </h4>
            <div class="mt-2">
              <SmartEnvInput
                v-model="headerPrefix"
                :auto-complete-env="true"
                :placeholder="t('authorization.jwt.header_prefix_placeholder')"
                :envs="envs"
              />
            </div>
          </div>
          <div v-else>
            <h4 class="font-semibold tracking-wide text-secondaryDark">
              {{ t("authorization.jwt.param_name") }}
            </h4>
            <div class="mt-2">
              <SmartEnvInput
                v-model="paramName"
                :auto-complete-env="true"
                :placeholder="t('authorization.jwt.param_name_placeholder')"
                :envs="envs"
              />
            </div>
          </div>
          <div>
            <h4 class="font-semibold tracking-wide text-secondaryDark">
              {{ t("authorization.jwt.jwt_headers") }}
            </h4>
            <div class="mt-2">
              <HoppSmartTextarea
                v-model="jwtHeaders"
                :placeholder="t('authorization.jwt.jwt_headers_placeholder')"
                :line-numbers="true"
                :language="'json'"
              />
            </div>
          </div>
        </div>
      </template>
    </HoppAccordion>
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
