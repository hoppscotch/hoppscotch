import { HoppModule } from "."
import { Container, Service } from "dioc"
import { diocPlugin } from "dioc/vue"

const serviceContainer = new Container()

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
export function getService<T extends typeof Service<any> & { ID: string }>(
  service: T
): InstanceType<T> {
  return serviceContainer.bind(service)
}

export default <HoppModule>{
  onVueAppInit(app) {
    // TODO: look into this
    // @ts-expect-error Something weird with Vue versions
    app.use(diocPlugin, {
      container: serviceContainer,
    })
  },
}
