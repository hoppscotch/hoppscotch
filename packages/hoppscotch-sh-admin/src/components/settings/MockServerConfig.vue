<template>
  <div class="grid md:grid-cols-3 gap-8 md:gap-4 pt-8">
    <div class="md:col-span-1">
      <h3 class="heading">{{ t('configs.mock_server.title') }}</h3>
      <p class="my-1 text-secondaryLight">
        {{ t('configs.mock_server.description') }}
      </p>
    </div>

    <div class="sm:px-8 md:col-span-2">
      <h4 class="font-semibold text-secondaryDark">
        {{ t('configs.mock_server.title') }}
      </h4>

      <div class="space-y-4 py-4">
        <div>
          <label class="block text-sm font-medium text-secondaryDark mb-2">
            {{ t('configs.mock_server.wildcard_domain') }}
          </label>
          <HoppSmartInput
            v-model="mockFields.mock_server_wildcard_domain"
            type="text"
            :placeholder="'e.g. *.mock.example.com'"
            class="!bg-primaryLight border border-divider rounded"
            input-styles="!border-0"
          />
          <p class="text-secondaryLight mt-4">
            {{ t('configs.mock_server.wildcard_domain_description') }}
          </p>
          <p class="text-secondaryLight mt-1 font-mono font-bold">
            {{ t('configs.mock_server.wildcard_domain_example') }}
          </p>
        </div>

        <div
          class="flex items-start p-3 bg-primaryLight border border-divider shadow-sm rounded text-sm gap-3"
        >
          <icon-lucide-info
            class="svg-icons text-secondaryLight flex-shrink-0 mt-0.5"
          />
          <div>
            <p class="text-secondaryDark text-xs">
              {{ t('configs.mock_server.subpath_content_type_notice_prefix') }}
              <code class="font-mono font-semibold text-xs text-yellow-500">
                {{ t('configs.mock_server.subpath_content_type_text_plain') }}
              </code>
              {{ t('configs.mock_server.subpath_content_type_notice_suffix') }}
            </p>
            <p
              class="font-mono text-xs text-secondaryLight leading-relaxed mt-1"
            >
              {{ sanitizedContentTypes.join(', ') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { computed } from 'vue';
import { useI18n } from '~/composables/i18n';
import { ServerConfigs } from '~/helpers/configs';

const t = useI18n();

const props = defineProps<{
  config: ServerConfigs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: ServerConfigs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);

const mockFields = computed({
  get() {
    return (
      workingConfigs.value.mockServerConfigs?.fields ?? {
        mock_server_wildcard_domain: '',
      }
    );
  },
  set(v) {
    if (!workingConfigs.value.mockServerConfigs) {
      workingConfigs.value.mockServerConfigs = {
        name: 'mock_server',
        fields: v,
      };
    } else workingConfigs.value.mockServerConfigs.fields = v as any;
  },
});

// Content types that are served as text/plain when using subpath-based mock URLs (instead of wildcard subdomains) to prevent XSS.
// This list should be kept in sync with the backend sanitization logic in
// packages/hoppscotch-backend/src/mock-server/mock-server.controller.ts
const sanitizedContentTypes = [
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',
  '*+xml (other +xml subtypes)',
  'image/svg+xml',
  'text/html',
  'text/javascript',
  'text/xml',
  'text/xsl',
];
</script>
