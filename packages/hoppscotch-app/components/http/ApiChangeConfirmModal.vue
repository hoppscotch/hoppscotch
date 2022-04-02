<template>
  <SmartModal
    v-if="show"
    dialog
    :title="$t('modal.confirm')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <label>
          {{ t("confirm.confirm_api_change") }}
        </label>
      </div>
      <!-- <div class="flex flex-1">
        <button class="share-link" @click="copyUserAuthToken">
          <SmartIcon class="w-4 h-4 text-xl" :name="copyIcon" />
          <span>
            {{ t("app.copy_user_id") }}
          </span>
        </button>
      </div> -->
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          v-focus
          :label="t('action.save')"
          @click.native="saveApiChange"
        />
        <ButtonSecondary
          :label="t('action.dont_save')"
          @click.native="discardApiChange"
        />
        <ButtonSecondary
          :label="t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
// import { ref } from "@nuxtjs/composition-api"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

defineProps<{
  show: Boolean
}>()

const emit = defineEmits<{
  (e: "save-change"): void
  (e: "discard-change"): void
  (e: "hide-modal"): void
}>()

const saveApiChange = () => {
  emit("save-change")
}

const discardApiChange = () => {
  emit("discard-change")
}

const hideModal = () => {
  emit("hide-modal")
}
</script>

<style lang="scss" scoped>
.share-link {
  @apply border border-dividerLight;
  @apply rounded;
  @apply flex;
  @apply p-3;
  @apply items-center;
  @apply justify-center;
  @apply font-semibold;
  @apply hover:(bg-primaryLight text-secondaryDark);
  @apply focus:outline-none;
  @apply focus-visible:border-divider;

  svg {
    @apply opacity-80;
    @apply mr-2;
  }

  &:hover {
    svg {
      @apply opacity-100;
    }
  }
}
</style>
