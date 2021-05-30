import debounce from "../debounce"

describe("debounce", () => {
  test("doesn't call function right after calling", () => {
    const fn = jest.fn()

    const debFunc = debounce(fn, 100)
    debFunc()

    expect(fn).not.toHaveBeenCalled()
  })

  test("calls the function after the given timeout", () => {
    const fn = jest.fn()

    jest.useFakeTimers()

    const debFunc = debounce(fn, 100)
    debFunc()

    jest.runAllTimers()

    expect(fn).toHaveBeenCalled()
    expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100)
  })

  test("calls the function only one time within the timeframe", () => {
    const fn = jest.fn()

    const debFunc = debounce(fn, 1000)

    for (let i = 0; i < 100; i++) debFunc()

    jest.runAllTimers()

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
