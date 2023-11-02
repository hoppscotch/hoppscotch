import { Service } from "dioc"
import { Inspector } from "~/services/inspection"

/**
 * Defines an added interceptor by the platform
 */
export type PlatformInspectorsDef = {
  // We are keeping this as the only mode for now
  // So that if we choose to add other modes, we can do without breaking
  type: "service"
  service: typeof Service<unknown> & { ID: string } & {
    new (): Service & Inspector
  }
}

export type InspectorsPlatformDef = PlatformInspectorsDef[]
