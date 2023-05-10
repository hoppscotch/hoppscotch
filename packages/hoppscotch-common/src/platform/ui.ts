import { Ref } from "vue"

export type UIPlatformDef = {
  appHeader?: {
    paddingTop?: Ref<string>
    paddingLeft?: Ref<string>
  }
  onCodemirrorInstanceMount?: (element: HTMLElement) => void
}
