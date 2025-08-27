<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.username") }}
    </label>
    <SmartEnvInput
      v-model="auth.username"
      placeholder="john_doe"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.password") }}
    </label>
    <SmartEnvInput
      v-model="auth.password"
      placeholder="Enter password"
      :auto-complete-env="true"
      :envs="envs"
    />
  </div>

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

    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.digest.realm") }}
      </label>
      <SmartEnvInput
        v-model="auth.realm"
        :auto-complete-env="true"
        placeholder="testrealm@example.com"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.digest.nonce") }}
      </label>
      <SmartEnvInput
        v-model="auth.nonce"
        :auto-complete-env="true"
        placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OTA="
        :envs="envs"
      />
    </div>

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
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.digest.qop") }}
      </label>
      <SmartEnvInput
        v-model="auth.qop"
        :auto-complete-env="true"
        placeholder="auth-int"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.digest.nonce_count") }}
      </label>
      <SmartEnvInput
        v-model="auth.nc"
        :auto-complete-env="true"
        placeholder="00000001"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.digest.client_nonce") }}
      </label>
      <SmartEnvInput
        v-model="auth.cnonce"
        :auto-complete-env="true"
        placeholder="Oa4f113b"
        :envs="envs"
      />
    </div>

    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.digest.opaque") }}
      </label>
      <SmartEnvInput
        v-model="auth.opaque"
        :auto-complete-env="true"
        placeholder="5ccc069c403ebaf9f0171e9517f40e41"
        :envs="envs"
      />
    </div>

    <!-- TODO: Enable once request failure due to disabling retries is handled gracefully -->
    <!-- <div class="px-4 pt-3 pb-6">
      <HoppSmartCheckbox
        :on="auth.disableRetry"
        @change="auth.disableRetry = !auth.disableRetry"
      >
        {{ t("authorization.digest.disable_retry") }}
      </HoppSmartCheckbox>
    </div> -->
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
