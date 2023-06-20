import { vi, describe, expect, test } from "vitest"
import { BehaviorSubject, Subject } from "rxjs"
import { isEqual } from "lodash-es"
import DispatchingStore from "~/newstore/DispatchingStore"

describe("DispatchingStore", () => {
  test("'subject$' property properly returns an BehaviorSubject", () => {
    const store = new DispatchingStore({}, {})

    expect(store.subject$ instanceof BehaviorSubject).toEqual(true)
  })

  test("'value' property properly returns the current state value", () => {
    const store = new DispatchingStore({}, {})

    expect(store.value).toEqual({})
  })

  test("'dispatches$' property properly returns a Subject", () => {
    const store = new DispatchingStore({}, {})

    expect(store.dispatches$ instanceof Subject).toEqual(true)
  })

  test("dispatch with invalid dispatcher are thrown", () => {
    const store = new DispatchingStore({}, {})

    expect(() => {
      store.dispatch({
        dispatcher: "non-existent",
        payload: {},
      })
    }).toThrow()
  })

  test("valid dispatcher calls run without throwing", () => {
    const store = new DispatchingStore(
      {},
      {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        testDispatcher(_currentValue, _payload) {
          // Nothing here
        },
      }
    )

    expect(() => {
      store.dispatch({
        dispatcher: "testDispatcher",
        payload: {},
      })
    }).not.toThrow()
  })

  test("only correct dispatcher method is ran", () => {
    const dispatchFn = vi.fn().mockReturnValue({})
    const dontCallDispatchFn = vi.fn().mockReturnValue({})

    const store = new DispatchingStore(
      {},
      {
        testDispatcher: dispatchFn,
        dontCallDispatcher: dontCallDispatchFn,
      }
    )

    store.dispatch({
      dispatcher: "testDispatcher",
      payload: {},
    })

    expect(dispatchFn).toHaveBeenCalledTimes(1)
    expect(dontCallDispatchFn).not.toHaveBeenCalled()
  })

  test("passes current value and the payload to the dispatcher", () => {
    const testInitValue = { name: "bob" }
    const testPayload = { name: "alice" }

    const testDispatchFn = vi.fn().mockReturnValue({})

    const store = new DispatchingStore(testInitValue, {
      testDispatcher: testDispatchFn,
    })

    store.dispatch({
      dispatcher: "testDispatcher",
      payload: testPayload,
    })

    expect(testDispatchFn).toHaveBeenCalledWith(testInitValue, testPayload)
  })

  test("dispatcher returns are used to update the store correctly", () => {
    const testInitValue = { name: "bob" }
    const testDispatchReturnVal = { name: "alice" }

    const testDispatchFn = vi.fn().mockReturnValue(testDispatchReturnVal)

    const store = new DispatchingStore(testInitValue, {
      testDispatcher: testDispatchFn,
    })

    store.dispatch({
      dispatcher: "testDispatcher",
      payload: {}, // Payload doesn't matter because the function is mocked
    })

    expect(store.value).toEqual(testDispatchReturnVal)
  })

  test("dispatching patches in new values if not existing on the store", () => {
    const testInitValue = { name: "bob" }
    const testDispatchReturnVal = { age: 25 }

    const testDispatchFn = vi.fn().mockReturnValue(testDispatchReturnVal)

    const store = new DispatchingStore(testInitValue, {
      testDispatcher: testDispatchFn,
    })

    store.dispatch({
      dispatcher: "testDispatcher",
      payload: {},
    })

    expect(store.value).toEqual({
      name: "bob",
      age: 25,
    })
  })

  test("emits the current store value to the new subscribers", () =>
    new Promise((resolve) => {
      const testInitValue = { name: "bob" }

      const testDispatchFn = vi.fn().mockReturnValue({})

      const store = new DispatchingStore(testInitValue, {
        testDispatcher: testDispatchFn,
      })

      store.subject$.subscribe((value) => {
        if (value === testInitValue) {
          resolve()
        }
      })
    }))

  test("emits the dispatched store value to the subscribers", () =>
    new Promise((resolve) => {
      const testInitValue = { name: "bob" }
      const testDispatchReturnVal = { age: 25 }

      const testDispatchFn = vi.fn().mockReturnValue(testDispatchReturnVal)

      const store = new DispatchingStore(testInitValue, {
        testDispatcher: testDispatchFn,
      })

      store.subject$.subscribe((value) => {
        if (isEqual(value, { name: "bob", age: 25 })) {
          resolve()
        }
      })

      store.dispatch({
        dispatcher: "testDispatcher",
        payload: {},
      })
    }))

  test("dispatching emits the new dispatch requests to the subscribers", () => {
    const testInitValue = { name: "bob" }
    const testPayload = { age: 25 }

    const testDispatchFn = vi.fn().mockReturnValue({})

    const store = new DispatchingStore(testInitValue, {
      testDispatcher: testDispatchFn,
    })

    store.dispatches$.subscribe((value) => {
      if (
        isEqual(value, { dispatcher: "testDispatcher", payload: testPayload })
      ) {
        done()
      }
    })

    store.dispatch({
      dispatcher: "testDispatcher",
      payload: {},
    })
  })
})
