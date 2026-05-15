import { computed, ref } from 'vue';

// Shared auth-type tab switching logic for SMTP configuration UIs.
// When switching between login/oauth2 tabs, if the current tab has data
// we confirm before clearing — so stale credentials don't get persisted
// alongside the active set.
//
// `fields` is a lazy accessor to the reactive record (the two call sites
// nest it differently: `currentConfigs.mailerConfigs` vs `smtpConfigs.fields`).
// Calling it inside computed getters/setters preserves reactivity.
export function useSmtpAuthTypeSwitch<K extends string>(
  fields: () => Record<K, string>,
  authKey: K,
  loginKeys: readonly K[],
  oauth2Keys: readonly K[],
) {
  const showAuthSwitchModal = ref(false);
  const pendingAuthType = ref<string | null>(null);

  const hasAnyValue = (keys: readonly K[]) =>
    keys.some((k) => (fields()[k] ?? '').trim() !== '');

  const authType = computed({
    get: () => fields()[authKey],
    set: (next: string) => {
      const current = fields()[authKey];
      if (next === current) return;

      const keysToClear = current === 'oauth2' ? oauth2Keys : loginKeys;
      if (hasAnyValue(keysToClear)) {
        pendingAuthType.value = next;
        showAuthSwitchModal.value = true;
        return;
      }

      fields()[authKey] = next;
    },
  });

  const confirmAuthSwitch = () => {
    if (pendingAuthType.value === null) return;
    const current = fields()[authKey];
    const keysToClear = current === 'oauth2' ? oauth2Keys : loginKeys;
    keysToClear.forEach((k) => {
      fields()[k] = '';
    });
    fields()[authKey] = pendingAuthType.value;
    pendingAuthType.value = null;
    showAuthSwitchModal.value = false;
  };

  const cancelAuthSwitch = () => {
    pendingAuthType.value = null;
    showAuthSwitchModal.value = false;
  };

  return {
    authType,
    showAuthSwitchModal,
    confirmAuthSwitch,
    cancelAuthSwitch,
  };
}
