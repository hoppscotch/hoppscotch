import debounce from "../debounce"

function sleep(millis) {
  return new Promise((resolve) => setTimeout(resolve, millis))
}

describe("debounce", () => {
  test("doesn't call function right after calling", () => {
    const fn = jest.fn()

    const debFunc = debounce(fn, 100)
    debFunc()

    expect(fn).not.toHaveBeenCalled()
  })

  test("calls the function after the given timeout", async () => {
    const fn = jest.fn()

    const debFunc = debounce(fn, 100)
    debFunc()

    await sleep(1000)

    expect(fn).toHaveBeenCalled()
  })

  test("calls the function only one time within the timeframe", async () => {
    const fn = jest.fn()

    const debFunc = debounce(fn, 1000)

    for (let i = 0; i < 100; i++) debFunc()
    await sleep(2000)

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
