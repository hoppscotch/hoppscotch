import { Service } from "./service"
import { Observable, Subject } from 'rxjs'

/**
 * Stores the current container instance in the current operating context.
 *
 * NOTE: This should not be used outside of dioc library code
 */
export let currentContainer: Container | null = null

/**
 * The events emitted by the container
 *
 * `SERVICE_BIND` - emitted when a service is bound to the container directly or as a dependency to another service
 * `SERVICE_INIT` - emitted when a service is initialized
 */
export type ContainerEvent =
  | {
    type: 'SERVICE_BIND';

    /** The Service ID of the service being bounded (the dependency) */
    boundeeID: string;

    /**
     * The Service ID of the bounder that is binding the boundee (the dependent)
     *
     * NOTE: This will be undefined if the service is bound directly to the container
     */
    bounderID: string | undefined
  }
  | {
    type: 'SERVICE_INIT';

    /** The Service ID of the service being initialized */
    serviceID: string
  }

/**
 * The dependency injection container, allows for services to be initialized and maintains the dependency trees.
 */
export class Container {
  /** Used during the `bind` operation to detect circular dependencies */
  private bindStack: string[] = []

  /** The map of bound services to their IDs */
  protected boundMap = new Map<string, Service<unknown>>()

  /** The RxJS observable representing the event stream */
  protected event$ = new Subject<ContainerEvent>()

  /**
   * Returns whether a container has the given service bound
   * @param service The service to check for
   */
  public hasBound<
    T extends typeof Service<any> & { ID: string }
  >(service: T): boolean {
    return this.boundMap.has(service.ID)
  }

  /**
   * Returns the service bound to the container with the given ID or if not found, undefined.
   *
   * NOTE: This is an advanced method and should not be used as much as possible.
   *
   * @param serviceID The ID of the service to get
   */
  public getBoundServiceWithID(serviceID: string): Service<unknown> | undefined {
    return this.boundMap.get(serviceID)
  }

  /**
   * Binds a service to the container. This is equivalent to marking a service as a dependency.
   * @param service The class reference of a service to bind
   * @param bounder The class reference of the service that is binding the service (if bound directly to the container, this should be undefined)
   */
  public bind<T extends typeof Service<any> & { ID: string }>(
    service: T,
    bounder: ((typeof Service<T>) & { ID: string }) | undefined = undefined
  ): InstanceType<T> {
    // We need to store the current container in a variable so that we can restore it after the bind operation
    const oldCurrentContainer = currentContainer;
    currentContainer = this;

    // If the service is already bound, return the existing instance
    if (this.hasBound(service)) {
      this.event$.next({
        type: 'SERVICE_BIND',
        boundeeID: service.ID,
        bounderID: bounder?.ID // Return the bounder ID if it is defined, else assume its the container
      })

      return this.boundMap.get(service.ID) as InstanceType<T> // Casted as InstanceType<T> because service IDs and types are expected to match
    }

    // Detect circular dependency and throw error
    if (this.bindStack.findIndex((serviceID) => serviceID === service.ID) !== -1) {
      const circularServices = `${this.bindStack.join(' -> ')} -> ${service.ID}`

      throw new Error(`Circular dependency detected.\nChain: ${circularServices}`)
    }

    // Push the service ID onto the bind stack to detect circular dependencies
    this.bindStack.push(service.ID)

    // Initialize the service and emit events

    // NOTE: We need to cast the service to any as TypeScript thinks that the service is abstract
    const instance: Service<any> = new (service as any)()

    this.boundMap.set(service.ID, instance)

    this.bindStack.pop()

    this.event$.next({
      type: 'SERVICE_INIT',
      serviceID: service.ID,
    })

    this.event$.next({
      type: 'SERVICE_BIND',
      boundeeID: service.ID,
      bounderID: bounder?.ID
    })


    // Restore the current container
    currentContainer = oldCurrentContainer;

    // We expect the return type to match the service definition
    return instance as InstanceType<T>
  }

  /**
   * Returns an iterator of the currently bound service IDs and their instances
   */
  public getBoundServices(): IterableIterator<[string, Service<any>]> {
    return this.boundMap.entries()
  }

  /**
   * Returns the public container event stream
   */
  public getEventStream(): Observable<ContainerEvent> {
    return this.event$.asObservable()
  }
}
