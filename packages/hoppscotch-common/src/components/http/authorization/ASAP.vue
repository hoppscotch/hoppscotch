<template>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.asap.issuer") }}
    </label>
    <SmartEnvInput
      v-model="auth.issuer"
      :auto-complete-env="true"
      placeholder="myapp.example.com"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("config.saml.audience") }}
    </label>
    <SmartEnvInput
      v-model="auth.audience"
      :auto-complete-env="true"
      placeholder="api.example.com"
      :envs="envs"
    />
  </div>
  <div class="flex flex-1 border-b border-dividerLight">
    <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
      {{ t("authorization.asap.key_id") }}
    </label>
    <SmartEnvInput
      v-model="auth.keyId"
      :auto-complete-env="true"
      placeholder="myapp/rsa-key-1"
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

  <div class="flex flex-1 border-b border-dividerLight items-center">
    <label class="ml-4 text-secondaryLight">
      {{ t("authorization.jwt.private_key") }}
    </label>
    <label :for="`attachment`" class="p-0">
      <input
        :id="`attachment`"
        :name="`attachment`"
        type="file"
        multiple
        class="cursor-pointer p-1 text-tiny text-secondaryLight transition file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-primaryLight file:px-4 file:py-1 file:text-tiny file:text-secondary file:transition hover:text-secondaryDark hover:file:bg-primaryDark hover:file:text-secondaryDark"
        @change="setPrivateKey($event)"
      />
    </label>
  </div>
  <pre>
    {{ auth.privateKey }}
  </pre>

  <!-- advanced config -->

  <div>
    <!-- label as advanced config here -->
    <div class="p-4">
      <label class="text-secondaryLight">
        {{ t("authorization.asap.optional_config") }}
      </label>
    </div>
    <div class="flex flex-1 border-b border-dividerLight h-[300px]">
      <label class="ml-4 text-secondaryLight">
        {{ t("authorization.asap.additional_claims") }}
      </label>
      <div class="h-full relative">
        <div ref="claimsRef" class="absolute inset-0"></div>
      </div>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.asap.subject") }}
      </label>
      <SmartEnvInput
        v-model="auth.subject"
        :auto-complete-env="true"
        placeholder="Subject"
        :envs="envs"
      />
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <label class="flex items-center ml-4 text-secondaryLight min-w-[6rem]">
        {{ t("authorization.asap.expires_in") }}
      </label>
      <SmartEnvInput
        v-model="auth.expiresIn"
        :auto-complete-env="true"
        placeholder="3600 (seconds)"
        :envs="envs"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import { useI18n } from "@composables/i18n"
import { HoppRESTAuthASAP } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { ref } from "vue"
import { AggregateEnvironment } from "~/newstore/environments"
import { useCodemirror } from "~/composables/codemirror"
import { reactive } from "vue"
import { Ref } from "vue"
import { getEditorLangForMimeType } from "~/helpers/editorutils"
import JSONLinter from "~/helpers/editor/linting/json"

const t = useI18n()

const props = defineProps<{
  modelValue: HoppRESTAuthASAP
  envs?: AggregateEnvironment[]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTAuthASAP): void
}>()

const auth = useVModel(props, "modelValue", emit)

const claimsRef = ref<any | null>(null)
const codemirrorValue: Ref<string | undefined> =
  typeof auth.value.additionalClaims === "string"
    ? ref(auth.value.additionalClaims)
    : ref(undefined)

useCodemirror(
  claimsRef,
  codemirrorValue,
  reactive({
    extendedEditorConfig: {
      mode: getEditorLangForMimeType("application/json"),
      placeholder: t("request.raw_body").toString(),
    },
    linter: JSONLinter,
    completer: null,
    environmentHighlights: true,
  })
)

const algorithms: HoppRESTAuthASAP["algorithm"][] = [
  "RS256",
  "RS384",
  "RS512",
  "PS256",
  "PS384",
  "PS512",
  "ES256",
  "ES384",
  "ES512",
]

const setPrivateKey = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result
    if (typeof result !== "string") return

    auth.value.privateKey = result
  }
  reader.readAsText(file)
}

const authTippyActions = ref<any | null>(null)
</script>
