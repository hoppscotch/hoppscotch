<template>
  <div class="flex" @click="openLogoutModal()">
    <HoppSmartItem
      :icon="IconLogOut"
      :label="t('state.logout')"
      :outline="outline"
      :shortcut="shortcut"
      @click="openLogoutModal()"
    />
    <HoppSmartConfirmModal
      :show="confirmLogout"
      :title="t('state.confirm_logout')"
      @hide-modal="confirmLogout = false"
      @resolve="logout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import IconLogOut from '~icons/lucide/log-out';
import { useToast } from '~/composables/toast';
import { useRouter } from 'vue-router';
import { auth } from '~/helpers/auth';
import { useI18n } from '~/composables/i18n';

const t = useI18n();

const router = useRouter();

defineProps({
  outline: {
    type: Boolean,
    default: false,
  },
  shortcut: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits<{
  (e: 'confirm-logout'): void;
}>();

const confirmLogout = ref(false);

const toast = useToast();

const logout = async () => {
  try {
    await auth.signOutUser();
    router.push(`/`);
    toast.success(`${t('state.logged_out')}`);
  } catch (e) {
    console.error(e);
    toast.error(`${t('state.error')}`);
  }
};

const openLogoutModal = () => {
  emit('confirm-logout');
  confirmLogout.value = true;
};
</script>
