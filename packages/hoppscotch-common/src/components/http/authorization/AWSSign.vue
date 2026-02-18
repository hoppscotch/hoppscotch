<template>
  <div class="flex items-center border-b border-dividerLight">
    <span class="flex items-center">
      <label class="ml-4 text-secondaryLight">
        {{ t("authorization.aws_signature.credential_mode") }}
      </label>
      <tippy
        interactive
        trigger="click"
        theme="popover"
        :on-shown="() => credentialModeTippyActions?.focus()"
      >
        <HoppSmartSelectWrapper>
          <HoppButtonSecondary
            :label="credentialModeLabel"
            class="ml-2 rounded-none pr-8"
          />
        </HoppSmartSelectWrapper>
        <template #content="{ hide }">
          <div
            ref="credentialModeTippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            @keyup.escape="hide()"
          >
            <HoppSmartItem
              v-for="mode in credentialModes"
              :key="mode.id"
              :label="mode.label"
              :icon="
                auth.credentialMode === mode.id ? IconCircleDot : IconCircle
              "
              :active="auth.credentialMode === mode.id"
              @click="
                () => {
                  auth.credentialMode = mode.id
                  hide()
                }
              "
            />
          </div>
        </template>
      </tippy>
    </span>
  </div>

  <template v-if="auth.credentialMode === 'profile'">
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.aws_signature.profile") }}
      </label>
      <div class="flex flex-1 items-center">
        <span v-if="isLoadingProfiles" class="ml-4 text-secondaryLight">
          {{ t("state.loading") }}
        </span>
        <span v-else-if="!agentConnected" class="ml-4 text-secondaryLight">
          {{ t("authorization.aws_signature.agent_required") }}
        </span>
        <template v-else>
          <SmartEnvInput
            v-model="auth.profileName"
            :auto-complete-env="true"
            :placeholder="profiles.length > 0 ? profiles[0] : 'default'"
            :envs="envs"
          />
          <tippy
            v-if="profiles.length > 0"
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => profileTippyActions?.focus()"
          >
            <HoppButtonSecondary :icon="IconChevronDown" class="rounded-none" />
            <template #content="{ hide }">
              <div
                ref="profileTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  v-for="profile in profiles"
                  :key="profile"
                  :label="profile"
                  :active="auth.profileName === profile"
                  @click="
                    () => {
                      auth.profileName = profile
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </template>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.aws_signature.access_key") }}
      </label>
      <SmartEnvInput
        v-model="auth.accessKey"
        :auto-complete-env="true"
        placeholder="AKIAIOSFODNN7EXAMPLE"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.aws_signature.secret_key") }}
      </label>
      <SmartEnvInput
        v-model="auth.secretKey"
        :auto-complete-env="true"
        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        :envs="envs"
      />
    </div>
  </template>

  <!-- advanced config -->

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
    <div class="flex flex-1">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.aws_signature.aws_region") }}
      </label>
      <SmartEnvInput
        v-model="auth.region"
        :auto-complete-env="true"
        :placeholder="`${t('app.default', { value: 'us-east-1' })}`"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.aws_signature.service_name") }}
      </label>
      <SmartEnvInput
        v-model="auth.serviceName"
        :auto-complete-env="true"
        placeholder="s3"
        :envs="envs"
      />
    </div>
    <template v-if="auth.credentialMode !== 'profile'">
      <div class="flex flex-1">
        <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
          {{ t("authorization.aws_signature.service_token") }}
        </label>
        <SmartEnvInput
          v-model="auth.serviceToken"
          :auto-complete-env="true"
          placeholder="session-token-here"
          :envs="envs"
        />
      </div>
    </template>

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
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthAWSSignature } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { useVModel } from "@vueuse/core"
import { computed, onMounted, ref, watch } from "vue"
import { AggregateEnvironment } from "~/newstore/environments"
import { AgentInterceptorService } from "~/platform/std/interceptors/agent"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthAWSSignature
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthAWSSignature): void
}>()

const auth = useVModel(props, "modelValue", emit)

const agentService = useService(AgentInterceptorService)

const authTippyActions = ref<any | null>(null)
const credentialModeTippyActions = ref<any | null>(null)
const profileTippyActions = ref<any | null>(null)

const profiles = ref<string[]>([])
const isLoadingProfiles = ref(false)
const agentConnected = computed(
  () => agentService.isAgentRunning.value && agentService.authKey.value !== null
)

const credentialModes = [
  {
    id: "manual" as const,
    label: t("authorization.aws_signature.manual"),
  },
  {
    id: "profile" as const,
    label: t("authorization.aws_signature.profile"),
  },
]

const credentialModeLabel = computed(() => {
  return (
    credentialModes.find((mode) => mode.id === auth.value.credentialMode)
      ?.label || t("authorization.aws_signature.manual")
  )
})

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

async function loadProfiles() {
  if (!agentConnected.value) return
  isLoadingProfiles.value = true
  try {
    profiles.value = await agentService.listAwsProfiles()
  } catch (_e) {
    profiles.value = []
  } finally {
    isLoadingProfiles.value = false
  }
}

watch(
  () => auth.value.credentialMode,
  (mode) => {
    if (mode === "profile") {
      loadProfiles()
    }
  }
)

onMounted(() => {
  if (auth.value.credentialMode === "profile") {
    loadProfiles()
  }
})
</script>
