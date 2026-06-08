<template>
  <AuthRadioSelect
    :label="t('authorization.aws_signature.credential_mode')"
    :model-value="auth.credentialMode"
    :options="credentialModes"
    @update:model-value="
      auth.credentialMode = $event as typeof auth.credentialMode
    "
  />

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
            :on-shown="onProfileDropdownShown"
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

    <AuthRadioSelect
      :label="t('authorization.pass_key_by')"
      :model-value="auth.addTo"
      :options="addToTargets"
      @update:model-value="auth.addTo = $event as typeof auth.addTo"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppRESTAuthAWSSignature } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { useVModel } from "@vueuse/core"
import { computed, ref, watch } from "vue"
import { AggregateEnvironment } from "~/newstore/environments"
import { KernelInterceptorAgentStore } from "~/platform/std/kernel-interceptors/agent/store"
import IconChevronDown from "~icons/lucide/chevron-down"
import AuthRadioSelect from "./AuthRadioSelect.vue"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: HoppRESTAuthAWSSignature
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthAWSSignature): void
}>()

const auth = useVModel(props, "modelValue", emit)

const agentService = useService(KernelInterceptorAgentStore)

const profileTippyActions = ref<any | null>(null)

const profiles = ref<string[]>([])
const isLoadingProfiles = ref(false)
const agentConnected = computed(
  () => agentService.isAgentRunning.value && agentService.isEncryptionReady()
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

async function loadProfiles() {
  if (!agentConnected.value) return
  isLoadingProfiles.value = true
  try {
    profiles.value = await agentService.listAwsProfiles()
  } catch (e) {
    profiles.value = []
    toast.error(
      e instanceof Error ? e.message : t("error.something_went_wrong")
    )
  } finally {
    isLoadingProfiles.value = false
  }
}

// Refresh the list each time the dropdown is opened so profiles added to
// ~/.aws after the initial load are picked up.
function onProfileDropdownShown() {
  profileTippyActions.value?.focus()
  loadProfiles()
}

watch(
  [() => auth.value.credentialMode, agentConnected],
  ([mode, isConnected]) => {
    if (mode === "profile" && isConnected) {
      loadProfiles()
    }
  },
  { immediate: true }
)
</script>
