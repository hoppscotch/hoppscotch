import { Service } from "dioc"
import { Interceptor } from "~/services/interceptor.service"

export type PlatformInterceptorDef =
  | { type: "standalone"; interceptor: Interceptor }
  | {
      type: "service"
      service: typeof Service<unknown> & { ID: string } & {
        new (): Service & Interceptor
      }
    }

export type InterceptorsPlatformDef = {
  default: string
  interceptors: PlatformInterceptorDef[]
}
