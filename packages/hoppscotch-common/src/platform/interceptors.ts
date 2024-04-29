import { Container, ServiceClassInstance } from "dioc"
import { Interceptor } from "~/services/interceptor.service"

export type PlatformInterceptorDef =
  | { type: "standalone"; interceptor: Interceptor }
  | {
      type: "service"
      // TODO: I don't think this type is effective, we have to come up with a better impl
      service: ServiceClassInstance<unknown> & {
        new (c: Container): Interceptor
      }
    }

export type InterceptorsPlatformDef = {
  default: string
  interceptors: PlatformInterceptorDef[]
}
