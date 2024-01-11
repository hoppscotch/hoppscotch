import { Service } from "dioc"
import { SpotlightSearcher } from "~/services/spotlight"

export type SpotlightPlatformDef = {
  additionalSearchers?: Array<
    typeof Service<unknown> & { ID: string } & {
      new (): Service & SpotlightSearcher
    }
  >
}
