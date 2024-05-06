import { Container, ServiceClassInstance } from "dioc"
import { SpotlightSearcher } from "~/services/spotlight"

export type SpotlightPlatformDef = {
  additionalSearchers?: Array<
    ServiceClassInstance<unknown> & {
      new (c: Container): SpotlightSearcher
    }
  >
}
