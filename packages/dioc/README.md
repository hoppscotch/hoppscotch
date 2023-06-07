# dioc

A small and lightweight dependency injection / inversion of control system.

### About

`dioc` is a really simple **DI/IOC** system where you write services (which are singletons per container) that can depend on each other and emit events that can be listened upon.

### Demo

```ts
import { Service, Container } from "dioc"

// Here is a simple service, which you can define by extending the Service class
// and providing an ID static field (of type string)
export class PersistenceService extends Service {
  // This should be unique for each container
  public static ID = "PERSISTENCE_SERVICE"

  public read(key: string): string | undefined {
    // ...
  }

  public write(key: string, value: string) {
    // ...
  }
}

type TodoServiceEvent =
  | { type: "TODO_CREATED"; index: number }
  | { type: "TODO_DELETED"; index: number }

// Services have a built in event system
// Define the generic argument to say what are the possible emitted values
export class TodoService extends Service<TodoServiceEvent> {
  public static ID = "TODO_SERVICE"

  // Inject persistence service into this service
  private readonly persistence = this.bind(PersistenceService)

  public todos = []

  // Service constructors cannot have arguments
  constructor() {
    super()

    this.todos = JSON.parse(this.persistence.read("todos") ?? "[]")
  }

  public addTodo(text: string) {
    // ...

    // You can access services via the bound fields
    this.persistence.write("todos", JSON.stringify(this.todos))

    // This is how you emit an event
    this.emit({
      type: "TODO_CREATED",
      index,
    })
  }

  public removeTodo(index: number) {
    // ...

    this.emit({
      type: "TODO_DELETED",
      index,
    })
  }
}

// Services need a container to run in
const container = new Container()

// You can initialize and get services using Container#bind
// It will automatically initialize the service (and its dependencies)
const todoService = container.bind(TodoService) // Returns an instance of TodoService
```

### Demo (Unit Test)

`dioc/testing` contains `TestContainer` which lets you bind mocked services to the container.

```ts
import { TestContainer } from "dioc/testing"
import { TodoService, PersistenceService } from "./demo.ts" // The above demo code snippet
import { describe, it, expect, vi } from "vitest"

describe("TodoService", () => {
  it("addTodo writes to persistence", () => {
    const container = new TestContainer()

    const writeFn = vi.fn()

    // The first parameter is the service to mock and the second parameter
    // is the mocked service fields and functions
    container.bindMock(PersistenceService, {
      read: () => undefined, // Not really important for this test
      write: writeFn,
    })

    // the peristence service bind in TodoService will now use the
    // above defined mocked implementation
    const todoService = container.bind(TodoService)

    todoService.addTodo("sup")

    expect(writeFn).toHaveBeenCalledOnce()
    expect(writeFn).toHaveBeenCalledWith("todos", JSON.stringify(["sup"]))
  })
})
```

### Demo (Vue)

`dioc/vue` contains a Vue Plugin and a `useService` composable that allows Vue components to use the defined services.

In the app entry point:

```ts
import { createApp } from "vue"
import { diocPlugin } from "dioc/vue"

const app = createApp()

app.use(diocPlugin, {
  container: new Container(), // You can pass in the container you want to provide to the components here
})
```

In your Vue components:

```vue
<script setup>
import { TodoService } from "./demo.ts" // The above demo
import { useService } from "dioc/vue"

const todoService = useService(TodoService) // Returns an instance of the TodoService class
</script>
```
