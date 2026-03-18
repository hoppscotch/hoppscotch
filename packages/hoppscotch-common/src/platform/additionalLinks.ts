import { Container, ServiceClassInstance } from "dioc"
import { AdditionalLinksService } from "~/services/additionalLinks.service"

export type AdditionalLinksPlatformDef = Array<
  ServiceClassInstance<unknown> & {
    new (c: Container): AdditionalLinksService
  }
>
