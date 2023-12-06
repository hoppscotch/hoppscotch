<template>
  <div class="flex flex-col">
    <h1 class="text-lg font-bold text-secondaryDark">
      {{ t('settings.settings') }}
    </h1>
  </div>

  <div
    v-if="fetchingInfraConfigs || fetchingAllowedAuthProviders"
    class="flex justify-center"
  >
    <HoppSmartSpinner />
  </div>

  <div v-else-if="errorInfraConfigs || errorAllowedAuthProviders">Error</div>

  <div class="flex flex-col">
    <div class="py-8">
      <HoppSmartTabs v-model="selectedOptionTab" render-inactive-tabs>
        <HoppSmartTab :id="'config'" label="Config">
          <SettingsConfig v-model:config="workingConfigs" class="py-8 px-4" />
        </HoppSmartTab>
      </HoppSmartTabs>
    </div>
  </div>

  <div v-if="diff" class="fixed bottom-0 right-0 m-10">
    <HoppButtonPrimary label="Save Changes" @click="changes = !changes" />
  </div>

  <SettingsRestartServer
    :show="changes"
    :config="workingConfigs"
    @hide-modal="changes = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import { getConfig } from '~/composables/getConfig';
import { isEqual } from 'lodash-es';

const t = useI18n();

const changes = ref(false);
type OptionTabs = 'config';
const selectedOptionTab = ref<OptionTabs>('config');

const {
  currentConfigs,
  workingConfigs,
  fetchingInfraConfigs,
  errorInfraConfigs,
  fetchingAllowedAuthProviders,
  errorAllowedAuthProviders,
} = getConfig();

const diff = computed(() => {
  if (currentConfigs.value && workingConfigs.value) {
    return !isEqual(currentConfigs.value, workingConfigs.value);
  } else {
    return true;
  }
});
</script>
