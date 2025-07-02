import { HoppModule } from "."
import { Container, ServiceClassInstance } from "dioc"
import { diocPlugin } from "dioc/vue"
import { DebugService } from "~/services/debug.service"
import { platform } from "~/platform"

const serviceContainer = new Container()

if (import.meta.env.DEV) {
  serviceContainer.bind(DebugService)
}

/**
 * Gets a service from the app service container. You can use this function
 * to get a service if you have no access to the container or if you are not
 * in a component (if you are, you can use `useService`) or if you are not in a
 * service.
 * @param service The class of the service to get
 * @returns The service instance
 *
 * @deprecated This is a temporary escape hatch for legacy code to access
 * services. Please use `useService` if within components or try to convert your
 * legacy subsystem into a service if possible.
 */
export function getService<T extends ServiceClassInstance<any>>(
  service: T
): InstanceType<T> {
  return serviceContainer.bind(service)
}

export default <HoppModule>{
  onVueAppInit(app) {
    app.use(diocPlugin, {
      container: serviceContainer,
    })

    for (const service of platform.addedServices ?? []) {
      serviceContainer.bind(service)
    }
  },
}
