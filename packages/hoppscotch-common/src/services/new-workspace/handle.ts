import { Ref, WritableComputedRef } from "vue"

export type HandleRef<T, InvalidateReason = unknown> = Ref<
  { type: "ok"; data: T } | { type: "invalid"; reason: InvalidateReason }
>

export type WritableHandleRef<
  T,
  InvalidateReason = unknown,
> = WritableComputedRef<
  { type: "ok"; data: T } | { type: "invalid"; reason: InvalidateReason }
>
