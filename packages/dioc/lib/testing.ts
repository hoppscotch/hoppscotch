import { Container, Service } from "./main";

/**
 * A container that can be used for writing tests, contains additional methods
 * for binding suitable for writing tests. (see `bindMock`).
 */
export class TestContainer extends Container {

  /**
   * Binds a mock service to the container.
   *
   * @param service
   * @param mock
   */
  public bindMock<
    T extends typeof Service<any> & { ID: string },
    U extends Partial<InstanceType<T>>
  >(service: T, mock: U): U {
    if (this.boundMap.has(service.ID)) {
      throw new Error(`Service '${service.ID}' already bound to container. Did you already call bindMock on this ?`)
    }

    this.boundMap.set(service.ID, mock as any)

    this.event$.next({
      type: "SERVICE_BIND",
      boundeeID: service.ID,
      bounderID: undefined,
    })

    return mock
  }
}
