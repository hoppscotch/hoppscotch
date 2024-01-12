import { useI18n as _useI18n } from "vue-i18n"

export function useI18n() {
  return _useI18n().t
}

export const useFullI18n = _useI18n
