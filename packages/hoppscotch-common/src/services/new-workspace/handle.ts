import { Ref, WritableComputedRef } from "vue"

export type Handle<T, InvalidateReason = unknown> = {
  get: () => HandleRef<T, InvalidateReason>
}

export type HandleRef<T, InvalidateReason = unknown> = Ref<
  HandleState<T, InvalidateReason>
>

export type HandleState<T, InvalidateReason> =
  | { type: "ok"; data: T }
  | { type: "invalid"; reason: InvalidateReason }

export type WritableHandleRef<
  T,
  InvalidateReason = unknown,
> = WritableComputedRef<HandleState<T, InvalidateReason>>
