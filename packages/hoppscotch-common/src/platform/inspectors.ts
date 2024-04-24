import { Container, ServiceClassInstance } from "dioc"
import { Inspector } from "~/services/inspection"

/**
 * Defines an added interceptor by the platform
 */
export type PlatformInspectorsDef = {
  // We are keeping this as the only mode for now
  // So that if we choose to add other modes, we can do without breaking
  type: "service"
  // TODO: I don't think this type is effective, we have to come up with a better impl
  service: ServiceClassInstance<unknown> & {
    new (c: Container): Inspector
  }
}

export type InspectorsPlatformDef = PlatformInspectorsDef[]
