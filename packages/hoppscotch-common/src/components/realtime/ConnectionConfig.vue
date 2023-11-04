<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-upperPrimaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary py-2 pl-4 pr-2"
    >
      <span class="flex items-center">
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("mqtt.connection_config") }}
        </label>
      </span>
      <div class="flex">
        <HoppSmartCheckbox
          :on="config.cleanSession"
          class="px-2"
          @change="config.cleanSession = !config.cleanSession"
          >{{ t("mqtt.clean_session") }}
        </HoppSmartCheckbox>
      </div>
    </div>
    <div class="flex h-full flex-1 border-dividerLight">
      <div class="w-1/3 border-r border-dividerLight">
        <div class="flex flex-1 border-b border-dividerLight">
          <SmartEnvInput
            v-model="config.username"
            :placeholder="t('authorization.username')"
          />
        </div>
        <div class="flex flex-1 border-b border-dividerLight">
          <SmartEnvInput
            v-model="config.password"
            :placeholder="t('authorization.password')"
          />
        </div>
        <div class="flex items-center border-b border-dividerLight">
          <label class="ml-4 text-secondaryLight">
            {{ t("mqtt.keep_alive") }}
          </label>
          <SmartEnvInput
            v-model="config.keepAlive"
            :placeholder="t('mqtt.keep_alive')"
          />
        </div>
      </div>
      <div class="w-2/3">
        <div class="flex flex-1 border-b border-dividerLight">
          <SmartEnvInput
            v-model="config.lwTopic"
            :placeholder="t('mqtt.lw_topic')"
          />
        </div>
        <div class="flex flex-1 border-b border-dividerLight">
          <SmartEnvInput
            v-model="config.lwMessage"
            :placeholder="t('mqtt.lw_message')"
          />
        </div>
        <div
          class="flex items-center justify-between border-b border-dividerLight px-4"
        >
          <div class="flex items-center">
            <label class="truncate font-semibold text-secondaryLight">
              {{ t("mqtt.lw_qos") }}
            </label>
            <tippy interactive trigger="click" theme="popover">
              <HoppSmartSelectWrapper>
                <HoppButtonSecondary
                  class="ml-2 rounded-none pr-8"
                  :label="`${config.lwQos}`"
                />
              </HoppSmartSelectWrapper>
              <template #content="{ hide }">
                <div class="flex flex-col" role="menu">
                  <HoppSmartItem
                    v-for="item in QOS_VALUES"
                    :key="`qos-${item}`"
                    :label="`${item}`"
                    :icon="config.lwQos === item ? IconCheckCircle : IconCircle"
                    :active="config.lwQos === item"
                    @click="
                      () => {
                        config.lwQos = item
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </div>
          <HoppSmartCheckbox
            :on="config.lwRetain"
            class="py-2"
            @change="config.lwRetain = !config.lwRetain"
            >{{ t("mqtt.lw_retain") }}
          </HoppSmartCheckbox>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconCheckCircle from "~icons/lucide/check-circle"
import IconCircle from "~icons/lucide/circle"
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import {
  MQTTConnectionConfig,
  QOS_VALUES,
} from "~/helpers/realtime/MQTTConnection"

const t = useI18n()

const emit = defineEmits<{
  (e: "change", body: MQTTConnectionConfig): void
}>()
const config = ref<MQTTConnectionConfig>({
  username: "",
  password: "",
  keepAlive: "60",
  cleanSession: true,
  lwTopic: "",
  lwMessage: "",
  lwQos: 0,
  lwRetain: false,
})

watch(
  config,
  (newVal) => {
    emit("change", newVal)
  },
  { immediate: true }
)
</script>
