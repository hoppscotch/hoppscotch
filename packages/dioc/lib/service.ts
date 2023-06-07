import { Observable, Subject } from 'rxjs'
import { Container, currentContainer } from './container'

/**
 * A Dioc service that can bound to a container and can bind dependency services.
 *
 * NOTE: Services cannot have a constructor that takes arguments.
 *
 * @template EventDef The type of events that can be emitted by the service. These will be accessible by event streams
 */
export abstract class Service<EventDef = {}> {

  /**
   * The internal event stream of the service
   */
  private event$ = new Subject<EventDef>()

  /** The container the service is bound to */
  #container: Container

  constructor() {
    if (!currentContainer) {
      throw new Error(
        `Tried to initialize service with no container (ID: ${ (this.constructor as any).ID })`
      )
    }

    this.#container = currentContainer
  }

  /**
   * Binds a dependency service into this service.
   * @param service The class reference of the service to bind
   */
  protected bind<T extends typeof Service<any> & { ID: string }>(service: T): InstanceType<T> {
    if (!currentContainer) {
      throw new Error('No currentContainer defined.')
    }

    return currentContainer.bind(service, this.constructor as typeof Service<any> & { ID: string })
  }

  /**
   * Returns the container the service is bound to
   */
  protected getContainer(): Container {
    return this.#container
  }

  /**
   * Emits an event on the service's event stream
   * @param event The event to emit
   */
  protected emit(event: EventDef) {
    this.event$.next(event)
  }

  /**
   * Returns the event stream of the service
   */
  public getEventStream(): Observable<EventDef> {

    return this.event$.asObservable()
  }
}
