<script setup lang="ts">
import type {
  GRPCMethodDefinition,
  GRPCServiceDefinition,
} from "~/helpers/grpc"
import { useI18n } from "~/composables/i18n"
import { computed } from "vue"
import IconSend from "~icons/lucide/send"
import IconX from "~icons/lucide/x"

const props = defineProps<{
  url: string
  service: string
  method: string
  services: GRPCServiceDefinition[]
  methods: GRPCMethodDefinition[]
  loading: boolean
}>()

const emit = defineEmits<{
  (event: "update:url", value: string): void
  (event: "update:service", value: string): void
  (event: "update:method", value: string): void
  (event: "send"): void
  (event: "cancel"): void
}>()

const t = useI18n()

const canSend = computed(
  () => !props.loading && !!props.service && !!props.method
)

const send = () => {
  if (canSend.value) emit("send")
}
</script>

<template>
  <div class="flex min-h-[4rem] items-center gap-2 border-b border-divider p-2">
    <input
      :value="url"
      class="flex-1 bg-primaryLight px-4 py-2 text-secondaryDark"
      :placeholder="t('grpc.url_placeholder')"
      :aria-label="t('grpc.server_url')"
      @input="$emit('update:url', ($event.target as HTMLInputElement).value)"
      @keydown.enter="send"
    />
    <select
      :value="service"
      class="max-w-56 bg-primaryLight px-3 py-2"
      :aria-label="t('grpc.service')"
      @change="
        $emit('update:service', ($event.target as HTMLSelectElement).value)
      "
    >
      <option value="" disabled>{{ t("grpc.service") }}</option>
      <option v-for="item in services" :key="item.name" :value="item.name">
        {{ item.name }}
      </option>
    </select>
    <select
      :value="method"
      class="max-w-48 bg-primaryLight px-3 py-2"
      :aria-label="t('request.method')"
      @change="
        $emit('update:method', ($event.target as HTMLSelectElement).value)
      "
    >
      <option value="" disabled>{{ t("request.method") }}</option>
      <option
        v-for="item in methods"
        :key="item.methodName"
        :value="item.methodName"
        :disabled="item.requestStream || item.responseStream"
      >
        {{ item.methodName
        }}{{
          item.requestStream || item.responseStream
            ? ` (${t("grpc.streaming")})`
            : ""
        }}
      </option>
    </select>
    <HoppButtonPrimary
      v-if="!loading"
      :label="t('grpc.invoke')"
      :icon="IconSend"
      :disabled="!canSend"
      @click="send"
    />
    <HoppButtonSecondary
      v-else
      :label="t('action.cancel')"
      :icon="IconX"
      @click="$emit('cancel')"
    />
  </div>
</template>
