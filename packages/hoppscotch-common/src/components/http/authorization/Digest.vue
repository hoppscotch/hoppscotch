<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.username"
      :placeholder="t('authorization.username')"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <SmartEnvInput
      v-model="auth.password"
      :placeholder="t('authorization.password')"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>

  <!-- advanced config -->

  <div>
    <!-- label as advanced config here -->
    <div class="p-4">
      <label class="text-secondaryLight"> Advanced Configuration </label>
      <p>
        Hoppscotch automatically assigns default values to certain fields if no
        explicit value is provided.
      </p>
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.realm"
        :auto-complete-env="true"
        placeholder="Realm (e.g. testrealm@example.com)"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.nonce"
        :auto-complete-env="true"
        placeholder="Nonce"
        :envs="envs"
      />
    </div>

    <div class="flex items-center border-b border-dividerLight">
      <span class="flex items-center">
        <label class="ml-4 text-secondaryLight"> Algorithm </label>
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
        v-model="auth.qop"
        :auto-complete-env="true"
        placeholder="qop (e.g. auth-int)"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.nc"
        :auto-complete-env="true"
        placeholder="Nonce Count (e.g. 00000001)"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.cnonce"
        :auto-complete-env="true"
        placeholder="Client Nonce (e.g. Oa4f113b)"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <SmartEnvInput
        v-model="auth.opaque"
        :auto-complete-env="true"
        placeholder="Opaque"
        :envs="envs"
      />
    </div>

    <div class="px-4 mt-4 pb-6">
      <HoppSmartCheckbox
        :on="auth.disableRetry"
        @change="auth.disableRetry = !auth.disableRetry"
      >
        Disable Retrying Requset
      </HoppSmartCheckbox>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthDigest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { AggregateEnvironment } from "~/newstore/environments"
import { ref } from "vue"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthDigest
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthDigest): void
}>()

const algorithms: HoppRESTAuthDigest["algorithm"][] = ["MD5", "MD5-sess"]

const auth = useVModel(props, "modelValue", emit)

const authTippyActions = ref<any | null>(null)
</script>
