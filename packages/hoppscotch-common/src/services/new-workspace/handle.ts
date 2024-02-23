import { Ref } from "vue"

export type HandleRef<T, InvalidateReason = unknown> = Ref<
  { type: "ok"; data: T } | { type: "invalid"; reason: InvalidateReason }
>
