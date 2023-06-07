import { Plugin, inject } from "vue"
import { Container } from "./container"
import { Service } from "./service"

const VUE_CONTAINER_KEY = Symbol()

// TODO: Some Vue version issue with plugin generics is breaking type checking
/**
 * The Vue Dioc Plugin, this allows the composables to work and access the container
 *
 * NOTE: Make sure you add `vue` as dependency to be able to use this plugin (duh)
 */
export const diocPlugin: Plugin = {
  install(app, { container }) {
    app.provide(VUE_CONTAINER_KEY, container)
  }
}

/**
 * A composable that binds a service to a Vue Component
 *
 * @param service The class reference of the service to bind
 */
export function useService<
  T extends typeof Service<any> & { ID: string }
>(service: T): InstanceType<T> {
  const container = inject(VUE_CONTAINER_KEY) as Container | undefined | null

  if (!container) {
    throw new Error("Container not found, did you forget to install the dioc plugin?")
  }

  return container.bind(service)
}
